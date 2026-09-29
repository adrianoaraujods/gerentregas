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
import {
  RemainingRouteActions,
  StopNavigationActions,
} from "@/components/modules/driver/stop-navigation-actions";
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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { formatTrpcErrorMessage } from "@/lib/api/format-trpc-error";
import { toNavigationStopInput } from "@/lib/driver-navigation";
import { buildNavigationLinks } from "@/lib/navigation-links";
import {
  formatDwellSeconds as formatDwell,
  stopDwellSeconds,
} from "@/lib/route-metrics";
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

  const processedStops = useMemo(() => {
    if (!route) return [];
    let foundCurrent = false;
    return route.stops.map((stop) => {
      const origin = isOrigin(stop);
      const queued = queuedByStopId.get(stop.id);
      const stopPending = queued?.status === "pending";
      const stopRejected = queued?.status === "rejected" ? queued : null;
      const arrival = formatTime(queued?.arrival ?? stop.arrivalAt);
      const departure = formatTime(queued?.departure ?? stop.departureAt);
      const queuedDwellSeconds =
        stopPending && queued?.arrival && queued?.departure
          ? stopDwellSeconds({
              order: stop.order,
              arrivalAt: queued.arrival,
              departureAt: queued.departure,
            })
          : undefined;
      const dwell = origin
        ? null
        : formatDwell(queuedDwellSeconds ?? stop.dwellSeconds);

      const isCompleted = !!departure;

      let isCurrent = false;
      if (
        !origin &&
        !isCompleted &&
        !foundCurrent &&
        route.status === "in_flight"
      ) {
        isCurrent = true;
        foundCurrent = true;
      }

      return {
        stop,
        isOrigin: origin,
        queued,
        stopPending,
        stopRejected,
        arrival,
        departure,
        dwell,
        isCompleted,
        isCurrent,
      };
    });
  }, [route?.stops, queuedByStopId, route?.status, route]);

  const navigationLinks = useMemo(() => {
    if (!route) return null;
    return buildNavigationLinks(
      route.stops.map((stop) =>
        toNavigationStopInput(
          stop,
          queuedByStopId.get(stop.id)?.departure ?? null,
        ),
      ),
      route.status,
    );
  }, [route, queuedByStopId]);

  const perStopLinkById = useMemo(
    () =>
      new Map(
        (navigationLinks?.perStop ?? []).map((link) => [link.stopId, link]),
      ),
    [navigationLinks],
  );

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

  const totalDeliveries = processedStops.filter((s) => !s.isOrigin).length;
  const completedDeliveries = processedStops.filter(
    (s) => !s.isOrigin && s.isCompleted,
  ).length;
  const progressPct =
    totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0;

  const currentStopObj = processedStops.find((s) => s.isCurrent);
  const otherStops = processedStops.filter((s) => !s.isCurrent);

  const renderStop = ({
    stop,
    isOrigin: origin,
    queued,
    stopPending,
    stopRejected,
    arrival,
    departure,
    dwell,
    isCompleted,
    isCurrent,
  }: (typeof processedStops)[0]) => {
    const isInFlight = route.status === "in_flight";
    const opacityClass = isCompleted ? "opacity-60" : "";
    const borderClass = isCurrent ? "border-primary shadow-md border-2" : "";
    const navigationLink = perStopLinkById.get(stop.id);
    const showCheckInOut = !origin && !isCompleted;

    return (
      <Card
        key={stop.id}
        className={`${opacityClass} ${borderClass} transition-opacity`}
      >
        <CardContent
          className={`flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between ${isCurrent ? "p-5" : ""}`}
        >
          <div className="flex items-start gap-4">
            <span
              className={`flex shrink-0 items-center justify-center rounded-full font-heading font-bold ${isCurrent ? "size-10 bg-primary text-primary-foreground text-lg" : "size-8 bg-secondary text-sm"}`}
            >
              {stop.order}
            </span>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`font-medium ${isCurrent ? "text-lg" : ""}`}>
                  {stopTitle(stop)}
                </p>
                {origin && <Badge variant="outline">Origem</Badge>}
                {isCurrent && (
                  <Badge
                    variant="default"
                    className="bg-primary/20 text-primary hover:bg-primary/30"
                  >
                    Parada Atual
                  </Badge>
                )}
                {stopPending && (
                  <Badge variant="outline">
                    <Clock className="mr-1 size-3" />
                    pendente
                  </Badge>
                )}
                {stopRejected && (
                  <Badge variant="destructive">
                    <AlertTriangle className="mr-1 size-3" />
                    rejeitada
                  </Badge>
                )}
                {!origin && departure && dwell && (
                  <Badge variant="secondary">
                    <Timer className="mr-1 size-3" />
                    {dwell}
                  </Badge>
                )}
              </div>
              <p
                className={`text-muted-foreground ${isCurrent ? "text-base" : "text-sm"}`}
              >
                {stop.addressSnapshot}
              </p>

              <div
                className={`flex flex-wrap gap-x-4 text-muted-foreground ${isCurrent ? "text-sm" : "text-xs"}`}
              >
                {origin && (
                  <span className="inline-flex items-center gap-1">
                    <Flag className="size-3" />
                    {departure
                      ? `Partida às ${departure}`
                      : "Aguardando início do turno"}
                  </span>
                )}
                {!origin && arrival && (
                  <span className="inline-flex items-center gap-1">
                    <LogIn className="size-3" />
                    Chegada às {arrival} {stopPending && "(pendente)"}
                  </span>
                )}
                {!origin && departure && (
                  <span className="inline-flex items-center gap-1">
                    <LogOut className="size-3" />
                    Saída às {departure} {stopPending && "(pendente)"}
                  </span>
                )}
                {!origin && !arrival && !departure && (
                  <span className="inline-flex items-center gap-1">
                    <Timer className="size-3" /> Aguardando chegada
                  </span>
                )}
              </div>

              {stopRejected && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <p className="text-sm text-destructive font-medium">
                    {stopRejected.message}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => retry(stopRejected.id)}
                    className="h-8"
                  >
                    <RefreshCw className="mr-2 size-4" /> Tentar novamente
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismiss(stopRejected.id)}
                    className="h-8"
                  >
                    <Trash2 className="mr-2 size-4" /> Remover
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div
            className={`flex shrink-0 flex-col gap-3 mt-2 sm:mt-0 sm:items-end ${isCurrent ? "w-full sm:w-auto" : ""}`}
          >
            {navigationLink && (
              <StopNavigationActions
                googleUrl={navigationLink.googleUrl}
                wazeUrl={navigationLink.wazeUrl}
                disabled={navigationLink.disabled}
                stopLabel={stopTitle(stop)}
              />
            )}

            {showCheckInOut && (
              <div className="flex shrink-0 flex-col sm:flex-row gap-2">
                {!arrival && !departure && (
                  <Button
                    size={isCurrent ? "default" : "sm"}
                    className={
                      isCurrent ? "w-full min-h-[48px] sm:w-auto text-base" : ""
                    }
                    disabled={
                      !isInFlight || (isOnline && checkInMutation.isPending)
                    }
                    onClick={() => handleCheckIn(stop.id)}
                  >
                    <LogIn className="mr-2 size-5" /> Registrar chegada
                  </Button>
                )}
                {arrival && !departure && (
                  <Button
                    size={isCurrent ? "default" : "sm"}
                    className={
                      isCurrent ? "w-full min-h-[48px] sm:w-auto text-base" : ""
                    }
                    disabled={
                      !isInFlight ||
                      (isOnline && !queued && checkOutMutation.isPending)
                    }
                    onClick={() => handleCheckOut(stop.id)}
                  >
                    <LogOut className="mr-2 size-5" /> Registrar saída
                  </Button>
                )}
              </div>
            )}

            {!origin && isCompleted && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
                {stopPending ? "Concluída (pendente)" : "Concluída"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">Roteiro de hoje</CardTitle>
              <CardDescription className="text-base mt-1">
                {driverName}
                {routeDate ? ` — ${format(routeDate, "dd/MM/yyyy")}` : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={dayState.variant} className="text-sm px-3 py-1">
                {dayState.label}
              </Badge>
              {!isOnline && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  <WifiOff className="mr-1.5 size-4" /> Offline
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <Clock className="mr-1.5 size-4" />
                  {pendingCount === 1
                    ? "1 pendente"
                    : `${pendingCount} pendentes`}
                </Badge>
              )}
              {pendingCount > 0 && isOnline && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => flush()}
                  disabled={isSyncing}
                  className="h-8"
                >
                  <RefreshCw
                    className={`mr-2 size-4 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  {isSyncing ? "Sincronizando..." : "Sincronizar"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {route.status === "draft" ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3 text-muted-foreground bg-secondary/50 p-4 rounded-lg">
                <Play className="size-5 shrink-0 text-primary" />
                <p className="text-sm">
                  Inicie o turno para registrar a partida da origem e começar as
                  entregas.
                </p>
              </div>
              {route.vehicleId && (
                <p className="text-sm">
                  Veículo pré-atribuído pelo gerente:{" "}
                  <span className="font-semibold">
                    {preAssignedVehicle
                      ? vehicleLabel(preAssignedVehicle)
                      : "vinculado à rota"}
                  </span>
                  . Confirme para iniciar ou selecione outro veículo ativo.
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                  value={effectiveVehicleId ?? undefined}
                  onValueChange={(value) => setSelectedVehicleId(value)}
                  items={vehicleOptions.map((v) => ({
                    value: v.id,
                    label: vehicleLabel(v),
                  }))}
                >
                  <SelectTrigger
                    id="vehicle"
                    className="w-full sm:w-72 h-12 text-base"
                    aria-label="Selecionar veículo"
                  >
                    <SelectValue placeholder="Selecione um veículo ativo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleOptions.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                        label={vehicleLabel(v)}
                        className="text-base"
                      >
                        {vehicleLabel(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full sm:w-auto h-12 text-base"
                  onClick={handleStartShift}
                  disabled={!effectiveVehicleId || startShiftMutation.isPending}
                >
                  <Play className="mr-2 size-5" />
                  {startShiftMutation.isPending
                    ? "Iniciando..."
                    : "Iniciar turno"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-2">
                  <Truck className="size-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Veículo:</span>
                  <span className="font-semibold text-base">
                    {preAssignedVehicle
                      ? vehicleLabel(preAssignedVehicle)
                      : route.vehicleId
                        ? "vinculado à rota"
                        : "não vinculado"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <Timer className="size-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Tempo parado:</span>
                  <span className="font-semibold text-base">
                    {formatDwell(route.totalDwellSeconds) ?? "0 s"}
                  </span>
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Progresso das entregas</span>
                  <span>
                    {completedDeliveries} de {totalDeliveries}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-in-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          {(navigationLinks?.remainingRouteUrls.length ?? 0) > 0 && (
            <div className="pt-4">
              <RemainingRouteActions
                urls={navigationLinks?.remainingRouteUrls ?? []}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {currentStopObj && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight px-1">
            Parada Atual
          </h2>
          {renderStop(currentStopObj)}
        </div>
      )}

      <div className="space-y-3">
        {otherStops.length > 0 && (
          <h2 className="text-lg font-bold tracking-tight px-1 mt-4">
            Lista de Paradas
          </h2>
        )}
        {otherStops.map(renderStop)}
      </div>
    </div>
  );
}
