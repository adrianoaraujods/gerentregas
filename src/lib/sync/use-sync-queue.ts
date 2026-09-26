"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import {
  driverSyncClient,
  type QueuedStopEvent,
  type SyncClient,
} from "./sync-client";

export function useSyncQueue(client: SyncClient = driverSyncClient) {
  const utils = api.useUtils();
  const uploadBatchMutation = api.sync.uploadBatch.useMutation();
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedStopEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const clientRef = useRef(client);
  clientRef.current = client;
  const uploadRef = useRef(uploadBatchMutation.mutateAsync);
  uploadRef.current = uploadBatchMutation.mutateAsync;

  const refresh = useCallback(async () => {
    setQueue(await clientRef.current.list());
  }, []);

  const flush = useCallback(async () => {
    const pending = await clientRef.current.pendingCount();
    if (pending === 0) return;
    setIsSyncing(true);
    try {
      const output = await clientRef.current.flush((items) =>
        uploadRef.current({ items }),
      );
      if (output.summary.total === 0) return;
      if (output.rejected.length > 0) {
        toast.error(
          `Sincronização: ${output.summary.accepted} aceitos, ${output.summary.rejected} rejeitados`,
          { description: output.rejected.map((r) => r.message).join(" • ") },
        );
      } else {
        toast.success(
          `Sincronização concluída: ${output.summary.accepted} registros enviados.`,
        );
      }
      await utils.routes.getMyRouteWithDwell.invalidate();
    } catch (error) {
      toast.error("Falha ao sincronizar. Os registros permanecem na fila.");
      console.error("sync flush failed:", error);
    } finally {
      setIsSyncing(false);
      await refresh();
    }
  }, [utils, refresh]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      flushRef.current();
    };
    const goOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    refresh().then(() => {
      if (navigator.onLine) flushRef.current();
    });

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refresh]);

  const recordArrival = useCallback(
    async (stopId: string) => {
      await clientRef.current.recordArrival(stopId);
      await refresh();
    },
    [refresh],
  );

  const recordDeparture = useCallback(
    async (stopId: string) => {
      await clientRef.current.recordDeparture(stopId);
      await refresh();
    },
    [refresh],
  );

  const retry = useCallback(
    async (id: string) => {
      await clientRef.current.retry(id);
      await refresh();
      await flushRef.current();
    },
    [refresh],
  );

  const dismiss = useCallback(
    async (id: string) => {
      await clientRef.current.dismiss(id);
      await refresh();
    },
    [refresh],
  );

  const pendingCount = queue.length;

  return {
    isOnline,
    isSyncing,
    queue,
    pendingCount,
    recordArrival,
    recordDeparture,
    flush,
    retry,
    dismiss,
  };
}
