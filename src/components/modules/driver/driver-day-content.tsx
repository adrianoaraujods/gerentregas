"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  LogIn,
  LogOut,
  Play,
  RefreshCw,
  Timer,
  Trash2,
  Truck,
  WifiOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { formatTrpcErrorMessage } from "@/lib/api/format-trpc-error";
import type { QueuedStopEvent } from "@/lib/sync/sync-client";
import { useSyncQueue } from "@/lib/sync/use-sync-queue";
import type { RouterOutputs } from "@/server/api/router";
import type { RouteStatus } from "@/server/modules/routes";

type DriverRoute = NonNullable<RouterOutputs["routes"]["getMyRouteWithDwell"]>;
type DriverStop = DriverRoute["stops"][number];
type VehicleOutput = RouterOutputs["fleet"]["list"][number];

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function formatTime(value: Date | string | null | undefined): string | null {
  const date = toDate(value);
  if (!date) return null;
  return format(date, "HH:mm:ss");
}

function formatDwell(seconds: number | undefined): string | null {
  if (seconds === undefined || seconds < 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0)
    return secs > 0 ? `${minutes} min ${secs} s` : `${minutes} min`;
  return `${secs} s`;
}

function vehicleLabel(vehicle: VehicleOutput): string {
  return `${vehicle.plate} — ${vehicle.model}`;
}

function stopTitle(stop: DriverStop): string {
  if (stop.point?.name) return stop.point.name;
  return stop.addressSnapshot;
}

function isOrigin(stop: DriverStop): boolean {
  return stop.order === "1";
}

const DAY_STATE: Record<
  RouteStatus,
  {
    label: string;
    variant: "outline" | "secondary" | "default" | "destructive";
  }
> = {
  draft: { label: "Iniciar turno", variant: "outline" },
  in_flight: { label: "Em andamento", variant: "secondary" },
  concluded: { label: "Concluído", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

export function DriverDayContent({ driverName }: { driverName: string }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );

  const utils = api.useUtils();
  const {
    isOnline,
    isSyncing,
    queue,
    pendingCount,
    recordArrival,
    recordDeparture,
    flush,
    retry,
    dismiss,
  } = useSyncQueue();

  const queuedByStopId = useMemo(() => {
    const map = new Map<string, QueuedStopEvent>();
    for (const event of queue) {
      map.set(event.stopId, event);
    }
    return map;
  }, [queue]);

  const { data: route, isLoading: isLoadingRoute } =
    api.routes.getMyRouteWithDwell.useQuery({});
  const { data: vehicles } = api.fleet.list.useQuery(undefined);

  const invalidateRoute = () =>
    Promise.all([
      utils.routes.getMyRouteWithDwell.invalidate(),
      utils.fleet.list.invalidate(),
    ]);

  const startShiftMutation = api.routes.startShift.useMutation({
    onSuccess: () => {
      toast.success("Turno iniciado. Boa rota!");
      invalidateRoute();
    },
    onError: (error) => {
      toast.error(formatTrpcErrorMessage(error, "Erro ao iniciar o turno"));
    },
  });

  const checkInMutation = api.routes.checkIn.useMutation({
    onSuccess: () => {
      toast.success("Chegada registrada.");
      invalidateRoute();
    },
    onError: (error) => {
      toast.error(formatTrpcErrorMessage(error, "Erro ao registrar a chegada"));
    },
  });

  const checkOutMutation = api.routes.checkOut.useMutation({
    onSuccess: ({ dwellSeconds }) => {
      toast.success(
        `Saída registrada. Tempo parado: ${formatDwell(dwellSeconds)}`,
      );
      invalidateRoute();
    },
    onError: (error) => {
      toast.error(formatTrpcErrorMessage(error, "Erro ao registrar a saída"));
    },
  });

  const handleCheckIn = (stopId: string) => {
    if (isOnline) {
      checkInMutation.mutate({ stopId });
      return;
    }
    recordArrival(stopId)
      .then(() =>
        toast.success(
          "Sem conexão: chegada salva na fila e marcada como pendente.",
        ),
      )
      .catch((error) => toast.error(formatTrpcErrorMessage(error)));
  };

  const handleCheckOut = (stopId: string) => {
    const queued = queuedByStopId.get(stopId);
    if (isOnline && !queued) {
      checkOutMutation.mutate({ stopId });
      return;
    }
    recordDeparture(stopId)
      .then(() => {
        if (isOnline) {
          toast.success("Saída registrada. Sincronizando com o servidor...");
          return flush();
        }
        toast.success(
          "Sem conexão: saída salva na fila e marcada como pendente.",
        );
      })
      .catch((error) => toast.error(formatTrpcErrorMessage(error)));
  };

  if (isLoadingRoute) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Skeletons are static
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!route) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Roteiro do dia</CardTitle>
          <CardDescription>
            Olá, {driverName}. Não há roteiro atribuído para você hoje. Fale com
            o gerente caso isso esteja errado.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const dayState = DAY_STATE[route.status];
  const routeDate = toDate(route.date);
  const vehicleOptions = vehicles ?? [];
  const effectiveVehicleId = selectedVehicleId ?? route.vehicleId ?? null;
  const preAssignedVehicle = vehicleOptions.find(
    (vehicle) => vehicle.id === route.vehicleId,
  );

  const handleStartShift = () => {
    if (!effectiveVehicleId) {
      toast.error("Selecione um veículo para iniciar o turno.");
      return;
    }
    startShiftMutation.mutate({
      routeId: route.id,
      vehicleId: effectiveVehicleId,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Roteiro de hoje</CardTitle>
              <CardDescription>
                {driverName}
                {routeDate ? ` — ${format(routeDate, "dd/MM/yyyy")}` : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={dayState.variant}>{dayState.label}</Badge>
              {!isOnline && (
                <Badge variant="secondary">
                  <WifiOff className="size-3" />
                  Offline
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant="outline">
                  <Clock className="size-3" />
                  {pendingCount === 1
                    ? "1 registro pendente"
                    : `${pendingCount} registros pendentes`}
                </Badge>
              )}
              {pendingCount > 0 && isOnline && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => flush()}
                  disabled={isSyncing}
                >
                  <RefreshCw className="size-4" />
                  {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {route.status === "draft" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Play className="size-4" />
                <p className="text-sm">
                  Inicie o turno para registrar a partida da origem e começar as
                  entregas.
                </p>
              </div>
              {route.vehicleId && (
                <p className="text-sm">
                  Veículo pré-atribuído pelo gerente:{" "}
                  <span className="font-medium">
                    {preAssignedVehicle
                      ? vehicleLabel(preAssignedVehicle)
                      : "vinculado à rota"}
                  </span>
                  . Confirme para iniciar ou selecione outro veículo ativo.
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                  value={effectiveVehicleId}
                  onValueChange={(value) => setSelectedVehicleId(value)}
                  items={vehicleOptions.map((vehicle: VehicleOutput) => ({
                    value: vehicle.id,
                    label: vehicleLabel(vehicle),
                  }))}
                >
                  <SelectTrigger
                    id="vehicle"
                    className="w-full sm:w-72"
                    aria-label="Selecionar veículo"
                  >
                    <SelectValue placeholder="Selecione um veículo ativo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleOptions.map((vehicle: VehicleOutput) => (
                      <SelectItem
                        key={vehicle.id}
                        value={vehicle.id}
                        label={vehicleLabel(vehicle)}
                      >
                        {vehicleLabel(vehicle)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleStartShift}
                  disabled={!effectiveVehicleId || startShiftMutation.isPending}
                >
                  <Play className="size-4" />
                  {startShiftMutation.isPending
                    ? "Iniciando..."
                    : "Iniciar turno"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-2">
                <Truck className="size-4 text-muted-foreground" />
                Veículo do dia:{" "}
                <span className="font-medium">
                  {preAssignedVehicle
                    ? vehicleLabel(preAssignedVehicle)
                    : route.vehicleId
                      ? "vinculado à rota"
                      : "não vinculado"}
                </span>
              </span>
              <Separator orientation="vertical" className="h-4" />
              <span className="inline-flex items-center gap-2">
                <Timer className="size-4 text-muted-foreground" />
                Tempo parado acumulado:{" "}
                <span className="font-medium">
                  {formatDwell(route.totalDwellSeconds) ?? "0 s"}
                </span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {route.stops.map((stop) => {
          const origin = isOrigin(stop);
          const queued = queuedByStopId.get(stop.id);
          const stopPending = queued?.status === "pending";
          const stopRejected = queued?.status === "rejected" ? queued : null;
          const arrival = formatTime(queued?.arrival ?? stop.arrivalAt);
          const departure = formatTime(queued?.departure ?? stop.departureAt);
          const queuedDwellSeconds =
            stopPending && queued?.arrival && queued?.departure
              ? (new Date(queued.departure).getTime() -
                  new Date(queued.arrival).getTime()) /
                1000
              : undefined;
          const dwell = origin
            ? null
            : formatDwell(queuedDwellSeconds ?? stop.dwellSeconds);
          const isInFlight = route.status === "in_flight";

          return (
            <Card key={stop.id}>
              <CardContent className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-sm font-medium">
                    {stop.order}
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{stopTitle(stop)}</p>
                      {origin && <Badge variant="outline">Origem</Badge>}
                      {stopPending && (
                        <Badge variant="outline">
                          <Clock className="size-3" />
                          pendente
                        </Badge>
                      )}
                      {stopRejected && (
                        <Badge variant="destructive">
                          <AlertTriangle className="size-3" />
                          rejeitada
                        </Badge>
                      )}
                      {!origin && departure && dwell && (
                        <Badge variant="secondary">
                          <Timer className="size-3" />
                          {dwell}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stop.addressSnapshot}
                    </p>
                    <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                      {origin && (
                        <span>
                          {departure
                            ? `Partida da base às ${departure}`
                            : "Aguardando início do turno"}
                        </span>
                      )}
                      {!origin && arrival && (
                        <span>
                          Chegada às {arrival}
                          {stopPending ? " (pendente)" : ""}
                        </span>
                      )}
                      {!origin && departure && (
                        <span>
                          Saída às {departure}
                          {stopPending ? " (pendente)" : ""}
                        </span>
                      )}
                      {!origin && !arrival && !departure && (
                        <span>Aguardando chegada</span>
                      )}
                    </div>
                    {stopRejected && (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs text-destructive">
                          {stopRejected.message}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retry(stopRejected.id)}
                        >
                          <RefreshCw className="size-4" />
                          Tentar novamente
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismiss(stopRejected.id)}
                        >
                          <Trash2 className="size-4" />
                          Remover
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {!origin && (
                  <div className="flex shrink-0 justify-end">
                    {!arrival && !departure && (
                      <Button
                        size="sm"
                        disabled={
                          !isInFlight || (isOnline && checkInMutation.isPending)
                        }
                        onClick={() => handleCheckIn(stop.id)}
                      >
                        <LogIn className="size-4" />
                        Registrar chegada
                      </Button>
                    )}
                    {arrival && !departure && (
                      <Button
                        size="sm"
                        disabled={
                          !isInFlight ||
                          (isOnline && !queued && checkOutMutation.isPending)
                        }
                        onClick={() => handleCheckOut(stop.id)}
                      >
                        <LogOut className="size-4" />
                        Registrar saída
                      </Button>
                    )}
                    {departure && (
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="size-4" />
                        {stopPending ? "Concluída (pendente)" : "Concluída"}
                      </span>
                    )}
                  </div>
                )}

                {origin && (
                  <span className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground sm:inline-flex">
                    <Flag className="size-4" />
                    Sem registro de chegada
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
