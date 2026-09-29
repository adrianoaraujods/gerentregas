import { formatDwellSeconds } from "@/lib/route-metrics";

export type RouteMapStopInput = {
  id: string;
  order: string;
  addressSnapshot: string;
  latitudeSnapshot: number | null | undefined;
  longitudeSnapshot: number | null | undefined;
  arrivalAt: Date | string | null | undefined;
  departureAt: Date | string | null | undefined;
  dwellSeconds?: number | null | undefined;
};

export type RouteMapStatus = "draft" | "in_flight" | "concluded" | "cancelled";

export type RouteMapGeometryInput = {
  type: "LineString";
  coordinates: Array<[number, number]>;
} | null;

export type RouteMapMarkerState =
  | "origin"
  | "pending"
  | "current"
  | "concluded";

export type RouteMapMarker = {
  stopId: string;
  order: string;
  state: RouteMapMarkerState;
  position: [number, number];
  label: string;
  dwellSeconds?: number;
  dwellLabel: string | null;
};

export type RouteMapUngeocoded = {
  stopId: string;
  order: string;
  label: string;
};

export type RouteMapViewModel = {
  markers: RouteMapMarker[];
  ungeocoded: RouteMapUngeocoded[];
  polyline: Array<[number, number]> | null;
  hasGeometry: boolean;
};

export const ROUTE_MAP_STATE_META: Record<
  RouteMapMarkerState,
  { label: string; dotClass: string; pinColor: string }
> = {
  origin: { label: "Origem", dotClass: "bg-violet-600", pinColor: "#7c3aed" },
  pending: { label: "Pendente", dotClass: "bg-amber-500", pinColor: "#f59e0b" },
  current: { label: "Atual", dotClass: "bg-blue-600", pinColor: "#2563eb" },
  concluded: {
    label: "Concluída",
    dotClass: "bg-emerald-600",
    pinColor: "#059669",
  },
};

function isOrigin(stop: RouteMapStopInput): boolean {
  return stop.order === "1";
}

function isConcluded(stop: RouteMapStopInput): boolean {
  return stop.departureAt !== null && stop.departureAt !== undefined;
}

function hasCoordinates(stop: RouteMapStopInput): boolean {
  return (
    stop.latitudeSnapshot !== null &&
    stop.latitudeSnapshot !== undefined &&
    stop.longitudeSnapshot !== null &&
    stop.longitudeSnapshot !== undefined
  );
}

function sortByOrder(stops: RouteMapStopInput[]): RouteMapStopInput[] {
  return [...stops].sort((a, b) => Number(a.order) - Number(b.order));
}

export const formatRouteMapDwell = formatDwellSeconds;

function currentStopId(
  ordered: RouteMapStopInput[],
  status: RouteMapStatus,
): string | null {
  if (status !== "in_flight") return null;
  const open = ordered.find((stop) => !isOrigin(stop) && !isConcluded(stop));
  return open ? open.id : null;
}

export function buildRouteMapViewModel(
  stops: RouteMapStopInput[],
  geometry: RouteMapGeometryInput | undefined,
  status: RouteMapStatus,
): RouteMapViewModel {
  const ordered = sortByOrder(stops);
  const currentId = currentStopId(ordered, status);

  const markers: RouteMapMarker[] = [];
  const ungeocoded: RouteMapUngeocoded[] = [];

  for (const stop of ordered) {
    if (!hasCoordinates(stop)) {
      ungeocoded.push({
        stopId: stop.id,
        order: stop.order,
        label: stop.addressSnapshot,
      });
      continue;
    }
    const state: RouteMapMarkerState = isOrigin(stop)
      ? "origin"
      : isConcluded(stop)
        ? "concluded"
        : stop.id === currentId
          ? "current"
          : "pending";
    const dwellSeconds =
      state === "concluded" ? (stop.dwellSeconds ?? undefined) : undefined;
    markers.push({
      stopId: stop.id,
      order: stop.order,
      state,
      position: [
        stop.latitudeSnapshot as number,
        stop.longitudeSnapshot as number,
      ],
      label: stop.addressSnapshot,
      dwellSeconds,
      dwellLabel:
        state === "concluded" ? formatRouteMapDwell(dwellSeconds) : null,
    });
  }

  const polyline =
    geometry && geometry.type === "LineString"
      ? geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
      : null;

  return { markers, ungeocoded, polyline, hasGeometry: polyline !== null };
}
