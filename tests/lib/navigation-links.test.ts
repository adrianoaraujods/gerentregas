import { describe, expect, it } from "vitest";

import {
  buildNavigationLinks,
  type NavigationStopInput,
  perStopGoogleUrl,
  perStopWazeUrl,
  remainingRouteUrls,
} from "@/lib/navigation-links";

function stop(
  overrides: Partial<NavigationStopInput> & { id: string; order: string },
): NavigationStopInput {
  return {
    addressSnapshot: "Rua das Flores, 123 - São Paulo",
    latitudeSnapshot: null,
    longitudeSnapshot: null,
    departureAt: null,
    ...overrides,
  };
}

const coordStop = stop({
  id: "s1",
  order: "2",
  latitudeSnapshot: -23.55052,
  longitudeSnapshot: -46.633308,
});

describe("perStopGoogleUrl", () => {
  it("uses lat,lng when coordinates exist", () => {
    expect(perStopGoogleUrl(coordStop)).toBe(
      "https://www.google.com/maps/search/?api=1&query=-23.55052,-46.633308",
    );
  });

  it("falls back to the encoded address query without coordinates", () => {
    expect(
      perStopGoogleUrl(
        stop({ id: "s2", order: "2", addressSnapshot: "Rua A, 10" }),
      ),
    ).toBe("https://www.google.com/maps/search/?api=1&query=Rua%20A%2C%2010");
  });
});

describe("perStopWazeUrl", () => {
  it("uses the single-destination navigate URL with ll when coordinates exist", () => {
    expect(perStopWazeUrl(coordStop)).toBe(
      "https://www.waze.com/ul?ll=-23.55052,-46.633308&navigate=yes",
    );
  });

  it("falls back to the encoded address query without coordinates", () => {
    expect(
      perStopWazeUrl(
        stop({ id: "s2", order: "2", addressSnapshot: "Rua A, 10" }),
      ),
    ).toBe("https://www.waze.com/ul?q=Rua%20A%2C%2010&navigate=yes");
  });
});

describe("buildNavigationLinks", () => {
  it("flags concluded stops disabled for per-stop buttons", () => {
    const result = buildNavigationLinks(
      [
        stop({
          id: "o",
          order: "1",
          departureAt: new Date("2026-01-01T08:00:00"),
        }),
        stop({ id: "a", order: "2" }),
      ],
      "in_flight",
    );
    expect(result.perStop).toHaveLength(2);
    expect(result.perStop[0]).toMatchObject({ stopId: "o", disabled: true });
    expect(result.perStop[1]).toMatchObject({ stopId: "a", disabled: false });
  });

  it("keeps the Origin in the remaining route while in draft", () => {
    const urls = remainingRouteUrls(
      [stop({ id: "o", order: "1" }), stop({ id: "a", order: "2" })],
      "draft",
    );
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("origin=");
  });

  it("excludes the Origin and concluded stops once the route left draft, preserving order", () => {
    const urls = remainingRouteUrls(
      [
        stop({ id: "o", order: "1" }),
        stop({
          id: "a",
          order: "2",
          departureAt: new Date("2026-01-01T08:00:00"),
        }),
        stop({ id: "b", order: "3", addressSnapshot: "Rua B, 3" }),
        stop({ id: "c", order: "4", addressSnapshot: "Rua C, 4" }),
      ],
      "in_flight",
    );
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe(
      `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent("Rua B, 3")}&destination=${encodeURIComponent("Rua C, 4")}`,
    );
  });

  it("emits a single-destination URL when one stop remains", () => {
    expect(
      remainingRouteUrls([stop({ id: "a", order: "2" })], "in_flight"),
    ).toEqual([
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Rua das Flores, 123 - São Paulo")}`,
    ]);
  });

  it("returns no remaining-route URL when nothing remains", () => {
    expect(
      remainingRouteUrls(
        [stop({ id: "a", order: "2", departureAt: new Date() })],
        "in_flight",
      ),
    ).toEqual([]);
  });

  it("splits past the waypoint count into ordered follow-up chunks", () => {
    const stops = ["2", "3", "4", "5", "6"].map((order, i) =>
      stop({ id: `s${i}`, order, addressSnapshot: `Rua ${order}` }),
    );
    expect(remainingRouteUrls(stops, "in_flight", { maxWaypoints: 1 })).toEqual(
      [
        "https://www.google.com/maps/dir/?api=1&origin=Rua%202&destination=Rua%204&waypoints=Rua%203",
        "https://www.google.com/maps/dir/?api=1&origin=Rua%204&destination=Rua%206&waypoints=Rua%205",
      ],
    );
  });

  it("splits past the character cap into ordered follow-up chunks", () => {
    const addresses = [2, 3, 4].map(
      (n) =>
        `Avenida de Nome Extremamente Longo Número ${n}, Bairro Distante, Cidade Grande, Estado`,
    );
    const stops = addresses.map((addressSnapshot, i) =>
      stop({ id: `s${i}`, order: String(i + 2), addressSnapshot }),
    );
    expect(
      remainingRouteUrls(stops, "in_flight", { maxUrlLength: 150 }),
    ).toEqual(
      addresses.map(
        (address) =>
          `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
      ),
    );
  });
});
