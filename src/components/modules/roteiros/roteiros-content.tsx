"use client";

import { format } from "date-fns";
import { CheckCircle2, History, MapIcon, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createAppColumnHelper,
  DataTable,
  RowActions,
  RowActionsItem,
  useAppTable,
} from "@/components/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { formatTrpcErrorMessage } from "@/lib/api/format-trpc-error";
import { formatBRL } from "@/lib/formatter";
import type { RouterOutputs } from "@/server/api/router";

import { RouteDialog } from "./route-dialog";
import { RouteHistoryDialog } from "./route-history-dialog";

type ClientRoute = RouterOutputs["routes"]["list"]["routes"][number];

const columnHelper = createAppColumnHelper<ClientRoute>();

const ROUTE_STATUS_OPTIONS = [
  { label: "Rascunho", value: "draft" },
  { label: "Em andamento", value: "in_flight" },
  { label: "Concluído", value: "concluded" },
  { label: "Cancelado", value: "cancelled" },
];

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "Indeterminado";
  return formatBRL(value);
}

function formatDistance(value: number | null | undefined) {
  if (value == null) return "Indeterminado";
  return `${value.toFixed(1)} km`;
}

export function RoteirosContent() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [routeToEditId, setRouteToEditId] = useState<string | null>(null);

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [routeHistoryId, setRouteHistoryId] = useState<string | null>(null);

  const [routeToDelete, setRouteToDelete] = useState<ClientRoute | null>(null);
  const [routeToConclude, setRouteToConclude] = useState<ClientRoute | null>(
    null,
  );

  const { data: routesData, isLoading: isLoadingRoutes } =
    api.routes.list.useQuery({ limit: 1000, offset: 0 });

  const { data: driversData } = api.drivers.list.useQuery({
    limit: 1000,
    role: "driver",
  });
  const { data: vehiclesData } = api.fleet.list.useQuery();

  const utils = api.useUtils();

  const concludeMutation = api.routes.concludeRoute.useMutation({
    onSuccess: () => {
      toast.success("Roteiro concluído com sucesso!");
      utils.routes.list.invalidate();
      setRouteToConclude(null);
    },
    onError: (error) => {
      toast.error(`Erro ao concluir roteiro: ${formatTrpcErrorMessage(error)}`);
    },
  });

  const deleteMutation = api.routes.delete.useMutation({
    onSuccess: () => {
      toast.success("Roteiro excluído com sucesso!");
      utils.routes.list.invalidate();
      setRouteToDelete(null);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir roteiro: ${formatTrpcErrorMessage(error)}`);
    },
  });

  const getDriverName = (id: string) => {
    const driver = driversData?.drivers.find((d) => d.id === id);
    return driver?.name || "Desconhecido";
  };

  const getVehiclePlate = (id: string | null | undefined) => {
    if (!id) return "Nenhum";
    const vehicle = vehiclesData?.find((v) => v.id === id);
    return vehicle?.plate || "Desconhecido";
  };

  const routes = routesData?.routes ?? [];

  const table = useAppTable({
    data: routes,
    columns: columnHelper.columns([
      columnHelper.accessor("date", {
        meta: { variant: "date", label: "Data" },
        cell: ({ getValue }) => (
          <span className="font-medium">
            {format(new Date(getValue()), "dd/MM/yyyy")}
          </span>
        ),
      }),
      columnHelper.accessor((row) => getDriverName(row.driverId), {
        id: "motorista",
        meta: { variant: "text", label: "Motorista" },
      }),
      columnHelper.accessor((row) => getVehiclePlate(row.vehicleId), {
        id: "veiculo",
        meta: { variant: "text", label: "Veículo" },
      }),
      columnHelper.accessor("status", {
        meta: {
          variant: "select",
          label: "Status",
          options: ROUTE_STATUS_OPTIONS,
        },
        cell: ({ getValue }) => {
          const value = getValue();
          const label =
            ROUTE_STATUS_OPTIONS.find((option) => option.value === value)
              ?.label ?? value;
          const variant =
            value === "concluded"
              ? "default"
              : value === "in_flight"
                ? "secondary"
                : "outline";
          return <Badge variant={variant}>{label}</Badge>;
        },
      }),
      columnHelper.accessor("distanceKm", {
        meta: { variant: "number", label: "Distância" },
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">
            {formatDistance(getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("cost", {
        meta: { variant: "number", label: "Custo" },
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">
            {formatCurrency(getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "acoes",
        header: () => <div className="text-right">Ações</div>,
        cell: ({ row }) => (
          <RowActions>
            <RowActionsItem
              icon={History}
              label="Histórico de versões"
              onClick={() => {
                setRouteHistoryId(row.original.id);
                setIsHistoryDialogOpen(true);
              }}
            />
            <RowActionsItem
              icon={MapIcon}
              label="Editar roteiro"
              onClick={() => {
                setRouteToEditId(row.original.id);
                setIsDialogOpen(true);
              }}
            />
            {row.original.status === "in_flight" && (
              <RowActionsItem
                icon={CheckCircle2}
                label="Concluir roteiro"
                disabled={concludeMutation.isPending}
                onClick={() => setRouteToConclude(row.original)}
              />
            )}
            <RowActionsItem
              icon={Trash}
              label="Excluir roteiro"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => setRouteToDelete(row.original)}
            />
          </RowActions>
        ),
        enableSorting: false,
        enableGrouping: false,
        enableHiding: false,
        enableColumnFilter: false,
      }),
    ]),
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roteiros</h1>
          <p className="text-muted-foreground">
            Gerencie os roteiros e despachos
          </p>
        </div>
        <Button
          onClick={() => {
            setRouteToEditId(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Criar Roteiro
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roteiros Diários</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRoutes ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Skeletons are static
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              table={table}
              toolbarProps={{ searchPlaceholder: "Pesquisar roteiros..." }}
            />
          )}
        </CardContent>
      </Card>

      <RouteDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        routeId={routeToEditId}
        onSuccess={() => utils.routes.list.invalidate()}
      />

      <RouteHistoryDialog
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        routeId={routeHistoryId}
      />

      <AlertDialog
        open={routeToConclude !== null}
        onOpenChange={(open) => {
          if (!open) setRouteToConclude(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir roteiro?</AlertDialogTitle>
            <AlertDialogDescription>
              As paradas sem registro de saída serão marcadas como concluídas
              agora e o roteiro será finalizado. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={concludeMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={concludeMutation.isPending}
              onClick={() => {
                if (routeToConclude) {
                  concludeMutation.mutate({ routeId: routeToConclude.id });
                }
              }}
            >
              {concludeMutation.isPending ? "Concluindo..." : "Concluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={routeToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setRouteToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir roteiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este roteiro? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (routeToDelete) {
                  deleteMutation.mutate({ id: routeToDelete.id });
                }
              }}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
