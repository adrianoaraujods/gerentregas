import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/server/db";
import { user } from "@/server/db/schemas/auth";
import { point } from "@/server/db/schemas/points";
import { route, stop } from "@/server/db/schemas/routes";
import { encrypt } from "@/server/lib/crypto";
import { FleetRepository } from "@/server/modules/fleet";
import { ParametersRepository } from "@/server/modules/parameters";
import type { OsrmClient } from "@/server/modules/routes/osrm";
import { RoutesRepository } from "@/server/modules/routes/routes.repository";
import { RoutesService } from "@/server/modules/routes/routes.service";
import { SyncRepository } from "@/server/modules/sync/sync.repository";
import { SyncService } from "@/server/modules/sync/sync.service";

function toLocalISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
}

describe("SyncService", () => {
  let repository: SyncRepository;
  let service: SyncService;

  let managerId: string;
  let driverId: string;
  let otherDriverId: string;
  let pointId1: string;
  let pointId2: string;
  let pointId3: string;
  let routeId: string;
  let stopsByOrder: Record<string, string>;
  let routeDate: Date;

  beforeEach(async () => {
    repository = new SyncRepository(db);
    service = new SyncService(repository);

    await db.execute(`TRUNCATE TABLE "stop", "route", "point", "user" CASCADE`);

    managerId = crypto.randomUUID();
    driverId = crypto.randomUUID();
    otherDriverId = crypto.randomUUID();

    await db.insert(user).values([
      {
        id: managerId,
        name: "Manager Test",
        email: "manager@sync.test",
        emailVerified: true,
        role: "manager",
        document: encrypt("12345678901"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: driverId,
        name: "Driver Test",
        email: "driver@sync.test",
        emailVerified: true,
        role: "driver",
        document: encrypt("10987654321"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: otherDriverId,
        name: "Other Driver",
        email: "other@sync.test",
        emailVerified: true,
        role: "driver",
        document: encrypt("11122233344"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const points = await db
      .insert(point)
      .values([
        {
          name: "Origem",
          address: "Av. Paulista, 1000, São Paulo, SP",
          latitude: -23.5505,
          longitude: -46.6333,
          geocodeStatus: "manual",
        },
        {
          name: "Entrega 1",
          address: "Rua Augusta, 500, São Paulo, SP",
          latitude: -23.5515,
          longitude: -46.6343,
          geocodeStatus: "manual",
        },
        {
          name: "Entrega 2",
          address: "Rua Oscar Freire, 300, São Paulo, SP",
          latitude: -23.5525,
          longitude: -46.6353,
          geocodeStatus: "manual",
        },
      ])
      .returning({ id: point.id });

    pointId1 = points[0].id;
    pointId2 = points[1].id;
    pointId3 = points[2].id;

    routeDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    routeDate.setHours(8, 0, 0, 0);

    const routeResult = await db
      .insert(route)
      .values({
        managerId,
        driverId,
        vehicleId: null,
        date: routeDate,
        status: "in_flight",
        currentVersion: "1",
      })
      .returning({ id: route.id });
    routeId = routeResult[0].id;

    const stops = await db
      .insert(stop)
      .values([
        {
          routeId,
          pointId: pointId1,
          order: "1",
          addressSnapshot: "Av. Paulista, 1000, São Paulo, SP",
          latitudeSnapshot: -23.5505,
          longitudeSnapshot: -46.6333,
        },
        {
          routeId,
          pointId: pointId2,
          order: "2",
          addressSnapshot: "Rua Augusta, 500, São Paulo, SP",
          latitudeSnapshot: -23.5515,
          longitudeSnapshot: -46.6343,
        },
        {
          routeId,
          pointId: pointId3,
          order: "3",
          addressSnapshot: "Rua Oscar Freire, 300, São Paulo, SP",
          latitudeSnapshot: -23.5525,
          longitudeSnapshot: -46.6353,
        },
      ])
      .returning({ id: stop.id, order: stop.order });

    stopsByOrder = Object.fromEntries(stops.map((s) => [s.order, s.id]));
  });

  function item(
    overrides: Partial<{
      id: string;
      stopId: string;
      arrival: Date;
      departure: Date;
    }> = {},
  ) {
    const arrival =
      overrides.arrival ?? new Date(routeDate.getTime() + 30 * 60000);
    const departure =
      overrides.departure ?? new Date(routeDate.getTime() + 45 * 60000);
    return {
      id: overrides.id ?? crypto.randomUUID(),
      stopId: overrides.stopId ?? stopsByOrder["1"],
      arrival: toLocalISO(arrival),
      departure: toLocalISO(departure),
    };
  }

  describe("uploadBatch", () => {
    it("accepts a valid item and persists its arrival and departure timestamps", async () => {
      const input = item({
        stopId: stopsByOrder["1"],
        arrival: new Date(routeDate.getTime() + 30 * 60000),
        departure: new Date(routeDate.getTime() + 45 * 60000),
      });

      const result = await service.uploadBatch({ items: [input] }, driverId);

      expect(result.accepted).toHaveLength(1);
      expect(result.rejected).toHaveLength(0);
      expect(result.summary).toEqual({ total: 1, accepted: 1, rejected: 0 });

      const [stored] = await db
        .select({
          arrivalAt: stop.arrivalAt,
          departureAt: stop.departureAt,
        })
        .from(stop)
        .where(eq(stop.id, stopsByOrder["1"]));
      expect(stored.arrivalAt?.toISOString()).toBe(
        new Date(routeDate.getTime() + 30 * 60000).toISOString(),
      );
      expect(stored.departureAt?.toISOString()).toBe(
        new Date(routeDate.getTime() + 45 * 60000).toISOString(),
      );
    });

    it("rejects departure <= arrival", async () => {
      const result = await service.uploadBatch(
        {
          items: [
            item({
              stopId: stopsByOrder["1"],
              arrival: new Date(routeDate.getTime() + 45 * 60000),
              departure: new Date(routeDate.getTime() + 30 * 60000),
            }),
          ],
        },
        driverId,
      );

      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].reason).toBe("DEPARTURE_BEFORE_ARRIVAL");
      expect(result.accepted).toHaveLength(0);
    });

    it("rejects a future timestamp", async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000);
      const result = await service.uploadBatch(
        { items: [item({ departure: future })] },
        driverId,
      );

      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].reason).toBe("FUTURE_TIMESTAMP");
    });

    it("rejects a timestamp off the route's date", async () => {
      const arrival = new Date(
        routeDate.getTime() - 24 * 60 * 60 * 1000 - 30 * 60000,
      );
      const result = await service.uploadBatch(
        {
          items: [
            item({
              stopId: stopsByOrder["1"],
              arrival,
              departure: new Date(arrival.getTime() + 15 * 60000),
            }),
          ],
        },
        driverId,
      );

      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].reason).toBe("TIMESTAMP_OFF_ROUTE_DATE");
    });

    it("rejects a duplicate arrival on an already-closed stop", async () => {
      await db
        .update(stop)
        .set({ departureAt: new Date(routeDate.getTime() + 45 * 60000) })
        .where(eq(stop.id, stopsByOrder["1"]));

      const result = await service.uploadBatch(
        { items: [item({ stopId: stopsByOrder["1"] })] },
        driverId,
      );

      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].reason).toBe(
        "DUPLICATE_ARRIVAL_ON_CLOSED_STOP",
      );
    });

    it("rejects a stop that does not belong to the authenticated driver's route", async () => {
      const otherRoute = await db
        .insert(route)
        .values({
          managerId,
          driverId: otherDriverId,
          vehicleId: null,
          date: routeDate,
          status: "in_flight",
          currentVersion: "1",
        })
        .returning({ id: route.id });

      const otherStop = await db
        .insert(stop)
        .values({
          routeId: otherRoute[0].id,
          pointId: pointId1,
          order: "1",
          addressSnapshot: "Av. Paulista, 1000, São Paulo, SP",
          latitudeSnapshot: -23.5505,
          longitudeSnapshot: -46.6333,
        })
        .returning({ id: stop.id });

      const result = await service.uploadBatch(
        { items: [item({ stopId: otherStop[0].id })] },
        driverId,
      );

      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].reason).toBe("STOP_NOT_IN_DRIVER_ROUTE");
    });

    it("rejects an unknown stop as not found", async () => {
      const result = await service.uploadBatch(
        { items: [item({ stopId: crypto.randomUUID() })] },
        driverId,
      );

      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].reason).toBe("STOP_NOT_FOUND");
    });

    it("returns per-item results for a mixed batch without dropping rejections", async () => {
      const valid = item({ stopId: stopsByOrder["1"] });
      const invalid = item({
        stopId: stopsByOrder["2"],
        arrival: new Date(routeDate.getTime() + 60 * 60000),
        departure: new Date(routeDate.getTime() + 50 * 60000),
      });

      const result = await service.uploadBatch(
        { items: [valid, invalid] },
        driverId,
      );

      expect(result.accepted).toHaveLength(1);
      expect(result.accepted[0].id).toBe(valid.id);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].id).toBe(invalid.id);
      expect(result.rejected[0].reason).toBe("DEPARTURE_BEFORE_ARRIVAL");
      expect(result.summary).toEqual({ total: 2, accepted: 1, rejected: 1 });
    });

    it("rejects the second copy of the same stop within one batch", async () => {
      const first = item({ stopId: stopsByOrder["1"] });
      const duplicate = item({ stopId: stopsByOrder["1"] });

      const result = await service.uploadBatch(
        { items: [first, duplicate] },
        driverId,
      );

      expect(result.accepted).toHaveLength(1);
      expect(result.accepted[0].id).toBe(first.id);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].id).toBe(duplicate.id);
      expect(result.rejected[0].reason).toBe(
        "DUPLICATE_ARRIVAL_ON_CLOSED_STOP",
      );
    });

    it("sets the route to in_flight and then concluded as stops close", async () => {
      await service.uploadBatch(
        { items: [item({ stopId: stopsByOrder["2"] })] },
        driverId,
      );

      const [afterFirst] = await db
        .select({ status: route.status })
        .from(route)
        .where(eq(route.id, routeId));
      expect(afterFirst.status).toBe("in_flight");

      await db
        .update(stop)
        .set({ departureAt: new Date(routeDate.getTime() + 15 * 60000) })
        .where(eq(stop.id, stopsByOrder["1"]));

      await service.uploadBatch(
        {
          items: [item({ stopId: stopsByOrder["3"] })],
        },
        driverId,
      );

      const [afterLast] = await db
        .select({ status: route.status })
        .from(route)
        .where(eq(route.id, routeId));
      expect(afterLast.status).toBe("concluded");
    });

    it("rejects when route is not in_flight", async () => {
      const tomorrow = new Date(routeDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const draftRoute = await db
        .insert(route)
        .values({
          managerId,
          driverId,
          vehicleId: null,
          date: tomorrow,
          status: "draft",
          currentVersion: "1",
        })
        .returning({ id: route.id });

      const draftStop = await db
        .insert(stop)
        .values({
          routeId: draftRoute[0].id,
          pointId: pointId1,
          order: "1",
          addressSnapshot: "Av. Paulista, 1000, São Paulo, SP",
          latitudeSnapshot: -23.5505,
          longitudeSnapshot: -46.6333,
        })
        .returning({ id: stop.id });

      const result = await service.uploadBatch(
        { items: [item({ stopId: draftStop[0].id })] },
        driverId,
      );

      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].reason).toBe("ROUTE_NOT_IN_FLIGHT");
    });
  });

  describe("merge without version gate", () => {
    it("manager additions keep recorded stops intact and do not reject previously queued items", async () => {
      const routesService = new RoutesService(
        new RoutesRepository(db),
        new ParametersRepository(db),
        new FleetRepository(db),
        {
          routeLegDistancesKm: vi.fn(async () => [5]),
          routeGeometry: vi.fn(async () => null),
        } as unknown as OsrmClient,
      );

      const first = await service.uploadBatch(
        {
          items: [
            item({
              stopId: stopsByOrder["2"],
              arrival: new Date(routeDate.getTime() + 30 * 60000),
              departure: new Date(routeDate.getTime() + 45 * 60000),
            }),
          ],
        },
        driverId,
      );
      expect(first.accepted).toHaveLength(1);

      const [extraPoint] = await db
        .insert(point)
        .values({
          name: "Entrega Extra",
          address: "Rua Nova, 42, São Paulo, SP",
          latitude: -23.5535,
          longitude: -46.6363,
          geocodeStatus: "manual",
        })
        .returning({ id: point.id });

      await routesService.addStop(
        routeId,
        { routeId, pointId: extraPoint.id, order: "4" },
        managerId,
      );

      const [recorded] = await db
        .select({
          arrivalAt: stop.arrivalAt,
          departureAt: stop.departureAt,
        })
        .from(stop)
        .where(eq(stop.id, stopsByOrder["2"]));
      expect(recorded.arrivalAt?.toISOString()).toBe(
        new Date(routeDate.getTime() + 30 * 60000).toISOString(),
      );
      expect(recorded.departureAt?.toISOString()).toBe(
        new Date(routeDate.getTime() + 45 * 60000).toISOString(),
      );

      const stopsAfterAddition = await db
        .select({ order: stop.order })
        .from(stop)
        .where(eq(stop.routeId, routeId));
      expect(stopsAfterAddition).toHaveLength(4);

      const second = await service.uploadBatch(
        {
          items: [
            item({
              stopId: stopsByOrder["3"],
              arrival: new Date(routeDate.getTime() + 60 * 60000),
              departure: new Date(routeDate.getTime() + 75 * 60000),
            }),
          ],
        },
        driverId,
      );
      expect(second.accepted).toHaveLength(1);
      expect(second.rejected).toHaveLength(0);
    });
  });
});
