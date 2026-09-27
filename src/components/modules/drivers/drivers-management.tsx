"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  createAppColumnHelper,
  DataTable,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api/client";
import type { RouterOutputs } from "@/server/api/router";

const columnHelper = createAppColumnHelper<ManagedUser>();

const ROLE_OPTIONS = [
  { label: "Motorista", value: "driver" },
  { label: "Gerente", value: "manager" },
  { label: "Admin", value: "admin" },
];

type ManagedUser = RouterOutputs["drivers"]["list"]["drivers"][number];
type ManagedRole = "driver" | "manager";

export function DriversManagement({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<ManagedRole>("driver");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");

  const utils = api.useUtils();

  const { data, isLoading } = api.drivers.list.useQuery(
    {
      limit: 1000,
      offset: 0,
      role: tab,
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
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso!");
      invalidate();
      setUserToDelete(null);
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao excluir usuário");
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setDocument("");
    setIsModalOpen(true);
  };

  const openEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setPhone(user.phone ?? "");
    setDocument("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    if (!/^\+\d{10,15}$/.test(phone)) {
      toast.error("Telefone deve estar no formato E.164 (ex: +5511999999999).");
      return;
    }
    if (document && !/^\d{11}$/.test(document)) {
      toast.error("CPF deve ter 11 dígitos.");
      return;
    }

    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        name: name.trim(),
        phone,
        ...(document ? { document } : {}),
      });
      return;
    }

    if (!email.trim()) {
      toast.error("Informe o e-mail.");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (tab === "manager") {
      createManagerMutation.mutate({
        name: name.trim(),
        email: email.trim(),
        password,
        phone,
        document,
        role: "manager",
      });
    } else {
      createDriverMutation.mutate({
        name: name.trim(),
        email: email.trim(),
        password,
        phone,
        document,
      });
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
        cell: ({ getValue }) => getValue() ?? "—",
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
      columnHelper.display({
        id: "acoes",
        header: () => <div className="text-right">Ações</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditModal(row.original)}
            >
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setUserToDelete(row.original)}
              disabled={deleteMutation.isPending}
            >
              Excluir
            </Button>
          </div>
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
          <form onSubmit={handleSubmit}>
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

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="user-name">Nome</Label>
                <Input
                  id="user-name"
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {!editingUser && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="user-email">E-mail</Label>
                    <Input
                      id="user-email"
                      type="email"
                      placeholder="Ex: joao@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="user-password">Senha</Label>
                    <Input
                      id="user-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <Label htmlFor="user-phone">Telefone (E.164)</Label>
                <Input
                  id="user-phone"
                  placeholder="Ex: +5511999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-document">CPF (11 dígitos)</Label>
                <Input
                  id="user-document"
                  inputMode="numeric"
                  placeholder={
                    editingUser
                      ? "Deixe vazio para manter o CPF atual"
                      : "Ex: 12345678901"
                  }
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  disabled={isSubmitting}
                  required={!editingUser}
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
                  : editingUser
                    ? "Salvar alterações"
                    : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
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
              {userToDelete?.email})? Esta ação não pode ser desfeita.
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
