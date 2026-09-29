export interface OsrmCoordinate {
  longitude: number;
  latitude: number;
}

export interface OsrmRouteGeometry {
  type: "LineString";
  coordinates: Array<[number, number]>;
}

export interface OsrmClient {
  routeLegDistancesKm(coordinates: OsrmCoordinate[]): Promise<number[]>;
  routeGeometry(
    coordinates: OsrmCoordinate[],
  ): Promise<OsrmRouteGeometry | null>;
}

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

export class PublicOsrmClient implements OsrmClient {
  private readonly userAgent = "gerentregas/1.0";

  async routeLegDistancesKm(coordinates: OsrmCoordinate[]): Promise<number[]> {
    if (coordinates.length < 2) {
      return [];
    }

    const coordinatesParam = coordinates
      .map((c) => `${c.longitude.toFixed(6)},${c.latitude.toFixed(6)}`)
      .join(";");

    const params = new URLSearchParams({
      overview: "false",
      steps: "false",
      annotations: "distance",
    });

    const response = await fetch(`${OSRM_URL}/${coordinatesParam}?${params}`, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OSRM request failed with status ${response.status}`);
    }

    const data: unknown = await response.json();
    const routes = (data as { routes?: unknown })?.routes;
    const firstRoute = Array.isArray(routes) ? routes[0] : undefined;
    const legs = (firstRoute as { legs?: unknown })?.legs;

    if (!Array.isArray(legs)) {
      throw new Error("OSRM response did not include a route");
    }

    return legs.map(
      (leg) => ((leg as { distance?: number }).distance ?? 0) / 1000,
    );
  }

  async routeGeometry(
    coordinates: OsrmCoordinate[],
  ): Promise<OsrmRouteGeometry | null> {
    if (coordinates.length < 2) {
      return null;
    }

    const coordinatesParam = coordinates
      .map((c) => `${c.longitude.toFixed(6)},${c.latitude.toFixed(6)}`)
      .join(";");

    const params = new URLSearchParams({
      overview: "full",
      geometries: "geojson",
      steps: "false",
    });

    const response = await fetch(`${OSRM_URL}/${coordinatesParam}?${params}`, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OSRM request failed with status ${response.status}`);
    }

    const data: unknown = await response.json();
    const routes = (data as { routes?: unknown })?.routes;
    const firstRoute = Array.isArray(routes) ? routes[0] : undefined;
    const geometry = (firstRoute as { geometry?: unknown })?.geometry;

    if (
      !geometry ||
      typeof geometry !== "object" ||
      (geometry as { type?: unknown }).type !== "LineString" ||
      !Array.isArray((geometry as { coordinates?: unknown }).coordinates)
    ) {
      throw new Error("OSRM response did not include route geometry");
    }

    return geometry as OsrmRouteGeometry;
  }
}

export function createOsrmClient(): OsrmClient {
  return new PublicOsrmClient();
}
