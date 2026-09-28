import { describe, expect, it } from "vitest";

import {
  stopDwellSeconds,
  totalDwellSeconds,
  workdayPercentage,
} from "@/lib/route-metrics";

const arrival = new Date("2026-01-01T08:00:00");
const departure = new Date("2026-01-01T09:30:00");

describe("stopDwellSeconds", () => {
  it("computes whole seconds for a non-origin stop", () => {
    expect(
      stopDwellSeconds({
        order: "2",
        arrivalAt: arrival,
        departureAt: departure,
      }),
    ).toBe(5400);
  });

  it("floors sub-second differences", () => {
    expect(
      stopDwellSeconds({
        order: "2",
        arrivalAt: arrival,
        departureAt: new Date(arrival.getTime() + 1500),
      }),
    ).toBe(1);
  });

  it("accepts ISO strings (tRPC wire format)", () => {
    expect(
      stopDwellSeconds({
        order: "2",
        arrivalAt: "2026-01-01T08:00:00",
        departureAt: "2026-01-01T08:01:00",
      }),
    ).toBe(60);
  });

  it("returns undefined for the Origin stop", () => {
    expect(
      stopDwellSeconds({
        order: "1",
        arrivalAt: arrival,
        departureAt: departure,
      }),
    ).toBeUndefined();
  });

  it("returns undefined when either timestamp is missing", () => {
    expect(
      stopDwellSeconds({ order: "2", arrivalAt: null, departureAt: departure }),
    ).toBeUndefined();
    expect(
      stopDwellSeconds({ order: "2", arrivalAt: arrival, departureAt: null }),
    ).toBeUndefined();
  });
});

describe("totalDwellSeconds", () => {
  it("sums defined dwells, skipping origin and incomplete stops", () => {
    expect(
      totalDwellSeconds([
        { order: "1", arrivalAt: arrival, departureAt: departure },
        { order: "2", arrivalAt: arrival, departureAt: departure },
        { order: "3", arrivalAt: arrival, departureAt: null },
      ]),
    ).toBe(5400);
  });
});

describe("workdayPercentage", () => {
  it("computes the ratio in any consistent unit", () => {
    expect(workdayPercentage(120, 480)).toBe(25);
  });

  it("returns 0 when the denominator is not positive", () => {
    expect(workdayPercentage(120, 0)).toBe(0);
    expect(workdayPercentage(120, -1)).toBe(0);
  });
});
