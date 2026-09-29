import { describe, expect, it } from "vitest";

import {
  buildRouteMapViewModel,
  type RouteMapStopInput,
} from "@/lib/route-map";

function stop(
  overrides: Partial<RouteMapStopInput> & { id: string; order: string },
): RouteMapStopInput {
  return {
    addressSnapshot: "Rua das Flores, 123 - São Paulo",
    latitudeSnapshot: -23.55052,
    longitudeSnapshot: -46.633308,
    arrivalAt: null,
    departureAt: null,
    ...overrides,
  };
}

const origin = stop({ id: "origin", order: "1" });
const pendingA = stop({
  id: "stop-a",
  order: "2",
  addressSnapshot: "Rua A, 10",
});
const pendingB = stop({
  id: "stop-b",
  order: "3",
  addressSnapshot: "Rua B, 3",
});
const concluded = stop({
  id: "stop-c",
  order: "4",
  addressSnapshot: "Rua C, 4",
  arrivalAt: new Date("2026-01-01T08:00:00"),
  departureAt: new Date("2026-01-01T08:05:30"),
  dwellSeconds: 330,
});

describe("buildRouteMapViewModel marker states", () => {
  it("marks the Origin distinct and never carries Dwell time", () => {
    const departedOrigin = stop({
      id: "origin",
      order: "1",
      departureAt: new Date("2026-01-01T07:00:00"),
    });
    const result = buildRouteMapViewModel(
      [departedOrigin, pendingA],
      null,
      "in_flight",
    );
    expect(result.markers[0]).toMatchObject({
      stopId: "origin",
      state: "origin",
      dwellSeconds: undefined,
      dwellLabel: null,
    });
  });

  it("marks the first open Stop current in flight and the rest pending", () => {
    const result = buildRouteMapViewModel(
      [origin, pendingA, pendingB, concluded],
      null,
      "in_flight",
    );
    const byId = new Map(result.markers.map((m) => [m.stopId, m]));
    expect(byId.get("origin")?.state).toBe("origin");
    expect(byId.get("stop-a")?.state).toBe("current");
    expect(byId.get("stop-b")?.state).toBe("pending");
    expect(byId.get("stop-c")?.state).toBe("concluded");
  });

  it("marks every open Stop pending while in draft (no current)", () => {
    const result = buildRouteMapViewModel(
      [origin, pendingA, pendingB],
      null,
      "draft",
    );
    const byId = new Map(result.markers.map((m) => [m.stopId, m]));
    expect(byId.get("stop-a")?.state).toBe("pending");
    expect(byId.get("stop-b")?.state).toBe("pending");
  });
});

describe("buildRouteMapViewModel Dwell time", () => {
  it("shows Dwell time beside concluded markers when known", () => {
    const result = buildRouteMapViewModel(
      [origin, concluded],
      null,
      "in_flight",
    );
    expect(result.markers.find((m) => m.stopId === "stop-c")).toMatchObject({
      state: "concluded",
      dwellSeconds: 330,
      dwellLabel: "5 min 30 s",
    });
  });

  it("shows no Dwell label for concluded Stops with unknown Dwell time", () => {
    const unknown = stop({
      id: "stop-c",
      order: "4",
      departureAt: new Date("2026-01-01T08:00:00"),
      dwellSeconds: undefined,
    });
    const result = buildRouteMapViewModel([origin, unknown], null, "in_flight");
    expect(result.markers.find((m) => m.stopId === "stop-c")).toMatchObject({
      state: "concluded",
      dwellLabel: null,
    });
  });
});

describe("buildRouteMapViewModel ungeocoded side list", () => {
  it("lists Stops without coordinates beside the map and never pins them", () => {
    const ungeocoded = stop({
      id: "stop-x",
      order: "3",
      addressSnapshot: "Rua sem coordenada, 99",
      latitudeSnapshot: null,
      longitudeSnapshot: null,
    });
    const result = buildRouteMapViewModel(
      [origin, pendingA, ungeocoded],
      null,
      "in_flight",
    );
    expect(result.ungeocoded).toHaveLength(1);
    expect(result.ungeocoded[0]).toMatchObject({
      stopId: "stop-x",
      order: "3",
    });
    expect(result.markers.map((m) => m.stopId)).not.toContain("stop-x");
    expect(result.markers.map((m) => m.stopId)).toEqual(["origin", "stop-a"]);
  });
});

describe("buildRouteMapViewModel geometry", () => {
  it("maps GeoJSON lng/lat road geometry to Leaflet lat/lng polyline", () => {
    const result = buildRouteMapViewModel(
      [origin, pendingA],
      {
        type: "LineString",
        coordinates: [
          [-46.633308, -23.55052],
          [-46.634, -23.551],
        ],
      },
      "in_flight",
    );
    expect(result.polyline).toEqual([
      [-23.55052, -46.633308],
      [-23.551, -46.634],
    ]);
    expect(result.hasGeometry).toBe(true);
  });

  it("degrades to markers-only when geometry is missing", () => {
    const result = buildRouteMapViewModel(
      [origin, pendingA],
      null,
      "in_flight",
    );
    expect(result.polyline).toBeNull();
    expect(result.hasGeometry).toBe(false);
    expect(result.markers).toHaveLength(2);
  });
});
