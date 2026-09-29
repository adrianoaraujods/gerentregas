import type { NavigationStopInput } from "@/lib/navigation-links";

type StopSnapshot = {
  id: string;
  order: string;
  addressSnapshot: string;
  latitudeSnapshot: number | null | undefined;
  longitudeSnapshot: number | null | undefined;
  departureAt: Date | string | null | undefined;
};

export function toNavigationStopInput(
  stop: StopSnapshot,
  queuedDeparture?: string | null,
): NavigationStopInput {
  return {
    id: stop.id,
    order: stop.order,
    addressSnapshot: stop.addressSnapshot,
    latitudeSnapshot: stop.latitudeSnapshot,
    longitudeSnapshot: stop.longitudeSnapshot,
    departureAt: queuedDeparture ?? stop.departureAt,
  };
}
