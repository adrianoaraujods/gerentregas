import type { SyncRepository } from "./sync.repository";
import {
  type SyncBatchInput,
  type SyncBatchItem,
  type SyncBatchOutput,
  type SyncRejectedItem,
  type SyncRejectionReason,
  syncRejectionMessages,
} from "./sync.types";

type StopWithRoute = NonNullable<
  Awaited<ReturnType<SyncRepository["findStopWithRoute"]>>
>;

function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export class SyncService {
  constructor(private readonly repository: SyncRepository) {}

  async uploadBatch(
    input: SyncBatchInput,
    driverId: string,
  ): Promise<SyncBatchOutput> {
    const accepted: SyncBatchOutput["accepted"] = [];
    const rejected: SyncRejectedItem[] = [];
    const processedStopIds = new Set<string>();

    for (const item of input.items) {
      const arrival = new Date(item.arrival);
      const departure = new Date(item.departure);

      if (processedStopIds.has(item.stopId)) {
        rejected.push(
          this.buildRejection(item, "DUPLICATE_ARRIVAL_ON_CLOSED_STOP"),
        );
        continue;
      }

      const validation = await this.validateItem(
        item,
        arrival,
        departure,
        driverId,
      );
      if (!validation.ok) {
        rejected.push(this.buildRejection(item, validation.reason));
        continue;
      }

      await this.repository.updateStopArrival(item.stopId, arrival);
      await this.repository.updateStopDeparture(item.stopId, departure);

      processedStopIds.add(item.stopId);

      await this.transitionRouteStatus(validation.state.route.id);

      accepted.push({
        id: item.id,
        stopId: item.stopId,
        arrival: item.arrival,
        departure: item.departure,
      });
    }

    return {
      accepted,
      rejected,
      summary: {
        total: input.items.length,
        accepted: accepted.length,
        rejected: rejected.length,
      },
    };
  }

  private buildRejection(
    item: SyncBatchItem,
    reason: SyncRejectionReason,
  ): SyncRejectedItem {
    return {
      id: item.id,
      stopId: item.stopId,
      reason,
      message: syncRejectionMessages[reason],
    };
  }

  private async validateItem(
    item: SyncBatchItem,
    arrival: Date,
    departure: Date,
    driverId: string,
  ): Promise<
    | { ok: true; state: StopWithRoute }
    | { ok: false; reason: SyncRejectionReason }
  > {
    if (departure.getTime() <= arrival.getTime()) {
      return { ok: false, reason: "DEPARTURE_BEFORE_ARRIVAL" };
    }

    const now = Date.now();
    if (arrival.getTime() > now || departure.getTime() > now) {
      return { ok: false, reason: "FUTURE_TIMESTAMP" };
    }

    const state = await this.repository.findStopWithRoute(item.stopId);
    if (!state) {
      return { ok: false, reason: "STOP_NOT_FOUND" };
    }

    if (state.route.driverId !== driverId) {
      return { ok: false, reason: "STOP_NOT_IN_DRIVER_ROUTE" };
    }

    if (!state.route.id) {
      return { ok: false, reason: "ROUTE_NOT_FOUND" };
    }

    if (state.route.status !== "in_flight") {
      return { ok: false, reason: "ROUTE_NOT_IN_FLIGHT" };
    }

    if (
      !isSameLocalDate(arrival, state.route.date) ||
      !isSameLocalDate(departure, state.route.date)
    ) {
      return { ok: false, reason: "TIMESTAMP_OFF_ROUTE_DATE" };
    }

    if (state.stop.concludedAt) {
      return { ok: false, reason: "DUPLICATE_ARRIVAL_ON_CLOSED_STOP" };
    }

    return { ok: true, state };
  }

  private async transitionRouteStatus(routeId: string): Promise<void> {
    const status = await this.repository.findRouteStatus(routeId);
    if (!status) return;

    if (status === "draft") {
      await this.repository.updateRouteStatus(routeId, "in_flight");
    }

    const openStops = await this.repository.countOpenStops(routeId);
    if (status === "in_flight" && openStops === 0) {
      await this.repository.updateRouteStatus(routeId, "concluded");
    }
  }
}
