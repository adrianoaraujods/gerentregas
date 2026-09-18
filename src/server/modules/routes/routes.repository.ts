import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "@/server/db";
import { point } from "@/server/db/schemas/points";
import {
  route,
  routeVersion,
  stop,
  stopVersion,
} from "@/server/db/schemas/routes";
import type {
  Route,
  RouteVersion,
  RouteWithStops,
  Stop,
  StopVersion,
  StopWithPoint,
} from "./routes.types";

export class RoutesRepository {
  constructor(private readonly db: Database) {}

  async createRoute(input: {
    managerId: string;
    driverId: string;
    vehicleId: string | null;
    date: Date;
    status: Route["status"];
    currentVersion: string;
  }): Promise<Route | null> {
    const [row] = await this.db
      .insert(route)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();
    return row ?? null;
  }

  async createRouteVersion(input: {
    routeId: string;
    version: string;
    managerId: string;
    driverId: string;
    vehicleId: string | null;
    date: Date;
    status: RouteVersion["status"];
  }): Promise<RouteVersion | null> {
    const [row] = await this.db
      .insert(routeVersion)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();
    return row ?? null;
  }

  async createStop(input: {
    routeId: string;
    pointId: string;
    order: string;
    addressSnapshot: string;
    latitudeSnapshot: number | null;
    longitudeSnapshot: number | null;
  }): Promise<Stop | null> {
    const [row] = await this.db
      .insert(stop)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();
    return row ?? null;
  }

  async createStopVersion(input: {
    stopId: string;
    routeVersionId: string;
    order: string;
    pointId: string;
    addressSnapshot: string;
    latitudeSnapshot: number | null;
    longitudeSnapshot: number | null;
    concludedAt: Date | null;
  }): Promise<StopVersion | null> {
    const [row] = await this.db
      .insert(stopVersion)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();
    return row ?? null;
  }

  async findRouteById(
    id: string,
    includeDeleted = false,
  ): Promise<Route | null> {
    const where = includeDeleted
      ? eq(route.id, id)
      : and(eq(route.id, id), isNull(route.deletedAt));
    const [row] = await this.db.select().from(route).where(where).limit(1);
    return row ?? null;
  }

  async findRouteByDriverAndDate(
    driverId: string,
    date: Date,
  ): Promise<Route | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [row] = await this.db
      .select()
      .from(route)
      .where(
        and(
          eq(route.driverId, driverId),
          sql`${route.date} >= ${startOfDay.toISOString()}`,
          sql`${route.date} <= ${endOfDay.toISOString()}`,
          isNull(route.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findRouteWithStops(routeId: string): Promise<RouteWithStops | null> {
    const [routeRow] = await this.db
      .select()
      .from(route)
      .where(and(eq(route.id, routeId), isNull(route.deletedAt)))
      .limit(1);

    if (!routeRow) return null;

    const stopsRows = await this.db
      .select({
        stop: stop,
        point: point,
      })
      .from(stop)
      .leftJoin(point, eq(stop.pointId, point.id))
      .where(and(eq(stop.routeId, routeId), isNull(stop.deletedAt)))
      .orderBy(stop.order);

    const stops: StopWithPoint[] = stopsRows.map(({ stop: s, point: p }) => ({
      ...s,
      point: p
        ? {
            id: p.id,
            name: p.name,
            address: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
            geocodeStatus: p.geocodeStatus,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          }
        : null,
    }));

    return { ...routeRow, stops };
  }

  async findRouteVersionWithStops(
    routeId: string,
    version: string,
  ): Promise<{ routeVersion: RouteVersion; stops: StopVersion[] } | null> {
    const [versionRow] = await this.db
      .select()
      .from(routeVersion)
      .where(
        and(
          eq(routeVersion.routeId, routeId),
          eq(routeVersion.version, version),
        ),
      )
      .limit(1);

    if (!versionRow) return null;

    const stopsRows = await this.db
      .select({
        stopVersion: stopVersion,
        point: point,
      })
      .from(stopVersion)
      .leftJoin(point, eq(stopVersion.pointId, point.id))
      .where(eq(stopVersion.routeVersionId, versionRow.id))
      .orderBy(stopVersion.order);

    const stops = stopsRows.map(({ stopVersion: sv, point: p }) => ({
      ...sv,
      point: p
        ? {
            id: p.id,
            name: p.name,
            address: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
            geocodeStatus: p.geocodeStatus,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          }
        : null,
    }));

    return { routeVersion: versionRow, stops };
  }

  async listRoutes(input: {
    limit: number;
    offset: number;
    driverId?: string;
    status?: Route["status"];
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const conditions = [isNull(route.deletedAt)];
    if (input.driverId) conditions.push(eq(route.driverId, input.driverId));
    if (input.status) conditions.push(eq(route.status, input.status));
    if (input.dateFrom)
      conditions.push(sql`${route.date} >= ${input.dateFrom}`);
    if (input.dateTo) conditions.push(sql`${route.date} <= ${input.dateTo}`);

    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(route)
        .where(where)
        .orderBy(desc(route.createdAt))
        .limit(input.limit)
        .offset(input.offset),
      this.db.select({ total: count() }).from(route).where(where),
    ]);

    return { routes: rows, total };
  }

  async listStopsByRoute(routeId: string): Promise<Stop[]> {
    return this.db
      .select()
      .from(stop)
      .where(and(eq(stop.routeId, routeId), isNull(stop.deletedAt)))
      .orderBy(stop.order);
  }

  async getLastConcludedStopOrder(routeId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ order: stop.order })
      .from(stop)
      .where(
        and(
          eq(stop.routeId, routeId),
          isNull(stop.deletedAt),
          sql`${stop.concludedAt} IS NOT NULL`,
        ),
      )
      .orderBy(desc(stop.order))
      .limit(1);
    return row?.order ?? null;
  }

  async getMaxStopOrder(routeId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ order: stop.order })
      .from(stop)
      .where(and(eq(stop.routeId, routeId), isNull(stop.deletedAt)))
      .orderBy(desc(stop.order))
      .limit(1);
    return row?.order ?? null;
  }

  async updateRoute(
    id: string,
    input: Partial<
      Pick<Route, "driverId" | "vehicleId" | "status" | "currentVersion">
    >,
  ): Promise<Route | null> {
    const updates: Record<string, unknown> = {};
    if (input.driverId !== undefined) updates.driverId = input.driverId;
    if (input.vehicleId !== undefined) updates.vehicleId = input.vehicleId;
    if (input.status !== undefined) updates.status = input.status;
    if (input.currentVersion !== undefined)
      updates.currentVersion = input.currentVersion;
    if (Object.keys(updates).length === 0) return null;

    updates.updatedAt = new Date();

    const [row] = await this.db
      .update(route)
      .set(updates)
      .where(and(eq(route.id, id), isNull(route.deletedAt)))
      .returning();
    return row ?? null;
  }

  async updateStop(
    id: string,
    input: Partial<Pick<Stop, "pointId" | "order" | "concludedAt">>,
  ): Promise<Stop | null> {
    const updates: Record<string, unknown> = {};
    if (input.pointId !== undefined) updates.pointId = input.pointId;
    if (input.order !== undefined) updates.order = input.order;
    if (input.concludedAt !== undefined)
      updates.concludedAt = input.concludedAt;
    if (Object.keys(updates).length === 0) return null;

    updates.updatedAt = new Date();

    const [row] = await this.db
      .update(stop)
      .set(updates)
      .where(and(eq(stop.id, id), isNull(stop.deletedAt)))
      .returning();
    return row ?? null;
  }

  async softDeleteRoute(id: string): Promise<Route | null> {
    const [row] = await this.db
      .update(route)
      .set({ deletedAt: new Date() })
      .where(and(eq(route.id, id), isNull(route.deletedAt)))
      .returning();
    return row ?? null;
  }

  async softDeleteStop(id: string): Promise<Stop | null> {
    const [row] = await this.db
      .update(stop)
      .set({ deletedAt: new Date() })
      .where(and(eq(stop.id, id), isNull(stop.deletedAt)))
      .returning();
    return row ?? null;
  }

  async restoreRoute(id: string): Promise<Route | null> {
    const [row] = await this.db
      .update(route)
      .set({ deletedAt: null })
      .where(and(eq(route.id, id), sql`${route.deletedAt} IS NOT NULL`))
      .returning();
    return row ?? null;
  }

  async findStopById(id: string, includeDeleted = false): Promise<Stop | null> {
    const where = includeDeleted
      ? eq(stop.id, id)
      : and(eq(stop.id, id), isNull(stop.deletedAt));
    const [row] = await this.db.select().from(stop).where(where).limit(1);
    return row ?? null;
  }

  async checkDriverDateConflict(
    driverId: string,
    date: Date,
    excludeRouteId?: string,
  ): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const conditions = [
      eq(route.driverId, driverId),
      sql`${route.date} >= ${startOfDay.toISOString()}`,
      sql`${route.date} <= ${endOfDay.toISOString()}`,
      isNull(route.deletedAt),
    ];
    if (excludeRouteId) conditions.push(sql`${route.id} != ${excludeRouteId}`);

    const [row] = await this.db
      .select({ id: route.id })
      .from(route)
      .where(and(...conditions))
      .limit(1);
    return !!row;
  }

  async checkOrderConflict(
    routeId: string,
    order: string,
    excludeStopId?: string,
  ): Promise<boolean> {
    const conditions = [
      eq(stop.routeId, routeId),
      eq(stop.order, order),
      isNull(stop.deletedAt),
    ];
    if (excludeStopId) conditions.push(sql`${stop.id} != ${excludeStopId}`);

    const [row] = await this.db
      .select({ id: stop.id })
      .from(stop)
      .where(and(...conditions))
      .limit(1);
    return !!row;
  }

  async findPointsByIds(pointIds: string[]) {
    if (pointIds.length === 0) return [];
    return this.db.select().from(point).where(inArray(point.id, pointIds));
  }

  async findPointById(pointId: string) {
    const [row] = await this.db
      .select()
      .from(point)
      .where(eq(point.id, pointId))
      .limit(1);
    return row ?? null;
  }

  async findRouteVersionId(
    routeId: string,
    version: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({ id: routeVersion.id })
      .from(routeVersion)
      .where(
        and(
          eq(routeVersion.routeId, routeId),
          eq(routeVersion.version, version),
        ),
      )
      .limit(1);
    return row?.id ?? null;
  }

  async findRouteVersions(routeId: string) {
    return this.db
      .select()
      .from(routeVersion)
      .where(eq(routeVersion.routeId, routeId))
      .orderBy(routeVersion.version);
  }

  async findStopVersionsWithPoints(routeVersionId: string) {
    return this.db
      .select({
        stopVersion: stopVersion,
        point: point,
      })
      .from(stopVersion)
      .leftJoin(point, eq(stopVersion.pointId, point.id))
      .where(eq(stopVersion.routeVersionId, routeVersionId))
      .orderBy(stopVersion.order);
  }
}
