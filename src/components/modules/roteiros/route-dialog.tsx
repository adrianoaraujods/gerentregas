"use client";

import { format } from "date-fns";
import { Plus, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";

interface RouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string | null;
  onSuccess: () => void;
}

export function RouteDialog({
  open,
  onOpenChange,
  routeId,
  onSuccess,
}: RouteDialogProps) {
  const isEditing = !!routeId;
  const [driverId, setDriverId] = useState("");
  const [date, setDate] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  // For new routes
  const [stops, setStops] = useState<{ pointId: string; order: string }[]>([
    { pointId: "", order: "1" },
  ]);

  const { data: routeData, isLoading: isLoadingRoute } =
    api.routes.get.useQuery({ id: routeId ?? "" }, { enabled: isEditing });

  const { data: drivers } = api.drivers.list.useQuery({
    limit: 100,
    role: "driver",
  });
  const { data: vehicles } = api.fleet.list.useQuery();
  const { data: points } = api.points.list.useQuery({ limit: 100 });

  const utils = api.useUtils();

  useEffect(() => {
    if (open && routeData && isEditing) {
      setDriverId(routeData.driverId);
      setDate(format(new Date(routeData.date), "yyyy-MM-dd'T'HH:mm"));
      setVehicleId(routeData.vehicleId || "");
      // For editing stops we could load them here, but the issue
      // suggests individual mutations for edits.
      // For MVP, if we want to add stops, we need a separate flow or UI.
    } else if (open && !isEditing) {
      setDriverId("");
      setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setVehicleId("");
      setStops([{ pointId: "", order: "1" }]);
    }
  }, [open, routeData, isEditing]);

  const createMutation = api.routes.create.useMutation({
    onSuccess: () => {
      toast.success("Roteiro criado com sucesso!");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao criar roteiro: ${error.message}`);
    },
  });

  const updateRouteMutation = api.routes.update.useMutation({
    onSuccess: () => {
      toast.success("Roteiro atualizado com sucesso!");
      utils.routes.get.invalidate({ id: routeId ?? "" });
      utils.routes.list.invalidate();
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao atualizar roteiro: ${error.message}`);
    },
  });

  const addStopMutation = api.routes.addStop.useMutation({
    onSuccess: () => {
      toast.success("Parada adicionada!");
      utils.routes.get.invalidate({ id: routeId ?? "" });
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao adicionar parada: ${error.message}`);
    },
  });

  const deleteStopMutation = api.routes.deleteStop.useMutation({
    onSuccess: () => {
      toast.success("Parada removida!");
      utils.routes.get.invalidate({ id: routeId ?? "" });
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao remover parada: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!driverId) {
      toast.error("Selecione um motorista");
      return;
    }

    if (!isEditing) {
      // Validate stops
      if (stops.some((s) => !s.pointId)) {
        toast.error("Preencha todos os pontos das paradas");
        return;
      }
      if (stops.length === 0) {
        toast.error("O roteiro deve ter pelo menos uma parada (origem)");
        return;
      }

      createMutation.mutate({
        driverId,
        date: new Date(date).toISOString(),
        vehicleId: vehicleId || null,
        stops: stops.map((s, i) => ({ pointId: s.pointId, order: String(i + 1) })),
      });
    } else {
      updateRouteMutation.mutate({
        id: routeId ?? "",
        driverId,
        vehicleId: vehicleId || null,
      });
    }
  };

  const handleAddStopUI = () => {
    setStops([...stops, { pointId: "", order: String(stops.length + 1) }]);
  };

  const handleRemoveStopUI = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleUpdateStopUI = (index: number, pointId: string) => {
    const newStops = [...stops];
    newStops[index].pointId = pointId;
    setStops(newStops);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Roteiro" : "Novo Roteiro"}
          </DialogTitle>
        </DialogHeader>

        {isEditing && isLoadingRoute ? (
          <div className="py-8 flex justify-center">Carregando...</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="driverId">Motorista</FieldLabel>
                <FieldContent>
                  <Select
                    value={driverId}
                    onValueChange={(val) => setDriverId(val || "")}
                  >
                    <SelectTrigger id="driverId">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.drivers.map(
                        (d: { id: string; name: string }) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="date">Data e Hora (Início)</FieldLabel>
                <FieldContent>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={isEditing} // Often we don't change date once created, but could allow
                  />
                </FieldContent>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="vehicleId">Veículo (Opcional)</FieldLabel>
              <FieldContent>
                <Select
                  value={vehicleId}
                  onValueChange={(val) => setVehicleId(val || "")}
                >
                  <SelectTrigger id="vehicleId">
                    <SelectValue placeholder="Selecione um veículo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum (Indeterminado)</SelectItem>
                    {vehicles?.map(
                      (v: { id: string; plate: string; model: string }) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate} - {v.model}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Paradas (Ordem)</h3>
                {!isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddStopUI}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                )}
              </div>

              {!isEditing ? (
                <div className="space-y-2">
                  {stops.map((stop, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: We rebuild this array based on index
                    <div key={index} className="flex items-center gap-2">
                      <div className="bg-muted text-muted-foreground w-8 h-8 flex items-center justify-center rounded text-xs font-bold">
                        {index === 0 ? "O" : index}
                      </div>
                      <Select
                        value={stop.pointId}
                        onValueChange={(val) =>
                          handleUpdateStopUI(index, val || "")
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione um ponto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {points?.points.map(
                            (p: {
                              id: string;
                              name: string;
                              address: string;
                            }) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} - {p.address}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      {stops.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStopUI(index)}
                          className="text-destructive"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {routeData?.stops.map(
                    (
                      stop: {
                        id: string;
                        order: string;
                        point: { name: string; address: string } | null;
                        arrivalAt: unknown;
                      },
                      index: number,
                    ) => (
                      <div key={stop.id} className="flex items-center gap-2">
                        <div className="bg-muted text-muted-foreground w-8 h-8 flex items-center justify-center rounded text-xs font-bold">
                          {index === 0 ? "O" : index}
                        </div>
                        <div className="flex-1 px-3 py-2 border rounded-md text-sm truncate bg-muted/50 cursor-not-allowed">
                          {stop.point?.name} - {stop.point?.address}
                        </div>
                        {!stop.arrivalAt && stop.order !== "1" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Remover esta parada?")) {
                                deleteStopMutation.mutate({
                                  routeId: routeId ?? "",
                                  stopId: stop.id,
                                });
                              }
                            }}
                            className="text-destructive"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ),
                  )}

                  <div className="pt-2 border-t mt-4 flex gap-2">
                    <Select
                      onValueChange={(val) => {
                        addStopMutation.mutate({
                          routeId: routeId ?? "",
                          pointId: val as string,
                          order: String((routeData?.stops.length || 0) + 1),
                        });
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Adicionar nova parada ao final..." />
                      </SelectTrigger>
                      <SelectContent>
                        {points?.points.map(
                          (p: { id: string; name: string }) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending || updateRouteMutation.isPending
                }
              >
                {isEditing ? "Salvar Alterações" : "Criar Roteiro"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
