import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { user } from "@/server/db/schemas/auth";
import { point } from "@/server/db/schemas/points";
import { route, stop } from "@/server/db/schemas/routes";

beforeEach(async () => {
  await db.execute(sql`
    TRUNCATE TABLE
      "stop_version",
      "route_version",
      "stop",
      "route",
      "point",
      "user"
    CASCADE
  `);

  const { main } = await import("@/server/db/scripts/seed-demo");
  await main();
}, 120000);

describe("Demo seed script", () => {
  it("creates complete demo dataset for Belo Horizonte", async () => {
    const managerCount = Number(
      (
        await db
          .select({ count: sql<number>`count(*)` })
          .from(user)
          .where(sql`${user.role} = 'manager'`)
      )[0]?.count ?? 0,
    );

    const driverCount = Number(
      (
        await db
          .select({ count: sql<number>`count(*)` })
          .from(user)
          .where(sql`${user.role} = 'driver'`)
      )[0]?.count ?? 0,
    );

    const pointCount = Number(
      (await db.select({ count: sql<number>`count(*)` }).from(point))[0]
        ?.count ?? 0,
    );

    const routeCount = Number(
      (await db.select({ count: sql<number>`count(*)` }).from(route))[0]
        ?.count ?? 0,
    );

    const stopCount = Number(
      (await db.select({ count: sql<number>`count(*)` }).from(stop))[0]
        ?.count ?? 0,
    );

    const stopsWithDepartureAt = Number(
      (
        await db
          .select({ count: sql<number>`count(*)` })
          .from(stop)
          .where(sql`${stop.departureAt} IS NOT NULL`)
      )[0]?.count ?? 0,
    );

    const statusCounts = await db
      .select({ status: route.status, count: sql<number>`count(*)` })
      .from(route)
      .groupBy(route.status);

    const statusMap = Object.fromEntries(
      statusCounts.map((s) => [s.status, Number(s.count)]),
    );

    const managerCounts = await db
      .select({ managerId: route.managerId, count: sql<number>`count(*)` })
      .from(route)
      .groupBy(route.managerId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const todayRoutes = await db
      .select({ status: route.status })
      .from(route)
      .where(
        sql`${route.date} >= ${todayStart.toISOString()} AND ${route.date} < ${tomorrowStart.toISOString()}`,
      );

    const futureRouteCount = Number(
      (
        await db
          .select({ count: sql<number>`count(*)` })
          .from(route)
          .where(sql`${route.date} >= ${tomorrowStart.toISOString()}`)
      )[0]?.count ?? 0,
    );

    expect(managerCount).toBe(1);
    expect(driverCount).toBe(6);
    expect(pointCount).toBe(18);
    expect(routeCount).toBeGreaterThan(50);
    expect(stopCount).toBeGreaterThan(200);
    expect(stopsWithDepartureAt).toBeGreaterThan(100);
    expect(statusMap.concluded).toBeGreaterThan(50);
    expect(statusMap.in_flight).toBeGreaterThan(0);
    expect(statusMap.cancelled).toBeGreaterThan(0);
    expect(managerCounts.length).toBe(1);
    expect(Number(managerCounts[0].count)).toBeGreaterThan(50);

    expect(todayRoutes.length).toBeGreaterThan(0);
    expect(todayRoutes.every((r) => r.status === "in_flight")).toBe(true);
    expect(futureRouteCount).toBe(0);
  });
});
