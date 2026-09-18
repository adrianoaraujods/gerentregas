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

    for (const item of input.items) {
      const arrival = new Date(item.arrival);
      const departure = new Date(item.departure);

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

      const closed = await this.repository.concludeStopIfOpen(
        item.stopId,
        departure,
      );
      if (!closed) {
        rejected.push(this.buildRejection(item, "stop_already_closed"));
        continue;
      }

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
      return { ok: false, reason: "departure_before_arrival" };
    }

    const now = Date.now();
    if (arrival.getTime() > now || departure.getTime() > now) {
      return { ok: false, reason: "future_timestamp" };
    }

    const state = await this.repository.findStopWithRoute(item.stopId);
    if (!state || state.route.driverId !== driverId) {
      return { ok: false, reason: "stop_not_in_route" };
    }

    if (
      !isSameLocalDate(arrival, state.route.date) ||
      !isSameLocalDate(departure, state.route.date)
    ) {
      return { ok: false, reason: "off_route_date" };
    }

    if (state.stop.concludedAt) {
      return { ok: false, reason: "stop_already_closed" };
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
    if ((status === "draft" || status === "in_flight") && openStops === 0) {
      await this.repository.updateRouteStatus(routeId, "concluded");
    }
  }
}
