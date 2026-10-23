import { describe, expect, it } from "vitest";
import { buildDriverBars } from "@/components/modules/dashboard/driver-bars";

function stop(
  driverId: string,
  order: string,
  dwellMinutes: number,
  overrides: Partial<{
    stopId: string;
    pointName: string;
    arrivalTime: string | null;
    departureTime: string | null;
  }> = {},
) {
  return {
    stopId: `stop-${driverId}-${order}`,
    routeId: `route-${driverId}`,
    driverId,
    order,
    pointName: `Ponto ${order}`,
    arrivalTime: "2026-10-22T11:00:00.000Z",
    departureTime: "2026-10-22T11:30:00.000Z",
    dwellMinutes,
    workdayPercentage: 0,
    pointId: `point-${order}`,
    address: "Endereço",
    ...overrides,
  };
}

describe("buildDriverBars", () => {
  it("drops the Origin but keeps zero-dwell and unconcluded stops", () => {
    const bars = buildDriverBars(
      [{ driverId: "d1", driverName: "Ana" }],
      [
        stop("d1", "1", 0),
        stop("d1", "2", 45),
        stop("d1", "3", 0, { departureTime: null }),
      ],
    );

    expect(bars).toHaveLength(1);
    expect(bars[0].stops.map((s) => s.order)).toEqual(["2", "3"]);
    expect(bars[0].totalMinutes).toBe(45);
  });

  it("keeps drivers whose route has no stops", () => {
    const bars = buildDriverBars(
      [{ driverId: "d1", driverName: "Ana" }],
      [stop("d1", "1", 0)],
    );

    expect(bars[0].stops).toEqual([]);
    expect(bars[0].totalMinutes).toBe(0);
  });

  it("sorts drivers by total dwell, name breaking ties", () => {
    const bars = buildDriverBars(
      [
        { driverId: "d1", driverName: "Bruno" },
        { driverId: "d2", driverName: "Ana" },
        { driverId: "d3", driverName: "Carla" },
      ],
      [stop("d1", "2", 20), stop("d2", "2", 20), stop("d3", "2", 90)],
    );

    expect(bars.map((b) => b.driverName)).toEqual(["Carla", "Ana", "Bruno"]);
  });
});
