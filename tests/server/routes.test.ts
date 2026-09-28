import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/api";
import { db } from "@/server/db";
import { user } from "@/server/db/schemas/auth";
import { parameter } from "@/server/db/schemas/parameters";
import { encrypt } from "@/server/lib/crypto";
import { FleetRepository } from "@/server/modules/fleet";
import { ParametersRepository } from "@/server/modules/parameters";
import type { GeocodeResult } from "@/server/modules/points/geocoder";
import { PointsRepository } from "@/server/modules/points/points.repository";
import { PointsService } from "@/server/modules/points/points.service";
import type { OsrmClient } from "@/server/modules/routes/osrm";
import { RoutesController } from "@/server/modules/routes/routes.controller";
import { RoutesRepository } from "@/server/modules/routes/routes.repository";
import { RoutesService } from "@/server/modules/routes/routes.service";

describe("RoutesService", () => {
  let routesRepository: RoutesRepository;
  let pointsRepository: PointsRepository;
  let parametersRepository: ParametersRepository;
  let fleetRepository: FleetRepository;
  let mockGeocoder: { geocode: ReturnType<typeof vi.fn> };
  let mockOsrm: { routeLegDistancesKm: ReturnType<typeof vi.fn> };
  let pointsService: PointsService;
  let routesService: RoutesService;

  let managerId: string;
  let driverId: string;
  let pointId1: string;
  let pointId2: string;
  let pointId3: string;
  let vehicleAId: string;
  let vehicleBId: string;

  beforeEach(async () => {
    routesRepository = new RoutesRepository(db);
    pointsRepository = new PointsRepository(db);
    parametersRepository = new ParametersRepository(db);
    fleetRepository = new FleetRepository(db);
    mockGeocoder = { geocode: vi.fn() };
    mockOsrm = {
      routeLegDistancesKm: vi.fn(async () => [5, 7]),
    } as OsrmClient as unknown as {
      routeLegDistancesKm: ReturnType<typeof vi.fn>;
    };
    pointsService = new PointsService(
      pointsRepository,
      mockGeocoder as unknown as {
        geocode: (address: string) => Promise<GeocodeResult | null>;
      },
    );
    routesService = new RoutesService(
      routesRepository,
      parametersRepository,
      fleetRepository,
      mockOsrm as unknown as OsrmClient,
    );

    mockGeocoder.geocode.mockResolvedValue({
      latitude: -23.5505,
      longitude: -46.6333,
      displayName: "São Paulo, SP, Brasil",
    } as GeocodeResult);

    await db.insert(parameter).values({
      id: "system",
      fuelPricePerLiter: 600,
      standardWorkdayDuration: 480,
    });

    const vehicleA = await fleetRepository.create({
      id: crypto.randomUUID(),
      plate: "TST-0001",
      model: "Moto Cargo 160",
      kmPerLiterHundredths: 1250,
      active: true,
    });
    vehicleAId = vehicleA.id;

    const vehicleB = await fleetRepository.create({
      id: crypto.randomUUID(),
      plate: "TST-0002",
      model: "Moto Cargo 250",
      kmPerLiterHundredths: 1000,
      active: true,
    });
    vehicleBId = vehicleB.id;

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

      expect(result.stops[1].departureAt).not.toBeNull();
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
      const lastConcluded = updatedRoute.stops.find((s) => s.departureAt);
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

  describe("Driver day flow (dwell engine)", () => {
    let vehicleId: string;
    let routeId: string;
    let originStopId: string;
    let stop2Id: string;
    let stop3Id: string;

    beforeEach(async () => {
      const { vehicle } = await import("@/server/db/schemas/fleet");
      const vehicleResult = await db
        .insert(vehicle)
        .values({
          id: crypto.randomUUID(),
          plate: `TEST-${crypto.randomUUID().slice(0, 8)}`,
          model: "Test Vehicle",
          kmPerLiterHundredths: 1000,
          active: true,
        })
        .returning();
      vehicleId = vehicleResult[0].id;

      const date = new Date();
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: date.toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
            { pointId: pointId3, order: "3" },
          ],
        },
        managerId,
      );
      routeId = route.id;
      originStopId = route.stops[0].id;
      stop2Id = route.stops[1].id;
      stop3Id = route.stops[2].id;
    });

    describe("startShift", () => {
      it("starts shift with vehicle selection, records origin departure, locks vehicle, transitions to in_flight", async () => {
        const result = await routesService.startShift(
          routeId,
          { vehicleId },
          driverId,
        );

        expect(result.status).toBe("in_flight");
        expect(result.vehicleId).toBe(vehicleId);
        expect(result.stops[0].departureAt).not.toBeNull();
        expect(result.stops[0].arrivalAt).toBeNull();
      });

      it("uses pre-assigned vehicle when available", async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const routeWithVehicle = await routesService.createRoute(
          {
            driverId,
            vehicleId,
            date: tomorrow.toISOString(),
            stops: [{ pointId: pointId1, order: "1" }],
          },
          managerId,
        );

        const result = await routesService.startShift(
          routeWithVehicle.id,
          { vehicleId: null },
          driverId,
        );

        expect(result.vehicleId).toBe(vehicleId);
        expect(result.status).toBe("in_flight");
      });

      it("rejects when vehicle is locked by another route on same date", async () => {
        const otherDriverId = crypto.randomUUID();
        await db.insert(user).values({
          id: otherDriverId,
          name: "Other Driver",
          email: "other2@test.com",
          emailVerified: true,
          role: "driver",
          document: encrypt("22222222222"),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const otherRoute = await routesService.createRoute(
          {
            driverId: otherDriverId,
            vehicleId,
            date: new Date().toISOString(),
            stops: [{ pointId: pointId2, order: "1" }],
          },
          managerId,
        );
        await routesService.startShift(
          otherRoute.id,
          { vehicleId },
          otherDriverId,
        );

        await expect(
          routesService.startShift(routeId, { vehicleId }, driverId),
        ).rejects.toThrow(ConflictError);
      });

      it("rejects when route is not in draft status", async () => {
        await routesService.startShift(routeId, { vehicleId }, driverId);

        await expect(
          routesService.startShift(routeId, { vehicleId }, driverId),
        ).rejects.toThrow(BadRequestError);
      });

      it("rejects when no vehicle provided and no pre-assigned vehicle", async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const routeNoVehicle = await routesService.createRoute(
          {
            driverId,
            vehicleId: null,
            date: tomorrow.toISOString(),
            stops: [{ pointId: pointId1, order: "1" }],
          },
          managerId,
        );

        await expect(
          routesService.startShift(
            routeNoVehicle.id,
            { vehicleId: null },
            driverId,
          ),
        ).rejects.toThrow("Selecione um veículo");
      });

      it("rejects when driver tries to start another driver's route", async () => {
        const otherDriverId = crypto.randomUUID();
        await db.insert(user).values({
          id: otherDriverId,
          name: "Other Driver",
          email: "other3@test.com",
          emailVerified: true,
          role: "driver",
          document: encrypt("33333333333"),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await expect(
          routesService.startShift(routeId, { vehicleId }, otherDriverId),
        ).rejects.toThrow(ForbiddenError);
      });

      it("creates new version on shift start (RNF05)", async () => {
        await routesService.startShift(routeId, { vehicleId }, driverId);

        const history = await routesService.getRouteHistory(routeId);
        expect(history.versions.length).toBe(2);
        expect(history.versions[1].version).toBe("2");
        expect(history.versions[1].vehicleId).toBe(vehicleId);
        expect(history.versions[1].status).toBe("in_flight");
      });
    });

    describe("checkIn/checkOut", () => {
      beforeEach(async () => {
        await routesService.startShift(routeId, { vehicleId }, driverId);
      });

      it("checkIn records arrivalAt for non-origin stop", async () => {
        const result = await routesService.checkIn(stop2Id, driverId);

        expect(result.stop.arrivalAt).not.toBeNull();
        expect(result.stop.departureAt).toBeNull();
      });

      it("rejects checkIn for origin stop (RN01)", async () => {
        await expect(
          routesService.checkIn(originStopId, driverId),
        ).rejects.toThrow("A parada de origem não possui check-in");
      });

      it("rejects double checkIn", async () => {
        await routesService.checkIn(stop2Id, driverId);

        await expect(routesService.checkIn(stop2Id, driverId)).rejects.toThrow(
          "Check-in já realizado",
        );
      });

      it("rejects checkIn when route not in_flight", async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const draftRoute = await routesService.createRoute(
          {
            driverId,
            vehicleId: null,
            date: tomorrow.toISOString(),
            stops: [
              { pointId: pointId1, order: "1" },
              { pointId: pointId2, order: "2" },
            ],
          },
          managerId,
        );

        await expect(
          routesService.checkIn(draftRoute.stops[1].id, driverId),
        ).rejects.toThrow("A rota deve estar em andamento");
      });

      it("checkOut records departureAt and returns dwellSeconds", async () => {
        await routesService.checkIn(stop2Id, driverId);

        const { stop, dwellSeconds } = await routesService.checkOut(
          stop2Id,
          driverId,
        );

        expect(stop.departureAt).not.toBeNull();
        expect(dwellSeconds).toBeGreaterThanOrEqual(0);
      });

      it("rejects checkOut without checkIn", async () => {
        await expect(routesService.checkOut(stop2Id, driverId)).rejects.toThrow(
          "Check-in não realizado",
        );
      });

      it("rejects double checkOut", async () => {
        await routesService.checkIn(stop2Id, driverId);
        await routesService.checkOut(stop2Id, driverId);

        await expect(routesService.checkOut(stop2Id, driverId)).rejects.toThrow(
          "Check-out já realizado",
        );
      });

      it("rejects checkOut when route not in_flight", async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const draftRoute = await routesService.createRoute(
          {
            driverId,
            vehicleId: null,
            date: tomorrow.toISOString(),
            stops: [
              { pointId: pointId1, order: "1" },
              { pointId: pointId2, order: "2" },
            ],
          },
          managerId,
        );
        // Don't start shift, so route stays in draft
        // Try checkOut directly - should fail because route not in_flight
        await expect(
          routesService.checkOut(draftRoute.stops[1].id, driverId),
        ).rejects.toThrow("A rota deve estar em andamento");
      });

      it("rejects checkIn/checkOut for another driver's route", async () => {
        const otherDriverId = crypto.randomUUID();
        await db.insert(user).values({
          id: otherDriverId,
          name: "Other Driver",
          email: "other4@test.com",
          emailVerified: true,
          role: "driver",
          document: encrypt("44444444444"),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await expect(
          routesService.checkIn(stop2Id, otherDriverId),
        ).rejects.toThrow(ForbiddenError);
      });
    });

    describe("getDriverRouteWithDwell", () => {
      it("returns dwellSeconds per stop and totalDwellSeconds excluding origin (RN03)", async () => {
        await routesService.startShift(routeId, { vehicleId }, driverId);
        await routesService.checkIn(stop2Id, driverId);
        await new Promise((r) => setTimeout(r, 1100));
        await routesService.checkOut(stop2Id, driverId);

        await routesService.checkIn(stop3Id, driverId);
        await new Promise((r) => setTimeout(r, 1100));
        await routesService.checkOut(stop3Id, driverId);

        const result = await routesService.getDriverRouteWithDwell(
          driverId,
          new Date(),
        );

        expect(result).not.toBeNull();
        expect(result!.totalDwellSeconds).toBeGreaterThan(0);
        expect(result!.stops[0].dwellSeconds).toBeUndefined();
        expect(result!.stops[1].dwellSeconds).toBeDefined();
        expect(result!.stops[2].dwellSeconds).toBeDefined();
        expect(result!.totalDwellSeconds).toBe(
          (result!.stops[1].dwellSeconds ?? 0) +
            (result!.stops[2].dwellSeconds ?? 0),
        );
      });

      it("origin has departureAt but no arrivalAt or dwellSeconds", async () => {
        await routesService.startShift(routeId, { vehicleId }, driverId);

        const result = await routesService.getDriverRouteWithDwell(
          driverId,
          new Date(),
        );

        expect(result!.stops[0].departureAt).not.toBeNull();
        expect(result!.stops[0].arrivalAt).toBeNull();
        expect(result!.stops[0].dwellSeconds).toBeUndefined();
      });

      it("includes pricing fields on a draft route without vehicle (driver output contract)", async () => {
        const result = await routesService.getDriverRouteWithDwell(
          driverId,
          new Date(),
        );

        expect(result).not.toBeNull();
        expect(result).toHaveProperty("distanceKm", 12);
        expect(result).toHaveProperty("cost", null);
      });

      it("passes driverRouteOutputSchema via the controller for a draft route (driver sees route)", async () => {
        const controller = new RoutesController(db);

        const result = await controller.getDriverRouteWithDwell(
          driverId,
          new Date(),
        );

        expect(result).not.toBeNull();
        expect(result!.id).toBe(routeId);
        expect(result!.distanceKm).toBe(12);
        expect(result!.cost).toBeNull();
      });

      it("passes driverRouteOutputSchema via the controller after shift start", async () => {
        await routesService.startShift(routeId, { vehicleId }, driverId);
        const controller = new RoutesController(db);

        const result = await controller.getDriverRouteWithDwell(
          driverId,
          new Date(),
        );

        expect(result).not.toBeNull();
        expect(result!.status).toBe("in_flight");
        expect(result!.distanceKm).toBe(12);
        expect(result!.cost).toBe(7.2);
      });

      it("passes routeWithStopsOutputSchema via controller.startShift", async () => {
        const controller = new RoutesController(db);

        const result = await controller.startShift(
          routeId,
          { vehicleId },
          driverId,
        );

        expect(result.status).toBe("in_flight");
        expect(result.vehicleId).toBe(vehicleId);
        expect(result.distanceKm).toBe(12);
        expect(result.cost).toBe(7.2);
      });
    });
  });

  describe("OSRM distance (RN07)", () => {
    it("computes distance on creation as the sum of OSRM legs", async () => {
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

      expect(mockOsrm.routeLegDistancesKm).toHaveBeenCalledTimes(1);
      expect(mockOsrm.routeLegDistancesKm).toHaveBeenCalledWith([
        { longitude: -46.6333, latitude: -23.5505 },
        { longitude: -46.6333, latitude: -23.5505 },
        { longitude: -46.6333, latitude: -23.5505 },
      ]);
      expect(result.distanceKm).toBe(12);
    });

    it("uses zero distance for a single-stop route without calling OSRM", async () => {
      const result = await routesService.createRoute(
        {
          driverId,
          vehicleId: null,
          date: new Date().toISOString(),
          stops: [{ pointId: pointId1, order: "1" }],
        },
        managerId,
      );

      expect(mockOsrm.routeLegDistancesKm).not.toHaveBeenCalled();
      expect(result.distanceKm).toBe(0);
    });

    it("leaves distance indeterminate when a stop has no coordinates", async () => {
      mockGeocoder.geocode.mockResolvedValueOnce(null);
      const ungeocodedPoint = await pointsService.createPoint({
        name: "Sem coordenadas",
        address: "Endereço desconhecido, São Paulo, SP",
      });

      const result = await routesService.createRoute(
        {
          driverId,
          vehicleId: vehicleAId,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: ungeocodedPoint.id, order: "2" },
          ],
        },
        managerId,
      );

      expect(mockOsrm.routeLegDistancesKm).not.toHaveBeenCalled();
      expect(result.distanceKm).toBeNull();
      expect(result.cost).toBeNull();
    });
  });

  describe("route cost (RN07)", () => {
    it("computes cost from distance, fuel price and vehicle consumption", async () => {
      const result = await routesService.createRoute(
        {
          driverId,
          vehicleId: vehicleAId,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
            { pointId: pointId3, order: "3" },
          ],
        },
        managerId,
      );

      expect(result.distanceKm).toBe(12);
      expect(result.cost).toBe(5.76);
    });

    it("reads indeterminate when no vehicle is bound", async () => {
      const result = await routesService.createRoute(
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

      expect(result.distanceKm).toBe(12);
      expect(result.cost).toBeNull();
    });

    it("recomputes cost when the bound vehicle changes", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: vehicleAId,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
          ],
        },
        managerId,
      );
      expect(route.cost).toBe(5.76);

      const updated = await routesService.updateRoute(
        route.id,
        { vehicleId: vehicleBId },
        managerId,
      );
      expect(updated.cost).toBe(7.2);
    });
  });

  describe("distance override", () => {
    it("creates a new audited route version (RNF05)", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: vehicleAId,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
          ],
        },
        managerId,
      );

      const updated = await routesService.updateRoute(
        route.id,
        { distanceKm: 15 },
        managerId,
      );

      expect(updated.currentVersion).toBe("2");
      expect(updated.distanceKm).toBe(15);

      const history = await routesService.getRouteHistory(route.id);
      expect(history.versions.length).toBe(2);
      expect(history.versions[0].version).toBe("1");
      expect(history.versions[0].distanceKm).toBe(12);
      expect(history.versions[1].version).toBe("2");
      expect(history.versions[1].distanceKm).toBe(15);
    });

    it("recomputes cost from the overridden distance", async () => {
      const route = await routesService.createRoute(
        {
          driverId,
          vehicleId: vehicleAId,
          date: new Date().toISOString(),
          stops: [
            { pointId: pointId1, order: "1" },
            { pointId: pointId2, order: "2" },
          ],
        },
        managerId,
      );
      expect(route.cost).toBe(5.76);

      const updated = await routesService.updateRoute(
        route.id,
        { distanceKm: 20 },
        managerId,
      );
      expect(updated.distanceKm).toBe(20);
      expect(updated.cost).toBe(9.6);
    });

    it("rejects overriding distance on a concluded route", async () => {
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
        routesService.updateRoute(route.id, { distanceKm: 10 }, managerId),
      ).rejects.toThrow(BadRequestError);
    });
  });
});
