import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { user } from "@/server/db/schemas/auth";
import { parameter } from "@/server/db/schemas/parameters";
import { point } from "@/server/db/schemas/points";
import { route, stop } from "@/server/db/schemas/routes";
import { encrypt } from "@/server/lib/crypto";
import { DashboardRepository } from "@/server/modules/dashboard/dashboard.repository";
import { DashboardService } from "@/server/modules/dashboard/dashboard.service";
import type { AggregationOutput } from "@/server/modules/dashboard/dashboard.types";

function isDayAggregation(
  result: AggregationOutput,
): result is AggregationOutput & { periodType: "day" } {
  return result.periodType === "day";
}

function isMonthAggregation(
  result: AggregationOutput,
): result is AggregationOutput & { periodType: "month" } {
  return result.periodType === "month";
}

function isCustomAggregation(
  result: AggregationOutput,
): result is AggregationOutput & { periodType: "custom" } {
  return result.periodType === "custom";
}

describe("DashboardService", () => {
  let dashboardRepository: DashboardRepository;
  let dashboardService: DashboardService;

  let managerId: string;
  let driverId: string;
  let pointId1: string;
  let pointId2: string;
  let pointId3: string;
  let routeId: string;

  beforeEach(async () => {
    dashboardRepository = new DashboardRepository(db);
    dashboardService = new DashboardService(dashboardRepository);

    await db.execute(
      `TRUNCATE TABLE "stop", "route", "point", "user", "parameter" CASCADE`,
    );

    await db.insert(parameter).values({
      id: "system",
      fuelPricePerLiter: 500,
      standardWorkdayDuration: 480,
    });

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

    const testDate = new Date();
    testDate.setHours(8, 0, 0, 0);

    const routeResult = await db
      .insert(route)
      .values({
        managerId,
        driverId,
        vehicleId: null,
        date: testDate,
        status: "concluded",
        currentVersion: "1",
      })
      .returning({ id: route.id });
    routeId = routeResult[0].id;

    const baseTime = new Date(testDate);
    baseTime.setHours(8, 0, 0, 0);

    await db.insert(stop).values([
      {
        routeId,
        pointId: pointId1,
        order: "1",
        addressSnapshot: "Av. Paulista, 1000, São Paulo, SP",
        latitudeSnapshot: -23.5505,
        longitudeSnapshot: -46.6333,
        departureAt: new Date(baseTime.getTime() + 15 * 60000),
      },
      {
        routeId,
        pointId: pointId2,
        order: "2",
        addressSnapshot: "Rua Augusta, 500, São Paulo, SP",
        latitudeSnapshot: -23.5515,
        longitudeSnapshot: -46.6343,
        arrivalAt: new Date(baseTime.getTime() + 30 * 60000),
        departureAt: new Date(baseTime.getTime() + 90 * 60000),
      },
      {
        routeId,
        pointId: pointId3,
        order: "3",
        addressSnapshot: "Rua Oscar Freire, 300, São Paulo, SP",
        latitudeSnapshot: -23.5525,
        longitudeSnapshot: -46.6353,
        arrivalAt: new Date(baseTime.getTime() + 120 * 60000),
        departureAt: new Date(baseTime.getTime() + 180 * 60000),
      },
    ]);
  });

  describe("getStandardWorkdayDuration", () => {
    it("returns the configured workday duration", async () => {
      const result = await dashboardService.getStandardWorkdayDuration();
      expect(result.standardWorkdayDuration).toBe(480);
    });
  });

  describe("getAggregation - day", () => {
    it("returns timeline stops with dwell times for a specific day", async () => {
      const testDate = new Date();
      testDate.setHours(0, 0, 0, 0);

      const result = await dashboardService.getAggregation({
        periodType: "day",
        date: testDate.toISOString(),
      });

      expect(isDayAggregation(result)).toBe(true);
      if (!isDayAggregation(result)) return;

      expect(result.stops).toHaveLength(3);
      expect(result.stops[0].order).toBe("1");
      expect(result.stops[0].dwellMinutes).toBe(0);
      expect(result.stops[1].dwellMinutes).toBe(60);
      expect(result.stops[2].dwellMinutes).toBe(60);
      expect(result.totalDwellMinutes).toBe(120);
      expect(result.workdayPercentage).toBe(25);
    });

    it("returns empty data for day with no routes", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 10);
      futureDate.setHours(0, 0, 0, 0);

      const result = await dashboardService.getAggregation({
        periodType: "day",
        date: futureDate.toISOString(),
      });

      expect(isDayAggregation(result)).toBe(true);
      if (!isDayAggregation(result)) return;

      expect(result.stops).toHaveLength(0);
      expect(result.totalDwellMinutes).toBe(0);
      expect(result.workdayPercentage).toBe(0);
    });
  });

  describe("getAggregation - month", () => {
    it("returns daily aggregations for a month", async () => {
      const testDate = new Date();
      const year = testDate.getFullYear();
      const month = testDate.getMonth() + 1;

      const result = await dashboardService.getAggregation({
        periodType: "month",
        year,
        month,
      });

      expect(isMonthAggregation(result)).toBe(true);
      if (!isMonthAggregation(result)) return;

      expect(result.year).toBe(year);
      expect(result.month).toBe(month);
      expect(result.days).toBeDefined();
      expect(result.totalDwellMinutes).toBe(120);
      expect(result.workdayPercentage).toBe(25);
    });
  });

  describe("getAggregation - custom", () => {
    it("returns daily aggregations for a custom period", async () => {
      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 1);
      dateFrom.setHours(0, 0, 0, 0);

      const dateTo = new Date();
      dateTo.setHours(23, 59, 59, 999);

      const result = await dashboardService.getAggregation({
        periodType: "custom",
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      });

      expect(isCustomAggregation(result)).toBe(true);
      if (!isCustomAggregation(result)) return;

      expect(result.days).toBeDefined();
      expect(result.totalDwellMinutes).toBe(120);
      expect(result.workdayPercentage).toBe(25);
    });
  });

  describe("getDrilldown", () => {
    it("returns detailed stops for a day", async () => {
      const testDate = new Date();
      testDate.setHours(0, 0, 0, 0);

      const result = await dashboardService.getDrilldown({
        periodType: "day",
        date: testDate.toISOString(),
      });

      expect(result.stops.length).toBe(2);
      expect(result.stops[0]).toHaveProperty("routeId");
      expect(result.stops[0]).toHaveProperty("driverName");
      expect(result.stops[0]).toHaveProperty("pointName");
      expect(result.stops[0]).toHaveProperty("address");
      expect(result.stops[0]).toHaveProperty("arrivalTime");
      expect(result.stops[0]).toHaveProperty("departureTime");
      expect(result.stops[0]).toHaveProperty("dwellMinutes");
      expect(result.stops[0]).toHaveProperty("workdayPercentage");
      expect(result.stops[0].dwellMinutes).toBe(60);
      expect(result.stops[1].dwellMinutes).toBe(60);
      expect(result.totalDwellMinutes).toBe(120);
    });
  });

  describe("exportCSV", () => {
    it("generates CSV with correct headers and data", async () => {
      const testDate = new Date();
      testDate.setHours(0, 0, 0, 0);

      const result = await dashboardService.exportCSV({
        periodType: "day",
        date: testDate.toISOString(),
      });

      expect(result.csv).toContain(
        "Data,Motorista,Ordem da Parada,Ponto,Endereço,Chegada,Saída,Tempo Parado (min),% Jornada Padrão",
      );
      expect(result.csv).toContain("Entrega 1");
      expect(result.csv).toContain(",60,12.50");
      expect(result.filename).toMatch(
        /dashboard-export-day-\d{4}-\d{2}-\d{2}\.csv/,
      );
    });
  });
});

describe("DashboardRepository", () => {
  let dashboardRepository: DashboardRepository;
  let managerId: string;
  let driverId: string;
  let pointId1: string;
  let pointId2: string;
  let pointId3: string;
  let routeId: string;
  let testDate: Date;

  beforeEach(async () => {
    dashboardRepository = new DashboardRepository(db);

    await db.execute(
      `TRUNCATE TABLE "stop", "route", "point", "user", "parameter" CASCADE`,
    );

    await db.insert(parameter).values({
      id: "system",
      fuelPricePerLiter: 500,
      standardWorkdayDuration: 480,
    });

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

    testDate = new Date();
    testDate.setHours(8, 0, 0, 0);

    const routeResult = await db
      .insert(route)
      .values({
        managerId,
        driverId,
        vehicleId: null,
        date: testDate,
        status: "concluded",
        currentVersion: "1",
      })
      .returning({ id: route.id });
    routeId = routeResult[0].id;

    const baseTime = new Date(testDate);
    baseTime.setHours(8, 0, 0, 0);

    await db.insert(stop).values([
      {
        routeId,
        pointId: pointId1,
        order: "1",
        addressSnapshot: "Av. Paulista, 1000, São Paulo, SP",
        latitudeSnapshot: -23.5505,
        longitudeSnapshot: -46.6333,
        departureAt: new Date(baseTime.getTime() + 15 * 60000),
      },
      {
        routeId,
        pointId: pointId2,
        order: "2",
        addressSnapshot: "Rua Augusta, 500, São Paulo, SP",
        latitudeSnapshot: -23.5515,
        longitudeSnapshot: -46.6343,
        arrivalAt: new Date(baseTime.getTime() + 30 * 60000),
        departureAt: new Date(baseTime.getTime() + 90 * 60000),
      },
      {
        routeId,
        pointId: pointId3,
        order: "3",
        addressSnapshot: "Rua Oscar Freire, 300, São Paulo, SP",
        latitudeSnapshot: -23.5525,
        longitudeSnapshot: -46.6353,
        arrivalAt: new Date(baseTime.getTime() + 120 * 60000),
        departureAt: new Date(baseTime.getTime() + 180 * 60000),
      },
    ]);
  });

  it("calculates dwell time per stop (RN02) and excludes the origin (RN03)", async () => {
    const queryDate = new Date(testDate);
    queryDate.setHours(0, 0, 0, 0);
    const result = await dashboardRepository.getDayTimeline(queryDate);

    expect(result.stops).toHaveLength(3);
    expect(result.stops[0].order).toBe("1");
    expect(result.stops[0].dwellMinutes).toBe(0);
    expect(result.stops[1].dwellMinutes).toBe(60);
    expect(result.stops[2].dwellMinutes).toBe(60);
    expect(result.totalDwellMinutes).toBe(120);
  });
});
