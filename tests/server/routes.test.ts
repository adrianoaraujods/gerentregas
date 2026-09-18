import { beforeEach, describe, expect, it, vi } from "vitest";

import { BadRequestError, ConflictError, NotFoundError } from "@/server/api";
import { db } from "@/server/db";
import { user } from "@/server/db/schemas/auth";
import { encrypt } from "@/server/lib/crypto";
import type { GeocodeResult } from "@/server/modules/points/geocoder";
import { PointsRepository } from "@/server/modules/points/points.repository";
import { PointsService } from "@/server/modules/points/points.service";
import { RoutesRepository } from "@/server/modules/routes/routes.repository";
import { RoutesService } from "@/server/modules/routes/routes.service";

describe("RoutesService", () => {
  let routesRepository: RoutesRepository;
  let pointsRepository: PointsRepository;
  let mockGeocoder: { geocode: ReturnType<typeof vi.fn> };
  let pointsService: PointsService;
  let routesService: RoutesService;

  let managerId: string;
  let driverId: string;
  let pointId1: string;
  let pointId2: string;
  let pointId3: string;

  beforeEach(async () => {
    routesRepository = new RoutesRepository(db);
    pointsRepository = new PointsRepository(db);
    mockGeocoder = { geocode: vi.fn() };
    pointsService = new PointsService(
      pointsRepository,
      mockGeocoder as unknown as {
        geocode: (address: string) => Promise<GeocodeResult | null>;
      },
    );
    routesService = new RoutesService(routesRepository);

    mockGeocoder.geocode.mockResolvedValue({
      latitude: -23.5505,
      longitude: -46.6333,
      displayName: "São Paulo, SP, Brasil",
    } as GeocodeResult);

    managerId = crypto.randomUUID();
    driverId = crypto.randomUUID();

    await db.insert(user).values([
      {
        id: managerId,
        name: "Manager Test",
        email: "manager@test.com",
        emailVerified: true,
        role: "manager",
        document: encrypt("12345678901"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: driverId,
        name: "Driver Test",
        email: "driver@test.com",
        emailVerified: true,
        role: "driver",
        document: encrypt("10987654321"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const point1 = await pointsService.createPoint({
      name: "Origem",
      address: "Av. Paulista, 1000, São Paulo, SP",
    });
    pointId1 = point1.id;

    const point2 = await pointsService.createPoint({
      name: "Entrega 1",
      address: "Rua Augusta, 500, São Paulo, SP",
    });
    pointId2 = point2.id;

    const point3 = await pointsService.createPoint({
      name: "Entrega 2",
      address: "Rua Oscar Freire, 300, São Paulo, SP",
    });
    pointId3 = point3.id;
  });

  describe("createRoute", () => {
    it("creates a route with ordered stops and origin first", async () => {
      const result = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
            { pointId: pointId3, order: "3" },
          ],
        },
        managerId,
      );

      expect(result.id).toBeDefined();
      expect(result.driverId).toBe(driverId);
      expect(result.status).toBe("draft");
      expect(result.currentVersion).toBe("1");
      expect(result.stops.length).toBe(3);
      expect(result.stops[0].order).toBe("1");
      expect(result.stops[0].point?.id).toBe(pointId1);
      expect(result.stops[1].order).toBe("2");
      expect(result.stops[2].order).toBe("3");
    });

    it("rejects when driver already has a route on the same date (RN05)", async () => {
      await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      await expect(
        routesService.createRoute(
          {
            driverId,
            vehicleId: null,
            date: new Date().toISOString(),
            stops: [{ pointId: pointId2, order: "1" }],
          },
          managerId,
        ),
      ).rejects.toThrow(ConflictError);
    });

    it("rejects when first stop is not order 1 (RN01)", async () => {
      await expect(
        routesService.createRoute(
          {
            driverId,
            vehicleId: null,
            date: new Date().toISOString(),
            stops: [{ pointId: pointId1, order: "2" }],
          },
          managerId,
        ),
      ).rejects.toThrow("A primeira parada deve ter ordem '1'");
    });

    it("rejects when stops are not sequential (RN06)", async () => {
      await expect(
        routesService.createRoute(
          {
            driverId,
            vehicleId: null,
            date: new Date().toISOString(),
            stops: [
              { pointId: pointId1, order: "1" },
              { pointId: pointId2, order: "3" },
            ],
          },
          managerId,
        ),
      ).rejects.toThrow("As paradas devem ter ordem sequencial");
    });

    it("creates route version on creation (RNF05)", async () => {
      const result = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      const history = await routesService.getRouteHistory(result.id);
      expect(history.versions.length).toBe(1);
      expect(history.versions[0].version).toBe("1");
      expect(history.versions[0].stops.length).toBe(1);
    });

    it("rejects when point does not exist", async () => {
      await expect(
        routesService.createRoute(
          {
            driverId,
            vehicleId: null,
            date: new Date().toISOString(),
            stops: [{ pointId: "non-existent-id", order: "1" }],
          },
          managerId,
        ),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("getDriverRoute", () => {
    it("returns only the driver's own day route", async () => {
      const date = new Date();
      await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: date.toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      const result = await routesService.getDriverRoute(driverId, date);
      expect(result).not.toBeNull();
      expect(result!.driverId).toBe(driverId);
      expect(result!.stops.length).toBe(1);
    });

    it("returns null when driver has no route on that date", async () => {
      const result = await routesService.getDriverRoute(driverId, new Date());
      expect(result).toBeNull();
    });
  });

  describe("updateRoute", () => {
    it("creates new version on structural edit (RNF05)", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      await routesService.updateRoute(
        route.id,
        { status: "in_flight" },
        managerId,
      );
      await routesService.updateRoute(route.id, { vehicleId: null }, managerId);

      const history = await routesService.getRouteHistory(route.id);
      expect(history.versions.length).toBe(3);
      expect(history.versions[2].version).toBe("3");
    });

    it("enforces RN05 when changing driver", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      const otherDriverId = crypto.randomUUID();
      await db.insert(user).values({
        id: otherDriverId,
        name: "Other Driver",
        email: "other@test.com",
        emailVerified: true,
        role: "driver",
        document: encrypt("11111111111"),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await routesService.createRoute(
        {
          driverId: otherDriverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId2, order: "1" }],
        },
        managerId,
      );

      await expect(
        routesService.updateRoute(
          route.id,
          { driverId: otherDriverId },
          managerId,
        ),
      ).rejects.toThrow(ConflictError);
    });

    it("rejects driver/vehicle change on concluded route", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      await routesService.updateRoute(
        route.id,
        { status: "in_flight" },
        managerId,
      );
      await routesService.updateRoute(
        route.id,
        { status: "concluded" },
        managerId,
      );

      await expect(
        routesService.updateRoute(
          route.id,
          { driverId: "other-id" },
          managerId,
        ),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("addStop", () => {
    it("adds stop to draft route", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      const result = await routesService.addStop(
        route.id,
        { routeId: route.id, pointId: pointId2, order: "2" },
        managerId,
      );

      expect(result.stops.length).toBe(2);
      expect(result.stops[1].order).toBe("2");
      expect(result.stops[1].point?.id).toBe(pointId2);
    });

    it("creates new version on add stop (RNF05)", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      await routesService.addStop(
        route.id,
        { routeId: route.id, pointId: pointId2, order: "2" },
        managerId,
      );

      const history = await routesService.getRouteHistory(route.id);
      expect(history.versions.length).toBe(2);
    });

    it("rejects adding stop to concluded route", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      await routesService.updateRoute(
        route.id,
        { status: "in_flight" },
        managerId,
      );
      await routesService.updateRoute(
        route.id,
        { status: "concluded" },
        managerId,
      );

      await expect(
        routesService.addStop(
          route.id,
          { routeId: route.id, pointId: pointId2, order: "2" },
          managerId,
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it("rejects duplicate order (RN06)", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
          ],
        },
        managerId,
      );

      await expect(
        routesService.addStop(
          route.id,
          { routeId: route.id, pointId: pointId3, order: "2" },
          managerId,
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("concludeStop", () => {
    it("concludes a stop and transitions route to in_flight", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
          ],
        },
        managerId,
      );

      const stopId = route.stops[1].id;
      const result = await routesService.concludeStop(route.id, stopId);

      expect(result.stops[1].concludedAt).not.toBeNull();
      expect(result.status).toBe("in_flight");
    });

    it("transitions route to concluded when all stops concluded", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
          ],
        },
        managerId,
      );

      await routesService.concludeStop(route.id, route.stops[1].id);
      const result = await routesService.concludeStop(
        route.id,
        route.stops[0].id,
      );

      expect(result.status).toBe("concluded");
    });

    it("rejects concluding already concluded stop", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      await routesService.concludeStop(route.id, route.stops[0].id);

      await expect(
        routesService.concludeStop(route.id, route.stops[0].id),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("in-flight route editing (freeze rules)", () => {
    it("allows editing stops after last concluded stop", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
            { pointId: pointId3, order: "3" },
          ],
        },
        managerId,
      );

      await routesService.concludeStop(route.id, route.stops[0].id);

      const updatedRoute = await routesService.getRoute(route.id);
      const lastConcluded = updatedRoute.stops.find((s) => s.concludedAt);
      expect(lastConcluded?.order).toBe("1");

      const result = await routesService.updateStop(
        updatedRoute.id,
        updatedRoute.stops[1].id,
        { pointId: pointId3 },
        managerId,
      );

      expect(result.stops[1].point?.id).toBe(pointId3);
    });

    it("rejects editing concluded stop", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
          ],
        },
        managerId,
      );

      await routesService.concludeStop(route.id, route.stops[0].id);

      await expect(
        routesService.updateStop(
          route.id,
          route.stops[0].id,
          { pointId: pointId3 },
          managerId,
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it("rejects inserting stop before last concluded stop", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
            { pointId: pointId3, order: "3" },
          ],
        },
        managerId,
      );

      await routesService.concludeStop(route.id, route.stops[1].id);

      await expect(
        routesService.addStop(
          route.id,
          { routeId: route.id, pointId: pointId3, order: "1" },
          managerId,
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it("rejects moving stop across concluded stop", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
            { pointId: pointId3, order: "3" },
          ],
        },
        managerId,
      );

      await routesService.concludeStop(route.id, route.stops[1].id);

      await expect(
        routesService.updateStop(
          route.id,
          route.stops[2].id,
          { order: "1" },
          managerId,
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it("rejects deleting stop before last concluded stop", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
            { pointId: pointId3, order: "3" },
          ],
        },
        managerId,
      );

      await routesService.concludeStop(route.id, route.stops[1].id);

      await expect(
        routesService.deleteStop(route.id, route.stops[0].id, managerId),
      ).rejects.toThrow(BadRequestError);
    });

    it("rejects deleting origin stop (RN01)", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      await expect(
        routesService.deleteStop(route.id, route.stops[0].id, managerId),
      ).rejects.toThrow("Não é possível excluir a parada de origem");
    });
  });

  describe("deleteStop", () => {
    it("soft deletes stop and creates new version (RNF05)", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
          ],
        },
        managerId,
      );

      const result = await routesService.deleteStop(
        route.id,
        route.stops[1].id,
        managerId,
      );

      expect(result.stops.length).toBe(1);
      expect(result.stops[0].order).toBe("1");

      const history = await routesService.getRouteHistory(route.id);
      expect(history.versions.length).toBe(2);
    });
  });

  describe("softDeleteRoute", () => {
    it("soft deletes route", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      await routesService.softDeleteRoute(route.id);

      const list = await routesService.listRoutes({ limit: 10, offset: 0 });
      expect(list.routes.length).toBe(0);
    });
  });

  describe("restoreRoute", () => {
    it("restores soft-deleted route", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      await routesService.softDeleteRoute(route.id);
      const restored = await routesService.restoreRoute(route.id);

      expect(restored.id).toBe(route.id);

      const list = await routesService.listRoutes({ limit: 10, offset: 0 });
      expect(list.routes.length).toBe(1);
    });

    it("throws when restoring non-deleted route", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      await expect(routesService.restoreRoute(route.id)).rejects.toThrow(
        BadRequestError,
      );
    });
  });
});
