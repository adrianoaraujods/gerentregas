"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api/client";
import type { VehicleOutput } from "@/server/modules/fleet";

export default function FrotaPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleOutput | null>(
    null,
  );

  // Form State
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [kmPerLiter, setKmPerLiter] = useState("");
  const [active, setActive] = useState(true);

  const utils = api.useUtils();

  const { data: vehicles = [], isLoading } = api.fleet.list.useQuery({
    activeOnly: false,
  });

  const createMutation = api.fleet.create.useMutation({
    onSuccess: () => {
      toast.success("Veículo cadastrado com sucesso!");
      utils.fleet.list.invalidate();
      closeModal();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao cadastrar veículo");
    },
  });

  const updateMutation = api.fleet.update.useMutation({
    onSuccess: () => {
      toast.success("Veículo atualizado com sucesso!");
      utils.fleet.list.invalidate();
      closeModal();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar veículo");
    },
  });

  const deleteMutation = api.fleet.delete.useMutation({
    onSuccess: () => {
      toast.success("Veículo desativado com sucesso!");
      utils.fleet.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao desativar veículo");
    },
  });

  const openCreateModal = () => {
    setEditingVehicle(null);
    setPlate("");
    setModel("");
    setKmPerLiter("");
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (v: VehicleOutput) => {
    setEditingVehicle(v);
    setPlate(v.plate);
    setModel(v.model);
    setKmPerLiter(v.kmPerLiter.toString());
    setActive(v.active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericKm = parseFloat(kmPerLiter.replace(',', '.'));
    if (Number.isNaN(numericKm) || numericKm <= 0) {
      toast.error("Informe um rendimento (km/L) válido e positivo.");
      return;
    }

    if (!plate.trim() || !model.trim()) {
      toast.error("Preencha a placa e o modelo do veículo.");
      return;
    }

    if (editingVehicle) {
      updateMutation.mutate({
        id: editingVehicle.id,
        plate,
        model,
        kmPerLiter: numericKm,
        active,
      });
    } else {
      createMutation.mutate({
        plate,
        model,
        kmPerLiter: numericKm,
        active,
      });
    }
  };

  const handleDelete = (id: string, plate: string) => {
    if (
      confirm(`Tem certeza que deseja remover/desativar o veículo ${plate}?`)
    ) {
      deleteMutation.mutate({ id });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle render={<h1>Gestão de Frota</h1>} />
            <CardDescription
              render={
                <h2>
                  Cadastre e gerencie a disponibilidade dos veículos utilizados
                  nos roteiros.
                </h2>
              }
            />
          </div>
          <Button onClick={openCreateModal}>+ Novo Veículo</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum veículo cadastrado na frota.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Autonomia (km/L)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-bold">
                      {v.plate}
                    </TableCell>
                    <TableCell>{v.model}</TableCell>
                    <TableCell>{v.kmPerLiter} km/L</TableCell>
                    <TableCell>
                      {v.active ? (
                        <Badge variant="default">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(v)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(v.id, v.plate)}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingVehicle ? "Editar Veículo" : "Cadastrar Novo Veículo"}
              </DialogTitle>
              <DialogDescription>
                Informe os dados do veículo para cálculo de custos e vinculo aos
                roteiros.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="plate">Placa</Label>
                <Input
                  id="plate"
                  placeholder="Ex: ABC-1D23"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model">Modelo / Tipo</Label>
                <Input
                  id="model"
                  placeholder="Ex: Furgão Utilitário, Moto 160"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="kmPerLiter">Rendimento (km por Litro)</Label>
                <Input
                  id="kmPerLiter"
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Ex: 12.5"
                  value={kmPerLiter}
                  onChange={(e) => setKmPerLiter(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="active">Veículo Ativo</Label>
                <Switch
                  id="active"
                  checked={active}
                  onCheckedChange={setActive}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Salvando..."
                  : editingVehicle
                    ? "Salvar Alterações"
                    : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
