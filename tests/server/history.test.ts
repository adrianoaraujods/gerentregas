import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError } from "@/server/api";
import { db } from "@/server/db";
import { user } from "@/server/db/schemas/auth";
import { FleetRepository } from "@/server/modules/fleet";
import { ParametersRepository } from "@/server/modules/parameters";
import type { GeocodeResult } from "@/server/modules/points/geocoder";
import { PointsRepository } from "@/server/modules/points/points.repository";
import { PointsService } from "@/server/modules/points/points.service";
import type { OsrmClient } from "@/server/modules/routes/osrm";
import { RoutesRepository } from "@/server/modules/routes/routes.repository";
import { RoutesService } from "@/server/modules/routes/routes.service";

describe("History and Corrections", () => {
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
  let routeId: string;
  let stopId: string;

  beforeEach(async () => {
    routesRepository = new RoutesRepository(db);
    pointsRepository = new PointsRepository(db);
    parametersRepository = new ParametersRepository(db);
    fleetRepository = new FleetRepository(db);
    mockGeocoder = { geocode: vi.fn() };
    mockOsrm = {
      routeLegDistancesKm: vi.fn(async () => [5, 7]),
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

    const [mgr] = await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        name: "Manager",
        email: `manager.${Date.now()}@test.com`,
        role: "manager",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    managerId = mgr.id;

    const [drv] = await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        name: "Driver",
        email: `driver.${Date.now()}@test.com`,
        role: "driver",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    driverId = drv.id;

    const p1 = await pointsService.createPoint({
      name: "P1",
      address: "Address 1",
      latitude: undefined,
      longitude: undefined,
    });
    pointId1 = p1.id;

    const route = await routesService.createRoute(
      {
        driverId,
        date: new Date().toISOString(),
        stops: [{ pointId: pointId1, order: "1" }],
      },
      managerId,
    );
    routeId = route.id;
    stopId = route.stops[0].id;
  });

  it("should allow a driver to correct their own stop timestamps and create a correction version", async () => {
    const now = new Date();
    const correctedStop = await routesService.correctTimestamps(
      routeId,
      stopId,
      { arrivalAt: now, departureAt: null },
      driverId,
      false,
    );

    expect(correctedStop).toBeDefined();
    expect(correctedStop?.arrivalAt?.getTime()).toEqual(now.getTime());

    const history = await routesService.getRouteHistory(routeId);
    expect(history.versions).toHaveLength(1);
    const stopsVersion = history.versions[0].stops;
    expect(stopsVersion.length).toBeGreaterThan(1);
    const correction = stopsVersion.find(
      (sv) => sv.versionType === "correction",
    );
    expect(correction).toBeDefined();
    expect(correction?.actorId).toEqual(driverId);
    expect(correction?.actorName).toEqual("Driver");
  });

  it("should allow a manager to correct any stop timestamps", async () => {
    const now = new Date();
    await routesService.correctTimestamps(
      routeId,
      stopId,
      { arrivalAt: null, departureAt: now },
      managerId,
      true,
    );

    const history = await routesService.getRouteHistory(routeId);
    const stopsVersion = history.versions[0].stops;
    const correction = stopsVersion.find(
      (sv) => sv.versionType === "correction",
    );
    expect(correction).toBeDefined();
    expect(correction?.actorId).toEqual(managerId);
    expect(correction?.actorName).toEqual("Manager");
  });

  it("should reject driver correction if not their route", async () => {
    const [drv2] = await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        name: "Driver 2",
        email: `driver2.${Date.now()}@test.com`,
        role: "driver",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await expect(
      routesService.correctTimestamps(
        routeId,
        stopId,
        { arrivalAt: new Date(), departureAt: null },
        drv2.id,
        false,
      ),
    ).rejects.toThrow(BadRequestError);
  });
});
