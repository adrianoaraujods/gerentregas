export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface Geocoder {
  geocode(address: string): Promise<GeocodeResult | null>;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export class NominatimGeocoder implements Geocoder {
  private readonly userAgent = "gerentregas/1.0";

  async geocode(address: string): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({
      q: address,
      format: "json",
      limit: "1",
      addressdetails: "0",
    });

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  }
}

export function createGeocoder(): Geocoder {
  return new NominatimGeocoder();
}
