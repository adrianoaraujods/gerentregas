"use client";

import {
  AlertTriangle,
  MapPin,
  MapPinOff,
  Pencil,
  Plus,
  Trash,
} from "lucide-react";
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
import type { RouterOutputs } from "@/server/api/router";
import { PointDialog } from "./point-dialog";

type ClientPoint = RouterOutputs["points"]["list"]["points"][number];

const columnHelper = createAppColumnHelper<ClientPoint>();

const GEOCODE_STATUS_OPTIONS = [
  { label: "Localizado", value: "success" },
  { label: "Falhou", value: "failed" },
  { label: "Manual", value: "manual" },
];

export function PontosContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pointToEdit, setPointToEdit] = useState<ClientPoint | null>(null);
  const [pointToDelete, setPointToDelete] = useState<ClientPoint | null>(null);

  const utils = api.useUtils();
  const { data, isLoading } = api.points.list.useQuery({
    limit: 1000,
    offset: 0,
    includeDeleted: false,
  });

  const deleteMutation = api.points.delete.useMutation({
    onSuccess: () => {
      toast.success("Ponto excluído com sucesso!");
      utils.points.list.invalidate();
      setPointToDelete(null);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir ponto: ${error.message}`);
    },
  });

  const handleEdit = (point: ClientPoint) => {
    setPointToEdit(point);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setPointToEdit(null);
    setDialogOpen(true);
  };

  const renderGeocodeStatus = (status: ClientPoint["geocodeStatus"]) => {
    switch (status) {
      case "success":
        return (
          <Badge
            variant="outline"
            className="text-green-600 bg-green-50 border-green-200"
          >
            <MapPin className="mr-1 h-3 w-3" />
            Localizado
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="outline"
            className="text-red-600 bg-red-50 border-red-200"
          >
            <MapPinOff className="mr-1 h-3 w-3" />
            Falhou
          </Badge>
        );
      case "manual":
        return (
          <Badge
            variant="outline"
            className="text-amber-600 bg-amber-50 border-amber-200"
          >
            <AlertTriangle className="mr-1 h-3 w-3" />
            Manual
          </Badge>
        );
      default:
        return null;
    }
  };

  const points = data?.points ?? [];

  const table = useAppTable({
    data: points,
    columns: columnHelper.columns([
      columnHelper.accessor("name", {
        meta: { variant: "text", label: "Nome" },
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("address", {
        meta: { variant: "text", label: "Endereço" },
        cell: ({ getValue }) => (
          <span className="block max-w-xs truncate" title={getValue()}>
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("geocodeStatus", {
        meta: {
          variant: "select",
          label: "Status Geocode",
          options: GEOCODE_STATUS_OPTIONS,
        },
        cell: ({ getValue }) => renderGeocodeStatus(getValue()),
      }),
      columnHelper.accessor(
        (row) =>
          row.latitude && row.longitude
            ? `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`
            : "-",
        {
          id: "coordenadas",
          meta: { variant: "text", label: "Coordenadas" },
          cell: ({ getValue }) => (
            <span className="font-mono text-muted-foreground text-sm tabular-nums">
              {getValue()}
            </span>
          ),
        },
      ),
      columnHelper.display({
        id: "acoes",
        header: () => <div className="text-right">Ações</div>,
        cell: ({ row }) => (
          <RowActions>
            <RowActionsItem
              icon={Pencil}
              label="Editar"
              onClick={() => handleEdit(row.original)}
            />
            <RowActionsItem
              icon={Trash}
              label="Excluir"
              variant="destructive"
              onClick={() => setPointToDelete(row.original)}
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
          <h1 className="text-2xl font-bold tracking-tight">Pontos</h1>
          <p className="text-muted-foreground">
            Gerencie o catálogo de pontos de coleta e entrega
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Ponto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Pontos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Skeletons are static and never reordered
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              table={table}
              toolbarProps={{ searchPlaceholder: "Pesquisar pontos..." }}
            />
          )}
        </CardContent>
      </Card>

      <PointDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pointToEdit={pointToEdit}
        onSuccess={() => utils.points.list.invalidate()}
      />

      <AlertDialog
        open={!!pointToDelete}
        onOpenChange={(open) => !open && setPointToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ponto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o ponto "{pointToDelete?.name}"?
              Esta ação o marcará como excluído.
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
                if (pointToDelete) {
                  deleteMutation.mutate({ id: pointToDelete.id });
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
