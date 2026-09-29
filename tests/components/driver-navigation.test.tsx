import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  RemainingRouteActions,
  StopNavigationActions,
} from "@/components/modules/driver/stop-navigation-actions";
import { toNavigationStopInput } from "@/lib/driver-navigation";
import {
  buildNavigationLinks,
  type NavigationStopInput,
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

const origin = stop({ id: "origin", order: "1" });
const stopA = stop({
  id: "stop-a",
  order: "2",
  addressSnapshot: "Rua A, 10",
  latitudeSnapshot: -23.55052,
  longitudeSnapshot: -46.633308,
});
const stopB = stop({ id: "stop-b", order: "3", addressSnapshot: "Rua B, 3" });
const concluded = stop({
  id: "stop-c",
  order: "4",
  addressSnapshot: "Rua C, 4",
  departureAt: new Date("2026-01-01T08:00:00"),
});

describe("StopNavigationActions", () => {
  it("renders per-stop Google and Waze anchors built from the link builder", () => {
    const links = buildNavigationLinks(
      [origin, stopA, stopB, concluded],
      "in_flight",
    );
    const link = links.perStop.find((l) => l.stopId === "stop-a");
    expect(link?.disabled).toBe(false);

    const html = renderToStaticMarkup(
      <StopNavigationActions
        googleUrl={link?.googleUrl ?? ""}
        wazeUrl={link?.wazeUrl ?? ""}
        disabled={false}
        stopLabel="Rua A, 10"
      />,
    );

    expect(html).toContain(
      `href="${link?.googleUrl.replaceAll("&", "&amp;")}"`,
    );
    expect(html).toContain(`href="${link?.wazeUrl.replaceAll("&", "&amp;")}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain("Google Maps");
    expect(html).toContain("Waze");
  });

  it("shows concluded stops disabled, not hidden", () => {
    const links = buildNavigationLinks(
      [origin, stopA, stopB, concluded],
      "in_flight",
    );
    const link = links.perStop.find((l) => l.stopId === "stop-c");
    expect(link?.disabled).toBe(true);

    const html = renderToStaticMarkup(
      <StopNavigationActions
        googleUrl={link?.googleUrl ?? ""}
        wazeUrl={link?.wazeUrl ?? ""}
        disabled
        stopLabel="Rua C, 4"
      />,
    );

    expect(html).toContain("Google Maps");
    expect(html).toContain("Waze");
    expect(html).toContain("disabled");
    expect(html).toContain("parada concluída");
    expect(html).not.toContain("href=");
  });
});

describe("RemainingRouteActions", () => {
  it("renders one main remaining-route action with follow-up chunk links", () => {
    const stops = ["2", "3", "4", "5", "6"].map((order, i) =>
      stop({ id: `s${i}`, order, addressSnapshot: `Rua ${order}` }),
    );
    const links = buildNavigationLinks(stops, "in_flight", {
      maxWaypoints: 1,
    });
    expect(links.remainingRouteUrls.length).toBeGreaterThan(1);

    const html = renderToStaticMarkup(
      <RemainingRouteActions urls={links.remainingRouteUrls} />,
    );

    for (const url of links.remainingRouteUrls) {
      expect(html).toContain(`href="${url.replaceAll("&", "&amp;")}"`);
    }
    expect(html).toContain("rota restante");
    expect(html).toContain("Trecho 2");
  });

  it("covers remaining-only stops: origin excluded after shift start, concluded excluded", () => {
    const links = buildNavigationLinks(
      [origin, stopA, stopB, concluded],
      "in_flight",
    );

    expect(links.remainingRouteUrls).toHaveLength(1);
    expect(links.remainingRouteUrls[0]).toContain("-23.55052,-46.633308");
    expect(links.remainingRouteUrls[0]).toContain("Rua%20B%2C%203");
    expect(links.remainingRouteUrls[0]).not.toContain("Flores");
    expect(links.remainingRouteUrls[0]).not.toContain("Rua%20C%2C%204");

    const html = renderToStaticMarkup(
      <RemainingRouteActions urls={links.remainingRouteUrls} />,
    );
    expect(html).toContain(
      `href="${links.remainingRouteUrls[0].replaceAll("&", "&amp;")}"`,
    );
  });

  it("renders nothing when no stops remain", () => {
    const html = renderToStaticMarkup(<RemainingRouteActions urls={[]} />);
    expect(html).toBe("");
  });
});

describe("toNavigationStopInput", () => {
  it("passes snapshot fields through with no queued override", () => {
    expect(toNavigationStopInput(stopA)).toMatchObject({
      id: "stop-a",
      order: "2",
      addressSnapshot: "Rua A, 10",
      latitudeSnapshot: -23.55052,
      longitudeSnapshot: -46.633308,
      departureAt: null,
    });
  });

  it("treats a queued offline departure as concluded for nav state", () => {
    const pending = stop({ id: "stop-b", order: "3" });
    const withQueuedDeparture = toNavigationStopInput(
      pending,
      "2026-09-29T10:00:00",
    );
    const links = buildNavigationLinks([withQueuedDeparture], "in_flight");
    expect(links.perStop[0]).toMatchObject({
      stopId: "stop-b",
      disabled: true,
    });
    expect(links.remainingRouteUrls).toEqual([]);

    const stillOpen = toNavigationStopInput(pending, null);
    const openLinks = buildNavigationLinks([stillOpen], "in_flight");
    expect(openLinks.perStop[0]).toMatchObject({
      stopId: "stop-b",
      disabled: false,
    });
    expect(openLinks.remainingRouteUrls).toHaveLength(1);
  });
});

describe("navigation handoff zero-write contract", () => {
  it("enabled state renders external anchors only: no buttons, no forms, no handlers", () => {
    const html = renderToStaticMarkup(
      <div>
        <StopNavigationActions
          googleUrl="https://www.google.com/maps/search/?api=1&query=x"
          wazeUrl="https://www.waze.com/ul?q=x&navigate=yes"
          disabled={false}
          stopLabel="Rua A, 10"
        />
        <RemainingRouteActions
          urls={["https://www.google.com/maps/dir/?api=1&destination=x"]}
        />
      </div>,
    );

    expect(html).not.toContain("<button");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("onClick");
  });

  it("disabled state renders handler-free disabled buttons only", () => {
    const html = renderToStaticMarkup(
      <StopNavigationActions
        googleUrl="https://www.google.com/maps/search/?api=1&query=x"
        wazeUrl="https://www.waze.com/ul?q=x&navigate=yes"
        disabled
        stopLabel="Rua C, 4"
      />,
    );

    expect(html).not.toContain("href=");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("onClick");
    const buttonTags = html.match(/<button\b[^>]*>/g) ?? [];
    expect(buttonTags.length).toBeGreaterThan(0);
    for (const tag of buttonTags) {
      expect(tag).toContain("disabled");
    }
  });

  it("imports no mutation, API, or sync-queue code", () => {
    const source = readFileSync(
      "src/components/modules/driver/stop-navigation-actions.tsx",
      "utf8",
    );
    for (const token of [
      "useMutation",
      "mutate",
      "recordArrival",
      "recordDeparture",
      "useSyncQueue",
      "flush",
      "queue",
      "api.",
      "fetch(",
    ]) {
      expect(source).not.toContain(token);
    }
  });
});
