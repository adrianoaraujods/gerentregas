import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "@/server/db";
import { user } from "@/server/db/schemas/auth";
import { parameter } from "@/server/db/schemas/parameters";
import { point } from "@/server/db/schemas/points";
import { route, stop } from "@/server/db/schemas/routes";

export class DashboardRepository {
  constructor(private readonly db: Database) {}

  private getStandardWorkdayMinutes(): number {
    return 8 * 60;
  }

  async getStandardWorkdayDuration(): Promise<number> {
    const [row] = await this.db
      .select({ standardWorkdayDuration: parameter.standardWorkdayDuration })
      .from(parameter)
      .where(eq(parameter.id, "system"))
      .limit(1);
    return row?.standardWorkdayDuration ?? this.getStandardWorkdayMinutes();
  }

  async getDayTimeline(date: Date): Promise<{
    stops: Array<{
      stopId: string;
      order: string;
      pointId: string;
      pointName: string;
      address: string;
      arrivalTime: Date | null;
      departureTime: Date | null;
      dwellMinutes: number;
      startHour: number;
      dwellHours: number;
    }>;
    totalDwellMinutes: number;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const routesForDay = await this.db
      .select({ id: route.id, driverId: route.driverId })
      .from(route)
      .where(
        and(
          sql`${route.date} >= ${startOfDay.toISOString()}`,
          sql`${route.date} <= ${endOfDay.toISOString()}`,
          isNull(route.deletedAt),
        ),
      );

    if (routesForDay.length === 0) {
      return { stops: [], totalDwellMinutes: 0 };
    }

    const routeIds = routesForDay.map((r) => r.id);

    const stopsData = await this.db
      .select({
        stopId: stop.id,
        routeId: stop.routeId,
        order: stop.order,
        pointId: stop.pointId,
        pointName: point.name,
        address: point.address,
        concludedAt: stop.concludedAt,
        arrivalAt: stop.arrivalAt,
        departureAt: stop.departureAt,
      })
      .from(stop)
      .leftJoin(point, eq(stop.pointId, point.id))
      .where(and(inArray(stop.routeId, routeIds), isNull(stop.deletedAt)))
      .orderBy(stop.routeId, stop.order);

    const stopsByRoute = new Map<string, typeof stopsData>();
    for (const s of stopsData) {
      if (!stopsByRoute.has(s.routeId)) {
        stopsByRoute.set(s.routeId, []);
      }
      stopsByRoute.get(s.routeId)?.push(s);
    }

    const result: Array<{
      stopId: string;
      order: string;
      pointId: string;
      pointName: string;
      address: string;
      arrivalTime: Date | null;
      departureTime: Date | null;
      dwellMinutes: number;
      startHour: number;
      dwellHours: number;
    }> = [];

    let totalDwellMinutes = 0;

    for (const [, routeStops] of stopsByRoute) {
      for (let i = 0; i < routeStops.length; i++) {
        const currentStop = routeStops[i];
        const isOrigin = currentStop.order === "1";

        let arrivalTime: Date | null = null;
        let dwellMinutes = 0;

        if (!isOrigin && i > 0) {
          if (currentStop.arrivalAt && currentStop.departureAt) {
            arrivalTime = currentStop.arrivalAt;
            const diffMs =
              currentStop.departureAt.getTime() -
              currentStop.arrivalAt.getTime();
            dwellMinutes = Math.round(diffMs / 60000);
            totalDwellMinutes += dwellMinutes;
          }
        }

        const departureTime = currentStop.departureAt;
        const startHour = arrivalTime
          ? arrivalTime.getHours() + arrivalTime.getMinutes() / 60
          : departureTime
            ? departureTime.getHours() + departureTime.getMinutes() / 60
            : 0;
        const dwellHours = dwellMinutes / 60;

        result.push({
          stopId: currentStop.stopId,
          order: currentStop.order,
          pointId: currentStop.pointId,
          pointName: currentStop.pointName ?? "Ponto desconhecido",
          address: currentStop.address ?? "Endereço não informado",
          arrivalTime,
          departureTime,
          dwellMinutes,
          startHour,
          dwellHours,
        });
      }
    }

    return { stops: result, totalDwellMinutes };
  }

  private async getDailyAggregation(
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      date: Date;
      totalDwellMinutes: number;
      stopsCount: number;
    }>
  > {
    const dailyData = await this.db.execute(sql`
      WITH stop_dwell AS (
        SELECT
          DATE(${route.date} AT TIME ZONE 'UTC') as date,
          ${stop.id} as stop_id,
          ${stop.routeId} as route_id,
          ${stop.order} as stop_order,
          ${stop.arrivalAt} as arrival_at,
          ${stop.departureAt} as departure_at
        FROM ${route}
        LEFT JOIN ${stop} ON (${stop.routeId} = ${route.id} AND ${stop.deletedAt} IS NULL)
        WHERE ${route.date} >= ${startDate.toISOString()}
          AND ${route.date} <= ${endDate.toISOString()}
          AND ${route.deletedAt} IS NULL
          AND ${stop.order} != '1'
          AND ${stop.departureAt} IS NOT NULL
          AND ${stop.arrivalAt} IS NOT NULL
      ),
      daily_dwell AS (
        SELECT
          date,
          SUM(EXTRACT(EPOCH FROM (departure_at - arrival_at)) / 60) as total_dwell_minutes,
          COUNT(*) as stops_count
        FROM stop_dwell
        GROUP BY date
      )
      SELECT date, COALESCE(total_dwell_minutes, 0) as total_dwell_minutes, COALESCE(stops_count, 0) as stops_count
      FROM daily_dwell
      ORDER BY date
    `);

    return dailyData.rows.map((row: Record<string, unknown>) => ({
      date: new Date(row.date as string),
      totalDwellMinutes: Number(row.total_dwell_minutes) || 0,
      stopsCount: Number(row.stops_count) || 0,
    }));
  }

  async getMonthAggregation(
    year: number,
    month: number,
  ): Promise<{
    days: Array<{
      date: Date;
      totalDwellMinutes: number;
      stopsCount: number;
    }>;
    totalDwellMinutes: number;
  }> {
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const days = await this.getDailyAggregation(startOfMonth, endOfMonth);

    const totalDwellMinutes = days.reduce(
      (sum, d) => sum + d.totalDwellMinutes,
      0,
    );

    return { days, totalDwellMinutes };
  }

  async getCustomAggregation(
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    days: Array<{
      date: Date;
      totalDwellMinutes: number;
      stopsCount: number;
    }>;
    totalDwellMinutes: number;
  }> {
    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);

    const days = await this.getDailyAggregation(startDate, endDate);

    const totalDwellMinutes = days.reduce(
      (sum, d) => sum + d.totalDwellMinutes,
      0,
    );

    return { days, totalDwellMinutes };
  }

  async getDrilldown(input: {
    periodType: "day" | "month" | "custom";
    date?: Date;
    year?: number;
    month?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    stops: Array<{
      routeId: string;
      driverId: string;
      driverName: string;
      stopId: string;
      order: string;
      pointId: string;
      pointName: string;
      address: string;
      arrivalTime: Date | null;
      departureTime: Date | null;
      dwellMinutes: number;
    }>;
    totalDwellMinutes: number;
  }> {
    let startDate: Date;
    let endDate: Date;

    if (input.periodType === "day" && input.date) {
      startDate = new Date(input.date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(input.date);
      endDate.setHours(23, 59, 59, 999);
    } else if (input.periodType === "month" && input.year && input.month) {
      startDate = new Date(Date.UTC(input.year, input.month - 1, 1));
      endDate = new Date(Date.UTC(input.year, input.month, 0, 23, 59, 59, 999));
    } else if (
      input.periodType === "custom" &&
      input.dateFrom &&
      input.dateTo
    ) {
      startDate = new Date(input.dateFrom);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(input.dateTo);
      endDate.setHours(23, 59, 59, 999);
    } else {
      return { stops: [], totalDwellMinutes: 0 };
    }

    const routesInPeriod = await this.db
      .select({
        routeId: route.id,
        driverId: route.driverId,
        driverName: user.name,
        date: route.date,
      })
      .from(route)
      .leftJoin(user, eq(route.driverId, user.id))
      .where(
        and(
          sql`${route.date} >= ${startDate.toISOString()}`,
          sql`${route.date} <= ${endDate.toISOString()}`,
          isNull(route.deletedAt),
        ),
      );

    if (routesInPeriod.length === 0) {
      return { stops: [], totalDwellMinutes: 0 };
    }

    const routeIds = routesInPeriod.map((r) => r.routeId);
    const routeMap = new Map(routesInPeriod.map((r) => [r.routeId, r]));

    const stopsData = await this.db
      .select({
        stopId: stop.id,
        routeId: stop.routeId,
        order: stop.order,
        pointId: stop.pointId,
        pointName: point.name,
        address: point.address,
        concludedAt: stop.concludedAt,
        arrivalAt: stop.arrivalAt,
        departureAt: stop.departureAt,
      })
      .from(stop)
      .leftJoin(point, eq(stop.pointId, point.id))
      .where(
        and(
          inArray(stop.routeId, routeIds),
          isNull(stop.deletedAt),
          sql`${stop.order} != '1'`,
          sql`${stop.departureAt} IS NOT NULL`
        ),
      )
      .orderBy(stop.routeId, stop.order);

    const stopsByRoute = new Map<string, typeof stopsData>();
    for (const s of stopsData) {
      if (!stopsByRoute.has(s.routeId)) {
        stopsByRoute.set(s.routeId, []);
      }
      stopsByRoute.get(s.routeId)?.push(s);
    }

    const result: Array<{
      routeId: string;
      driverId: string;
      driverName: string;
      stopId: string;
      order: string;
      pointId: string;
      pointName: string;
      address: string;
      arrivalTime: Date | null;
      departureTime: Date | null;
      dwellMinutes: number;
    }> = [];

    let totalDwellMinutes = 0;

    for (const [routeId, routeStops] of stopsByRoute) {
      const routeInfo = routeMap.get(routeId);
      if (!routeInfo) continue;

      for (let i = 0; i < routeStops.length; i++) {
        const currentStop = routeStops[i];
        let arrivalTime: Date | null = null;
        let dwellMinutes = 0;

        if (i > 0) {
          if (currentStop.arrivalAt && currentStop.departureAt) {
            arrivalTime = currentStop.arrivalAt;
            const diffMs =
              currentStop.departureAt.getTime() -
              currentStop.arrivalAt.getTime();
            dwellMinutes = Math.round(diffMs / 60000);
            totalDwellMinutes += dwellMinutes;
          }
        }

        result.push({
          routeId,
          driverId: routeInfo.driverId,
          driverName: routeInfo.driverName ?? "Motorista desconhecido",
          stopId: currentStop.stopId,
          order: currentStop.order,
          pointId: currentStop.pointId,
          pointName: currentStop.pointName ?? "Ponto desconhecido",
          address: currentStop.address ?? "Endereço não informado",
          arrivalTime,
          departureTime: currentStop.departureAt,
          dwellMinutes,
        });
      }
    }

    return { stops: result, totalDwellMinutes };
  }

  async exportCSV(input: {
    periodType: "day" | "month" | "custom";
    date?: Date;
    year?: number;
    month?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<string> {
    const { stops } = await this.getDrilldown(input);

    const workdayMinutes = await this.getStandardWorkdayDuration();

    const headers = [
      "Data",
      "Motorista",
      "Ordem da Parada",
      "Ponto",
      "Endereço",
      "Chegada",
      "Saída",
      "Tempo Parado (min)",
      "% Jornada Padrão",
    ];

    const rows = stops.map((s) => {
      const dateStr = s.arrivalTime
        ? s.arrivalTime.toISOString().split("T")[0]
        : s.departureTime
          ? s.departureTime.toISOString().split("T")[0]
          : "";
      const arrivalStr = s.arrivalTime
        ? s.arrivalTime.toISOString().replace("T", " ").substring(0, 19)
        : "";
      const departureStr = s.departureTime
        ? s.departureTime.toISOString().replace("T", " ").substring(0, 19)
        : "";
      const workdayPct =
        workdayMinutes > 0
          ? ((s.dwellMinutes / workdayMinutes) * 100).toFixed(2)
          : "0.00";

      return [
        dateStr,
        `"${s.driverName.replace(/"/g, '""')}"`,
        s.order,
        `"${s.pointName.replace(/"/g, '""')}"`,
        `"${s.address.replace(/"/g, '""')}"`,
        arrivalStr,
        departureStr,
        s.dwellMinutes.toString(),
        workdayPct,
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }
}

function inArray<T>(column: unknown, values: T[]) {
  if (values.length === 0) return sql`FALSE`;
  return sql`${column} IN (${sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  )})`;
}
