"use client";

import { format } from "date-fns";
import { MapIcon, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api/client";

import { RouteDialog } from "./route-dialog";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "Indeterminado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function formatDistance(value: number | null | undefined) {
  if (value == null) return "Indeterminado";
  return `${value.toFixed(1)} km`;
}

export function RoteirosContent() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [routeToEditId, setRouteToEditId] = useState<string | null>(null);

  const { data: routesData, isLoading: isLoadingRoutes } =
    api.routes.list.useQuery({ limit: 100, offset: 0 });

  const { data: driversData } = api.drivers.list.useQuery({
    limit: 100,
    role: "driver",
  });
  const { data: vehiclesData } = api.fleet.list.useQuery();

  const utils = api.useUtils();

  const deleteMutation = api.routes.delete.useMutation({
    onSuccess: () => {
      toast.success("Roteiro excluído com sucesso!");
      utils.routes.list.invalidate();
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao excluir roteiro: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este roteiro?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getDriverName = (id: string) => {
    const driver = driversData?.drivers.find(
      (d: { id: string; name: string }) => d.id === id,
    );
    return driver?.name || "Desconhecido";
  };

  const getVehiclePlate = (id: string | null | undefined) => {
    if (!id) return "Nenhum";
    const vehicle = vehiclesData?.find(
      (v: { id: string; plate: string }) => v.id === id,
    );
    return vehicle?.plate || "Desconhecido";
  };

  return (
    <div className="space-y-6">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Distância / Custo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRoutes ? (
                Array.from({ length: 5 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Skeletons are static
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[150px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[120px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !routesData || routesData.routes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-6 text-muted-foreground"
                  >
                    Nenhum roteiro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                routesData.routes.map(
                  (route: {
                    id: string;
                    date: string;
                    driverId: string;
                    vehicleId: string | null;
                    status: string;
                    distanceKm: number | null;
                    cost: number | null;
                  }) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">
                        {format(new Date(route.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{getDriverName(route.driverId)}</TableCell>
                      <TableCell>{getVehiclePlate(route.vehicleId)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            route.status === "concluded"
                              ? "default"
                              : route.status === "in_flight"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {route.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatDistance(route.distanceKm)} /{" "}
                          {formatCurrency(route.cost)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRouteToEditId(route.id);
                            setIsDialogOpen(true);
                          }}
                          title="Editar roteiro"
                        >
                          <MapIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleDelete(route.id)}
                          disabled={deleteMutation.isPending}
                          title="Excluir roteiro"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ),
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RouteDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        routeId={routeToEditId}
        onSuccess={() => utils.routes.list.invalidate()}
      />
    </div>
  );
}
