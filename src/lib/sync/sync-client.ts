import type Dexie from "dexie";
import type { SyncBatchItem, SyncBatchOutput } from "@/server/modules/sync";
import {
  createSyncDatabase,
  type QueuedStopEvent,
  type SyncEventsTable,
} from "./db";

export type { QueuedStopEvent } from "./db";

export type UploadBatchFn = (
  items: SyncBatchItem[],
) => Promise<SyncBatchOutput>;

export interface SyncClient {
  recordArrival(stopId: string, at?: Date): Promise<QueuedStopEvent>;
  recordDeparture(stopId: string, at?: Date): Promise<QueuedStopEvent>;
  findByStopId(stopId: string): Promise<QueuedStopEvent | undefined>;
  list(): Promise<QueuedStopEvent[]>;
  pendingCount(): Promise<number>;
  flush(upload: UploadBatchFn): Promise<SyncBatchOutput>;
  retry(id: string): Promise<void>;
  dismiss(id: string): Promise<void>;
}

function toLocalISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
}

function emptyBatchOutput(): SyncBatchOutput {
  return {
    accepted: [],
    rejected: [],
    summary: { total: 0, accepted: 0, rejected: 0 },
  };
}

export class DexieSyncClient implements SyncClient {
  constructor(private readonly db: Dexie & { events: SyncEventsTable }) {}

  async recordArrival(
    stopId: string,
    at = new Date(),
  ): Promise<QueuedStopEvent> {
    const existing = await this.findByStopId(stopId);
    if (existing) {
      throw new Error("Chegada já registrada na fila para esta parada.");
    }

    const event: QueuedStopEvent = {
      id: crypto.randomUUID(),
      stopId,
      arrival: toLocalISO(at),
      departure: null,
      status: "pending",
      createdAt: toLocalISO(new Date()),
    };
    await this.db.events.add(event);
    return event;
  }

  async recordDeparture(
    stopId: string,
    at = new Date(),
  ): Promise<QueuedStopEvent> {
    const existing = await this.findByStopId(stopId);
    if (!existing) {
      throw new Error("Nenhuma chegada registrada na fila para esta parada.");
    }
    if (existing.departure) {
      throw new Error("Saída já registrada na fila para esta parada.");
    }

    const updated: QueuedStopEvent = {
      ...existing,
      departure: toLocalISO(at),
    };
    await this.db.events.put(updated);
    return updated;
  }

  async findByStopId(stopId: string): Promise<QueuedStopEvent | undefined> {
    return this.db.events.where("stopId").equals(stopId).first();
  }

  async list(): Promise<QueuedStopEvent[]> {
    return this.db.events.orderBy("createdAt").toArray();
  }

  async pendingCount(): Promise<number> {
    return this.db.events.count();
  }

  async flush(upload: UploadBatchFn): Promise<SyncBatchOutput> {
    const events = await this.db.events
      .where("status")
      .equals("pending")
      .toArray();
    const ready = events.filter((event) => event.departure !== null);
    if (ready.length === 0) {
      return emptyBatchOutput();
    }

    const items: SyncBatchItem[] = ready.map((event) => ({
      id: event.id,
      stopId: event.stopId,
      arrival: event.arrival,
      departure: event.departure as string,
    }));

    const output = await upload(items);
    const acceptedIds = new Set(output.accepted.map((item) => item.id));

    await this.db.transaction("rw", this.db.events, async () => {
      for (const id of acceptedIds) {
        await this.db.events.delete(id);
      }
      for (const rejected of output.rejected) {
        const event = await this.db.events.get(rejected.id);
        if (!event) continue;
        await this.db.events.put({
          ...event,
          status: "rejected",
          reason: rejected.reason,
          message: rejected.message,
        });
      }
    });

    return output;
  }

  async retry(id: string): Promise<void> {
    const event = await this.db.events.get(id);
    if (!event) return;
    await this.db.events.put({
      ...event,
      status: "pending",
      reason: undefined,
      message: undefined,
    });
  }

  async dismiss(id: string): Promise<void> {
    await this.db.events.delete(id);
  }
}

export const driverSyncClient = new DexieSyncClient(createSyncDatabase());
