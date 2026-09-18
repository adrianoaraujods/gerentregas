import { and, count, eq, isNull } from "drizzle-orm";
import type { Database } from "@/server/db";
import { route, stop } from "@/server/db/schemas/routes";

type RouteStatus = (typeof route.$inferSelect)["status"];

export class SyncRepository {
  constructor(private readonly db: Database) {}

  async findStopWithRoute(stopId: string): Promise<{
    stop: typeof stop.$inferSelect;
    route: typeof route.$inferSelect;
  } | null> {
    const [row] = await this.db
      .select({ stop, route })
      .from(stop)
      .innerJoin(route, eq(stop.routeId, route.id))
      .where(and(eq(stop.id, stopId), isNull(stop.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async concludeStopIfOpen(
    stopId: string,
    concludedAt: Date,
  ): Promise<boolean> {
    const [row] = await this.db
      .update(stop)
      .set({ concludedAt, updatedAt: new Date() })
      .where(
        and(
          eq(stop.id, stopId),
          isNull(stop.concludedAt),
          isNull(stop.deletedAt),
        ),
      )
      .returning({ id: stop.id });
    return !!row;
  }

  async findRouteStatus(routeId: string): Promise<RouteStatus | null> {
    const [row] = await this.db
      .select({ status: route.status })
      .from(route)
      .where(and(eq(route.id, routeId), isNull(route.deletedAt)))
      .limit(1);
    return row?.status ?? null;
  }

  async updateRouteStatus(routeId: string, status: RouteStatus): Promise<void> {
    await this.db
      .update(route)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(route.id, routeId), isNull(route.deletedAt)));
  }

  async countOpenStops(routeId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(stop)
      .where(
        and(
          eq(stop.routeId, routeId),
          isNull(stop.concludedAt),
          isNull(stop.deletedAt),
        ),
      );
    return row?.count ?? 0;
  }
}
