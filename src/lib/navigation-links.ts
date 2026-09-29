export type NavigationStopInput = {
  id: string;
  order: string;
  addressSnapshot: string;
  latitudeSnapshot: number | null | undefined;
  longitudeSnapshot: number | null | undefined;
  departureAt: Date | string | null | undefined;
};

export type NavigationRouteStatus =
  | "draft"
  | "in_flight"
  | "concluded"
  | "cancelled";

export type NavigationLinksOptions = {
  maxWaypoints?: number;
  maxUrlLength?: number;
};

export type PerStopNavigationLink = {
  stopId: string;
  googleUrl: string;
  wazeUrl: string;
  disabled: boolean;
};

export type NavigationLinks = {
  perStop: PerStopNavigationLink[];
  remainingRouteUrls: string[];
};

const DEFAULT_MAX_WAYPOINTS = 8;
const DEFAULT_MAX_URL_LENGTH = 2048;

function hasCoordinates(stop: NavigationStopInput): boolean {
  return (
    stop.latitudeSnapshot !== null &&
    stop.latitudeSnapshot !== undefined &&
    stop.longitudeSnapshot !== null &&
    stop.longitudeSnapshot !== undefined
  );
}

function coordinatesQuery(stop: NavigationStopInput): string {
  return `${stop.latitudeSnapshot},${stop.longitudeSnapshot}`;
}

function locationQuery(stop: NavigationStopInput): string {
  return hasCoordinates(stop)
    ? coordinatesQuery(stop)
    : encodeURIComponent(stop.addressSnapshot);
}

export function perStopGoogleUrl(stop: NavigationStopInput): string {
  return `https://www.google.com/maps/search/?api=1&query=${locationQuery(stop)}`;
}

export function perStopWazeUrl(stop: NavigationStopInput): string {
  if (hasCoordinates(stop)) {
    return `https://www.waze.com/ul?ll=${coordinatesQuery(stop)}&navigate=yes`;
  }
  return `https://www.waze.com/ul?q=${encodeURIComponent(stop.addressSnapshot)}&navigate=yes`;
}

function isConcluded(stop: NavigationStopInput): boolean {
  return stop.departureAt !== null && stop.departureAt !== undefined;
}

function isOrigin(stop: NavigationStopInput): boolean {
  return stop.order === "1";
}

function sortByOrder(stops: NavigationStopInput[]): NavigationStopInput[] {
  return [...stops].sort((a, b) => Number(a.order) - Number(b.order));
}

function buildDirectionsUrl(segments: string[]): string {
  if (segments.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${segments[0]}`;
  }
  const [origin, ...rest] = segments;
  const destination = rest[rest.length - 1];
  const waypoints = rest.slice(0, -1);
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints.length > 0) {
    url += `&waypoints=${waypoints.join("|")}`;
  }
  return url;
}

function exceedsLimits(
  segments: string[],
  maxWaypoints: number,
  maxUrlLength: number,
): boolean {
  if (segments.length >= 2 && segments.length - 2 > maxWaypoints) return true;
  return buildDirectionsUrl(segments).length > maxUrlLength;
}

function chunkPoints(
  segments: string[],
  maxWaypoints: number,
  maxUrlLength: number,
): string[][] {
  if (segments.length === 0) return [];
  const chunks: string[][] = [];
  let current: string[] = [segments[0]];
  for (const segment of segments.slice(1)) {
    const candidate = [...current, segment];
    if (exceedsLimits(candidate, maxWaypoints, maxUrlLength)) {
      chunks.push(current);
      current =
        current.length === 1
          ? [segment]
          : [current[current.length - 1], segment];
    } else {
      current = candidate;
    }
  }
  chunks.push(current);
  return chunks;
}

export function remainingRouteUrls(
  stops: NavigationStopInput[],
  routeStatus: NavigationRouteStatus,
  options: NavigationLinksOptions = {},
): string[] {
  const maxWaypoints = options.maxWaypoints ?? DEFAULT_MAX_WAYPOINTS;
  const maxUrlLength = options.maxUrlLength ?? DEFAULT_MAX_URL_LENGTH;
  const remaining = sortByOrder(stops).filter(
    (stop) =>
      !isConcluded(stop) && (routeStatus === "draft" || !isOrigin(stop)),
  );
  if (remaining.length === 0) return [];
  return chunkPoints(
    remaining.map(locationQuery),
    maxWaypoints,
    maxUrlLength,
  ).map(buildDirectionsUrl);
}

export function buildNavigationLinks(
  stops: NavigationStopInput[],
  routeStatus: NavigationRouteStatus,
  options: NavigationLinksOptions = {},
): NavigationLinks {
  return {
    perStop: sortByOrder(stops).map((stop) => ({
      stopId: stop.id,
      googleUrl: perStopGoogleUrl(stop),
      wazeUrl: perStopWazeUrl(stop),
      disabled: isConcluded(stop),
    })),
    remainingRouteUrls: remainingRouteUrls(stops, routeStatus, options),
  };
}
