import {
  averageDwellPerRoute,
  workdayPercentage as computeWorkdayPercentage,
} from "@/lib/route-metrics";
import { NotFoundError } from "@/server/api";
import type { DashboardRepository } from "./dashboard.repository";
import type {
  AggregationOutput,
  CsvExportOutput,
  DailyAggregation,
  DrilldownOutput,
  DrilldownStop,
  GetAggregationInput,
  StandardWorkdayDuration,
} from "./dashboard.types";

function toDate(value: string | Date | undefined): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getAggregation(input: GetAggregationInput): Promise<AggregationOutput> {
    if (input.periodType === "day") {
      const date = toDate(input.date);
      if (!date) {
        throw new NotFoundError(
          "Data é obrigatória para visualização por dia.",
        );
      }
      return {
        periodType: "day",
        date: date.toISOString(),
        ...(await this.getDrilldown(input)),
      };
    }

    const workdayMinutes = await this.repository.getStandardWorkdayDuration();

    if (input.periodType === "month") {
      if (!input.year || !input.month) {
        throw new NotFoundError(
          "Ano e mês são obrigatórios para visualização por mês.",
        );
      }
      const { days, totalDwellMinutes, driverCount, routeCount } =
        await this.repository.getMonthAggregation(input.year, input.month);

      const enrichedDays: DailyAggregation[] = days.map((d) => ({
        date: d.date.toISOString(),
        totalDwellMinutes: d.totalDwellMinutes,
        stopsCount: d.stopsCount,
        workdayPercentage: computeWorkdayPercentage(
          averageDwellPerRoute(d.totalDwellMinutes, d.routeCount),
          workdayMinutes,
        ),
      }));

      const averageDwellMinutes = averageDwellPerRoute(
        totalDwellMinutes,
        routeCount,
      );

      const workdayPercentage = computeWorkdayPercentage(
        averageDwellMinutes,
        workdayMinutes,
      );

      return {
        periodType: "month",
        year: input.year,
        month: input.month,
        days: enrichedDays,
        driverCount,
        totalDwellMinutes,
        averageDwellMinutes,
        workdayPercentage,
      };
    }

    if (input.periodType === "custom") {
      const dateFrom = toDate(input.dateFrom);
      const dateTo = toDate(input.dateTo);
      if (!dateFrom || !dateTo) {
        throw new NotFoundError(
          "Data inicial e final são obrigatórias para período personalizado.",
        );
      }
      const { days, totalDwellMinutes, driverCount, routeCount } =
        await this.repository.getCustomAggregation(dateFrom, dateTo);

      const enrichedDays: DailyAggregation[] = days.map((d) => ({
        date: d.date.toISOString(),
        totalDwellMinutes: d.totalDwellMinutes,
        stopsCount: d.stopsCount,
        workdayPercentage: computeWorkdayPercentage(
          averageDwellPerRoute(d.totalDwellMinutes, d.routeCount),
          workdayMinutes,
        ),
      }));

      const averageDwellMinutes = averageDwellPerRoute(
        totalDwellMinutes,
        routeCount,
      );

      const workdayPercentage = computeWorkdayPercentage(
        averageDwellMinutes,
        workdayMinutes,
      );

      return {
        periodType: "custom",
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        days: enrichedDays,
        driverCount,
        totalDwellMinutes,
        averageDwellMinutes,
        workdayPercentage,
      };
    }

    throw new NotFoundError("Tipo de período inválido.");
  }

  async getDrilldown(input: GetAggregationInput): Promise<DrilldownOutput> {
    const workdayMinutes = await this.repository.getStandardWorkdayDuration();

    const drilldownInput = {
      ...input,
      date: toDate(input.date),
      dateFrom: toDate(input.dateFrom),
      dateTo: toDate(input.dateTo),
    };

    const { stops, drivers, totalDwellMinutes, driverCount, routeCount } =
      await this.repository.getDrilldown(drilldownInput);

    const enrichedStops: DrilldownStop[] = stops.map((s) => ({
      ...s,
      date: s.date.toISOString(),
      arrivalTime: s.arrivalTime?.toISOString() ?? null,
      departureTime: s.departureTime?.toISOString() ?? null,
      workdayPercentage: computeWorkdayPercentage(
        s.dwellMinutes,
        workdayMinutes,
      ),
    }));

    const averageDwellMinutes = averageDwellPerRoute(
      totalDwellMinutes,
      routeCount,
    );

    const workdayPercentage = computeWorkdayPercentage(
      averageDwellMinutes,
      workdayMinutes,
    );

    return {
      stops: enrichedStops,
      drivers,
      driverCount,
      totalDwellMinutes,
      averageDwellMinutes,
      workdayPercentage,
    };
  }

  async exportCSV(input: GetAggregationInput): Promise<CsvExportOutput> {
    const csvInput = {
      ...input,
      date: toDate(input.date),
      dateFrom: toDate(input.dateFrom),
      dateTo: toDate(input.dateTo),
    };
    const csv = await this.repository.exportCSV(csvInput);

    let filename = "dashboard-export";
    if (input.periodType === "day" && input.date) {
      const date = toDate(input.date);
      if (date) filename += `-day-${date.toISOString().split("T")[0]}`;
    } else if (input.periodType === "month" && input.year && input.month) {
      filename += `-month-${input.year}-${String(input.month).padStart(2, "0")}`;
    } else if (
      input.periodType === "custom" &&
      input.dateFrom &&
      input.dateTo
    ) {
      const from = toDate(input.dateFrom);
      const to = toDate(input.dateTo);
      if (from && to) {
        filename += `-custom-${from.toISOString().split("T")[0]}-to-${to.toISOString().split("T")[0]}`;
      }
    }
    filename += ".csv";

    return { csv, filename };
  }

  async getStandardWorkdayDuration(): Promise<StandardWorkdayDuration> {
    const duration = await this.repository.getStandardWorkdayDuration();
    return { standardWorkdayDuration: duration };
  }
}
