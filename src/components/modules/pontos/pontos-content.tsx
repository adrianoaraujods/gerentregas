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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api/client";
import type { RouterOutputs } from "@/server/api/router";
import { PointDialog } from "./point-dialog";

type ClientPoint = RouterOutputs["points"]["list"]["points"][number];

export function PontosContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pointToEdit, setPointToEdit] = useState<ClientPoint | null>(null);
  const [pointToDelete, setPointToDelete] = useState<ClientPoint | null>(null);

  const utils = api.useUtils();
  const { data, isLoading } = api.points.list.useQuery({
    limit: 100,
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

  const confirmDelete = (point: ClientPoint) => {
    setPointToDelete(point);
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

  return (
    <div className="space-y-6">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Status Geocode</TableHead>
                <TableHead>Coordenadas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Skeletons are static and never reordered
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-[150px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[250px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !data || data.points.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-muted-foreground"
                  >
                    Nenhum ponto cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                data.points.map((point) => (
                  <TableRow key={point.id}>
                    <TableCell className="font-medium">{point.name}</TableCell>
                    <TableCell
                      className="max-w-xs truncate"
                      title={point.address}
                    >
                      {point.address}
                    </TableCell>
                    <TableCell>
                      {renderGeocodeStatus(point.geocodeStatus)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {point.latitude && point.longitude
                        ? `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(point)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(point)}
                          title="Excluir"
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
