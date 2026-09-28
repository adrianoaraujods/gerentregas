"use client";

import { revalidateLogic } from "@tanstack/react-form";
import { keepPreviousData } from "@tanstack/react-query";
import { ArchiveRestore, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
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
import { FieldGroup } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api/client";
import { formatPhone } from "@/lib/formatter";
import { normalizePhone, phoneSchema } from "@/lib/validators";
import type { RouterOutputs } from "@/server/api/router";
import { createDriverInputSchema } from "@/server/modules/drivers/drivers.types";

const columnHelper = createAppColumnHelper<ManagedUser>();

const ROLE_OPTIONS = [
  { label: "Motorista", value: "driver" },
  { label: "Gerente", value: "manager" },
  { label: "Admin", value: "admin" },
];

const USER_STATUS_OPTIONS = [
  { label: "Ativo", value: "ativo" },
  { label: "Arquivado", value: "arquivado" },
];

const ARCHIVED_STATUS = USER_STATUS_OPTIONS[1].value;

const defaultStatusFilter: ExtendedColumnFilter[] = [
  { id: "status", operator: "notEquals", value: ARCHIVED_STATUS },
];

type ManagedUser = RouterOutputs["drivers"]["list"]["drivers"][number];
type ManagedRole = "driver" | "manager";

type ManagedUserFormValues = {
  name: string;
  email: string;
  password: string;
  phone: string;
  document: string;
};

function ManagedUserForm({
  editingUser,
  singular,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  editingUser: ManagedUser | null;
  singular: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: ManagedUserFormValues) => void;
}) {
  const documentSchema = editingUser
    ? z
        .string()
        .refine(
          (value) =>
            value === "" ||
            createDriverInputSchema.shape.document.safeParse(value).success,
          "CPF deve ter 11 dígitos",
        )
    : createDriverInputSchema.shape.document;

  const formSchema = z.object({
    name: createDriverInputSchema.shape.name,
    email: editingUser ? z.string() : createDriverInputSchema.shape.email,
    password: editingUser ? z.string() : createDriverInputSchema.shape.password,
    phone: phoneSchema,
    document: documentSchema,
  });

  const form = useAppForm({
    defaultValues: {
      name: editingUser?.name ?? "",
      email: "",
      password: "",
      phone: normalizePhone(editingUser?.phone ?? ""),
      document: "",
    },
    validationLogic: revalidateLogic({ modeAfterSubmission: "change" }),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      onSubmit(value as ManagedUserFormValues);
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
            {editingUser ? `Editar ${singular}` : `Cadastrar ${singular}`}
          </DialogTitle>
          <DialogDescription>
            {editingUser
              ? "Atualize nome, telefone ou CPF. O documento permanece criptografado no banco."
              : "Informe os dados para criar o acesso. O CPF é criptografado antes de ser salvo."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="py-4">
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label="Nome"
                props={{
                  placeholder: "Ex: João da Silva",
                  disabled: isSubmitting,
                }}
              />
            )}
          </form.AppField>

          {!editingUser && (
            <>
              <form.AppField name="email">
                {(field) => (
                  <field.TextField
                    label="E-mail"
                    props={{
                      type: "email",
                      placeholder: "Ex: joao@email.com",
                      disabled: isSubmitting,
                    }}
                  />
                )}
              </form.AppField>

              <form.AppField name="password">
                {(field) => (
                  <field.TextField
                    label="Senha"
                    props={{
                      type: "password",
                      placeholder: "Mínimo 6 caracteres",
                      disabled: isSubmitting,
                    }}
                  />
                )}
              </form.AppField>
            </>
          )}

          <form.AppField name="phone">
            {(field) => (
              <field.PhoneField
                label="Telefone"
                props={{
                  placeholder: "Ex: (11) 99999-9999",
                  disabled: isSubmitting,
                }}
              />
            )}
          </form.AppField>

          <form.AppField name="document">
            {(field) => (
              <field.DocumentField
                label="CPF"
                props={{
                  placeholder: editingUser
                    ? "Deixe vazio para manter o CPF atual"
                    : "Ex: 123.456.789-01",
                  disabled: isSubmitting,
                }}
              />
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
          <form.SubmitButton
            className="w-auto"
            size="default"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Salvando..."
              : editingUser
                ? "Salvar alterações"
                : "Cadastrar"}
          </form.SubmitButton>
        </DialogFooter>
      </form>
    </form.AppForm>
  );
}

export function DriversManagement({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<ManagedRole>("driver");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);

  const utils = api.useUtils();

  const { data, isLoading } = api.drivers.list.useQuery(
    {
      limit: 1000,
      offset: 0,
      role: tab,
      includeDeleted: true,
    },
    { placeholderData: keepPreviousData },
  );

  const users = data?.drivers ?? [];

  const handleTabChange = (value: string) => {
    setTab(value as ManagedRole);
  };

  const invalidate = () => utils.drivers.list.invalidate();

  const createDriverMutation = api.drivers.create.useMutation({
    onSuccess: () => {
      toast.success("Motorista cadastrado com sucesso!");
      invalidate();
      closeModal();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao cadastrar motorista");
    },
  });

  const createManagerMutation = api.drivers.createManager.useMutation({
    onSuccess: () => {
      toast.success("Gerente cadastrado com sucesso!");
      invalidate();
      closeModal();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao cadastrar gerente");
    },
  });

  const updateMutation = api.drivers.update.useMutation({
    onSuccess: () => {
      toast.success("Dados atualizados com sucesso!");
      invalidate();
      closeModal();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar dados");
    },
  });

  const deleteMutation = api.drivers.delete.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.result === "archived"
          ? "Usuário arquivado com sucesso! Ele permanece no histórico pois possui roteiros vinculados — remova o filtro de status para vê-lo e restaurá-lo. O acesso dele foi bloqueado."
          : "Usuário excluído permanentemente.",
      );
      invalidate();
      setUserToDelete(null);
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao excluir usuário");
    },
  });

  const restoreMutation = api.drivers.restore.useMutation({
    onSuccess: () => {
      toast.success("Usuário restaurado com sucesso!");
      invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao restaurar usuário");
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleFormSubmit = (values: ManagedUserFormValues) => {
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        name: values.name.trim(),
        phone: values.phone,
        ...(values.document ? { document: values.document } : {}),
      });
      return;
    }

    const base = {
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      phone: values.phone,
      document: values.document,
    };

    if (tab === "manager") {
      createManagerMutation.mutate({ ...base, role: "manager" });
    } else {
      createDriverMutation.mutate(base);
    }
  };

  const table = useAppTable({
    data: users,
    columns: columnHelper.columns([
      columnHelper.accessor("name", {
        meta: { variant: "text", label: "Nome" },
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("email", {
        meta: { variant: "text", label: "E-mail" },
      }),
      columnHelper.accessor("phone", {
        meta: { variant: "text", label: "Telefone" },
        cell: ({ getValue }) => {
          const value = getValue();
          return value ? formatPhone(normalizePhone(value)) : "—";
        },
      }),
      columnHelper.accessor("document", {
        meta: { variant: "text", label: "CPF" },
        cell: ({ getValue }) => (
          <span className="font-mono">{getValue() ?? "—"}</span>
        ),
      }),
      columnHelper.accessor("role", {
        meta: { variant: "select", label: "Perfil", options: ROLE_OPTIONS },
        cell: ({ getValue }) => {
          const value = getValue();
          const label =
            ROLE_OPTIONS.find((option) => option.value === value)?.label ??
            "Admin";
          return (
            <Badge variant={value === "driver" ? "secondary" : "default"}>
              {label}
            </Badge>
          );
        },
      }),
      columnHelper.accessor((row) => (row.deletedAt ? "arquivado" : "ativo"), {
        id: "status",
        meta: {
          variant: "select",
          label: "Status",
          options: USER_STATUS_OPTIONS,
        },
        cell: ({ getValue }) =>
          getValue() === ARCHIVED_STATUS ? (
            <Badge variant="outline">Arquivado</Badge>
          ) : (
            <Badge variant="default">Ativo</Badge>
          ),
      }),
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
                disabled={deleteMutation.isPending}
                onClick={() => setUserToDelete(row.original)}
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

  const isSubmitting =
    createDriverMutation.isPending ||
    createManagerMutation.isPending ||
    updateMutation.isPending;

  const isManagerTab = tab === "manager";
  const singular = isManagerTab ? "Gerente" : "Motorista";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Motoristas e usuários</CardTitle>
            <CardDescription>
              Cadastre e gerencie motoristas, gerentes e coordenadores.
            </CardDescription>
          </div>
          <Button onClick={openCreateModal}>+ Novo {singular}</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="driver">Motoristas</TabsTrigger>
              {isAdmin && <TabsTrigger value="manager">Gerentes</TabsTrigger>}
            </TabsList>

            <TabsContent value={tab}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <DataTable
                  table={table}
                  toolbarProps={{
                    searchPlaceholder: "Buscar por nome ou e-mail...",
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <ManagedUserForm
            key={editingUser ? `edit-${editingUser.id}` : `create-${tab}`}
            editingUser={editingUser}
            singular={singular}
            isSubmitting={isSubmitting}
            onCancel={closeModal}
            onSubmit={handleFormSubmit}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={userToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setUserToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {userToDelete?.name} (
              {userToDelete?.email})? Se não houver roteiros vinculados, o
              usuário será excluído permanentemente. Caso contrário, será
              arquivado (podendo ser restaurado depois) e o acesso dele será
              bloqueado imediatamente.
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
                if (userToDelete) {
                  deleteMutation.mutate({ id: userToDelete.id });
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
