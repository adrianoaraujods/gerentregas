import Dexie, { type EntityTable } from "dexie";

export type QueuedStopEventStatus = "pending" | "rejected";

export interface QueuedStopEvent {
  id: string;
  stopId: string;
  arrival: string;
  departure: string | null;
  status: QueuedStopEventStatus;
  reason?: string;
  message?: string;
  createdAt: string;
}

export type SyncEventsTable = EntityTable<QueuedStopEvent, "id">;

export function createSyncDatabase(name = "gerentregas-sync") {
  const db = new Dexie(name) as Dexie & { events: SyncEventsTable };
  db.version(1).stores({
    events: "id, stopId, status, createdAt",
  });
  return db;
}
