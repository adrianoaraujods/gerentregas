import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSyncDatabase } from "@/lib/sync/db";
import { DexieSyncClient } from "@/lib/sync/sync-client";
import type { SyncBatchItem, SyncBatchOutput } from "@/server/modules/sync";

describe("DexieSyncClient", () => {
  let client: DexieSyncClient;

  beforeEach(() => {
    client = new DexieSyncClient(
      createSyncDatabase(`gerentregas-sync-test-${crypto.randomUUID()}`),
    );
  });

  function acceptingUpload(): {
    calls: SyncBatchItem[][];
    upload: (items: SyncBatchItem[]) => Promise<SyncBatchOutput>;
  } {
    const calls: SyncBatchItem[][] = [];
    const upload = vi.fn(async (items: SyncBatchItem[]) => {
      calls.push(items);
      return {
        accepted: items,
        rejected: [],
        summary: {
          total: items.length,
          accepted: items.length,
          rejected: 0,
        },
      };
    });
    return { calls, upload };
  }

  it("queues an arrival as a pending event without departure", async () => {
    await client.recordArrival("stop-1");

    const event = await client.findByStopId("stop-1");
    expect(event).toMatchObject({
      stopId: "stop-1",
      departure: null,
      status: "pending",
    });
    expect(event?.arrival).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/,
    );
    expect(await client.pendingCount()).toBe(1);
  });

  it("rejects a duplicate arrival for the same stop", async () => {
    await client.recordArrival("stop-1");
    await expect(client.recordArrival("stop-1")).rejects.toThrow(
      /chegada já registrada/i,
    );
  });

  it("completes the event when the departure is recorded", async () => {
    await client.recordArrival("stop-1");
    const updated = await client.recordDeparture("stop-1");

    expect(updated.departure).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/,
    );
    expect(updated.status).toBe("pending");
    expect(await client.list()).toHaveLength(1);
  });

  it("refuses a departure without a queued arrival", async () => {
    await expect(client.recordDeparture("stop-1")).rejects.toThrow(
      /nenhuma chegada registrada/i,
    );
  });

  it("refuses a second departure for the same stop", async () => {
    await client.recordArrival("stop-1");
    await client.recordDeparture("stop-1");
    await expect(client.recordDeparture("stop-1")).rejects.toThrow(
      /saída já registrada/i,
    );
  });

  it("flush sends only complete pending items and removes accepted ones", async () => {
    await client.recordArrival("stop-1");
    await client.recordDeparture("stop-1");
    await client.recordArrival("stop-2");

    const { calls, upload } = acceptingUpload();
    const output = await client.flush(upload);

    expect(upload).toHaveBeenCalledTimes(1);
    expect(calls[0]).toHaveLength(1);
    expect(calls[0][0]).toMatchObject({
      stopId: "stop-1",
      departure: expect.any(String),
    });
    expect(output.summary).toEqual({ total: 1, accepted: 1, rejected: 0 });

    const remaining = await client.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].stopId).toBe("stop-2");
    expect(remaining[0].departure).toBeNull();
  });

  it("returns an empty batch without calling upload when nothing is ready", async () => {
    await client.recordArrival("stop-1");

    const { upload } = acceptingUpload();
    const output = await client.flush(upload);

    expect(upload).not.toHaveBeenCalled();
    expect(output.summary).toEqual({ total: 0, accepted: 0, rejected: 0 });
  });

  it("keeps rejected items with their reason and never resends them until retried", async () => {
    await client.recordArrival("stop-1");
    await client.recordDeparture("stop-1");

    const upload = vi.fn(
      async (items: SyncBatchItem[]): Promise<SyncBatchOutput> => ({
        accepted: [],
        rejected: [
          {
            id: items[0].id,
            stopId: items[0].stopId,
            reason: "STOP_NOT_FOUND",
            message: "Parada não encontrada.",
          },
        ],
        summary: { total: items.length, accepted: 0, rejected: items.length },
      }),
    );

    const output = await client.flush(upload);
    expect(output.rejected).toHaveLength(1);

    const kept = await client.findByStopId("stop-1");
    expect(kept).toMatchObject({
      status: "rejected",
      reason: "STOP_NOT_FOUND",
      message: "Parada não encontrada.",
    });

    const secondUpload = vi.fn(
      async (items: SyncBatchItem[]): Promise<SyncBatchOutput> => ({
        accepted: [],
        rejected: [],
        summary: { total: items.length, accepted: 0, rejected: 0 },
      }),
    );
    await client.flush(secondUpload);
    expect(secondUpload).not.toHaveBeenCalled();

    await client.retry(kept?.id as string);
    const requeued = await client.findByStopId("stop-1");
    expect(requeued?.status).toBe("pending");

    const thirdUpload = acceptingUpload();
    await client.flush(thirdUpload.upload);
    expect(thirdUpload.calls[0]).toHaveLength(1);
    expect(await client.pendingCount()).toBe(0);
  });

  it("allows dismissing a rejected item explicitly", async () => {
    await client.recordArrival("stop-1");
    const [event] = await client.list();
    await client.dismiss(event.id);

    expect(await client.pendingCount()).toBe(0);
    expect(await client.findByStopId("stop-1")).toBeUndefined();
  });

  it("keeps items pending when the upload itself fails", async () => {
    await client.recordArrival("stop-1");
    await client.recordDeparture("stop-1");

    const upload = vi.fn(async () => {
      throw new Error("network down");
    });

    await expect(client.flush(upload)).rejects.toThrow("network down");

    const event = await client.findByStopId("stop-1");
    expect(event?.status).toBe("pending");
    expect(event?.departure).not.toBeNull();
  });
});
