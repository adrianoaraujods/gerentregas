"use client";

import { revalidateLogic } from "@tanstack/react-form";
import { ArchiveRestore, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createAppColumnHelper,
  DataTable,
  type ExtendedColumnFilter,
  RowActions,
  RowActionsItem,
  useAppTable,
} from "@/components/data-table";
import { useAppForm } from "@/components/hooks/use-app-form";
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
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api/client";
import { formatTrpcErrorMessage } from "@/lib/api/format-trpc-error";
import { formatPlate } from "@/lib/formatter";
import { normalizePlate } from "@/lib/validators";
import {
  type CreateVehicleInput,
  type VehicleOutput,
  vehicleFormSchema,
} from "@/server/modules/fleet/fleet.types";

const columnHelper = createAppColumnHelper<VehicleOutput>();

const STATUS_OPTIONS = [
  { label: "Ativo", value: "ativo" },
  { label: "Inativo", value: "inativo" },
  { label: "Arquivado", value: "arquivado" },
];

const ARCHIVED_STATUS = STATUS_OPTIONS[2].value;

const defaultStatusFilter: ExtendedColumnFilter[] = [
  { id: "status", operator: "notEquals", value: ARCHIVED_STATUS },
];

export function VehicleForm({
  editingVehicle,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  editingVehicle: VehicleOutput | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateVehicleInput) => void;
}) {
  const form = useAppForm({
    defaultValues: {
      plate: normalizePlate(editingVehicle?.plate ?? ""),
      model: editingVehicle?.model ?? "",
      kmPerLiter: editingVehicle?.kmPerLiter ?? 0,
      active: editingVehicle?.active ?? true,
    },
    validationLogic: revalidateLogic({ modeAfterSubmission: "change" }),
    validators: { onDynamic: vehicleFormSchema },
    onSubmit: async ({ value }) => {
      onSubmit({ ...value, plate: normalizePlate(value.plate) });
    },
  });

  return (
    <form.AppForm>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {editingVehicle ? "Editar Veículo" : "Cadastrar Novo Veículo"}
          </DialogTitle>
          <DialogDescription>
            Informe os dados do veículo para cálculo de custos e vinculo aos
            roteiros.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="py-4">
          <form.AppField name="plate">
            {(field) => (
              <field.PlateField
                label="Placa"
                props={{
                  placeholder: "Ex: ABC-1D23",
                  disabled: isSubmitting,
                }}
              />
            )}
          </form.AppField>

          <form.AppField name="model">
            {(field) => (
              <field.TextField
                label="Modelo / Tipo"
                props={{
                  placeholder: "Ex: Furgão Utilitário, Moto 160",
                  disabled: isSubmitting,
                }}
              />
            )}
          </form.AppField>

          <form.AppField name="kmPerLiter">
            {(field) => (
              <field.NumberField
                label="Rendimento (km por Litro)"
                props={{
                  step: "0.1",
                  min: "0.1",
                  placeholder: "Ex: 12.5",
                  disabled: isSubmitting,
                }}
              />
            )}
          </form.AppField>

          <form.AppField name="active">
            {(field) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={field.name}>Veículo Ativo</FieldLabel>
                </FieldContent>
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                  disabled={isSubmitting}
                />
              </Field>
            )}
          </form.AppField>

          <form.FormError />
        </FieldGroup>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <form.SubmitButton className="w-auto" disabled={isSubmitting}>
            {isSubmitting
              ? "Salvando..."
              : editingVehicle
                ? "Salvar Alterações"
                : "Cadastrar"}
          </form.SubmitButton>
        </DialogFooter>
      </form>
    </form.AppForm>
  );
}

export function FrotaContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleOutput | null>(
    null,
  );
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleOutput | null>(
    null,
  );

  const utils = api.useUtils();

  const { data: vehicles = [], isLoading } = api.fleet.list.useQuery({
    activeOnly: false,
    includeDeleted: true,
  });

  const createMutation = api.fleet.create.useMutation({
    onSuccess: () => {
      toast.success("Veículo cadastrado com sucesso!");
      utils.fleet.list.invalidate();
      closeModal();
    },
    onError: (err) => {
      toast.error(formatTrpcErrorMessage(err, "Erro ao cadastrar veículo"));
    },
  });

  const updateMutation = api.fleet.update.useMutation({
    onSuccess: () => {
      toast.success("Veículo atualizado com sucesso!");
      utils.fleet.list.invalidate();
      closeModal();
    },
    onError: (err) => {
      toast.error(formatTrpcErrorMessage(err, "Erro ao atualizar veículo"));
    },
  });

  const deleteMutation = api.fleet.delete.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.result === "archived"
          ? "Veículo arquivado com sucesso! Ele permanece no histórico pois está vinculado a roteiros — remova o filtro de status para vê-lo e restaurá-lo."
          : "Veículo excluído permanentemente.",
      );
      utils.fleet.list.invalidate();
      setVehicleToDelete(null);
    },
    onError: (err) => {
      toast.error(formatTrpcErrorMessage(err, "Erro ao excluir veículo"));
    },
  });

  const restoreMutation = api.fleet.restore.useMutation({
    onSuccess: () => {
      toast.success("Veículo restaurado com sucesso!");
      utils.fleet.list.invalidate();
    },
    onError: (err) => {
      toast.error(formatTrpcErrorMessage(err, "Erro ao restaurar veículo"));
    },
  });

  const openCreateModal = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const openEditModal = (v: VehicleOutput) => {
    setEditingVehicle(v);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleFormSubmit = (values: CreateVehicleInput) => {
    if (editingVehicle) {
      updateMutation.mutate({
        id: editingVehicle.id,
        plate: values.plate,
        model: values.model,
        kmPerLiter: values.kmPerLiter,
        active: values.active,
      });
    } else {
      createMutation.mutate({
        plate: values.plate,
        model: values.model,
        kmPerLiter: values.kmPerLiter,
        active: values.active,
      });
    }
  };

  const table = useAppTable({
    data: vehicles,
    columns: columnHelper.columns([
      columnHelper.accessor("plate", {
        meta: { variant: "text", label: "Placa" },
        cell: ({ getValue }) => (
          <span className="font-mono font-bold">{formatPlate(getValue())}</span>
        ),
      }),
      columnHelper.accessor("model", {
        meta: { variant: "text", label: "Modelo" },
      }),
      columnHelper.accessor("kmPerLiter", {
        meta: { variant: "number", label: "Autonomia (km/L)" },
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">{getValue()} km/L</span>
        ),
      }),
      columnHelper.accessor(
        (row) =>
          row.deletedAt
            ? ARCHIVED_STATUS
            : row.active
              ? STATUS_OPTIONS[0].value
              : STATUS_OPTIONS[1].value,
        {
          id: "status",
          meta: {
            variant: "select",
            label: "Status",
            options: STATUS_OPTIONS,
          },
          cell: ({ getValue }) => {
            if (getValue() === ARCHIVED_STATUS) {
              return <Badge variant="outline">Arquivado</Badge>;
            }
            return getValue() === STATUS_OPTIONS[0].value ? (
              <Badge variant="default">Ativo</Badge>
            ) : (
              <Badge variant="secondary">Inativo</Badge>
            );
          },
        },
      ),
      columnHelper.display({
        id: "acoes",
        header: () => <div className="text-right">Ações</div>,
        cell: ({ row }) =>
          row.original.deletedAt ? (
            <RowActions>
              <RowActionsItem
                icon={ArchiveRestore}
                label="Restaurar"
                disabled={restoreMutation.isPending}
                onClick={() => restoreMutation.mutate({ id: row.original.id })}
              />
            </RowActions>
          ) : (
            <RowActions>
              <RowActionsItem
                icon={Pencil}
                label="Editar"
                onClick={() => openEditModal(row.original)}
              />
              <RowActionsItem
                icon={Trash}
                label="Excluir"
                variant="destructive"
                onClick={() => setVehicleToDelete(row.original)}
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
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      columnFilters: defaultStatusFilter,
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestão de Frota</CardTitle>
            <CardDescription>
              Cadastre e gerencie os veículos utilizados nos roteiros. Veículos
              arquivados ficam ocultos por padrão — remova o filtro de status
              para visualizá-los.
            </CardDescription>
          </div>
          <Button onClick={openCreateModal}>+ Novo Veículo</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <DataTable
              table={table}
              toolbarProps={{ searchPlaceholder: "Pesquisar veículos..." }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <VehicleForm
            key={editingVehicle ? `edit-${editingVehicle.id}` : "create"}
            editingVehicle={editingVehicle}
            isSubmitting={isSubmitting}
            onCancel={closeModal}
            onSubmit={handleFormSubmit}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={vehicleToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setVehicleToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir veículo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o veículo{" "}
              <span className="font-mono font-bold">
                {vehicleToDelete ? formatPlate(vehicleToDelete.plate) : ""}
              </span>
              ? Se ele não estiver vinculado a nenhum roteiro, será excluído
              permanentemente. Caso contrário, será arquivado (podendo ser
              restaurado depois).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (vehicleToDelete) {
                  deleteMutation.mutate({ id: vehicleToDelete.id });
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
