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
import { DebounceInput } from "@/components/ui/debounce-input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api/client";
import type { RouterOutputs } from "@/server/api/router";

const PAGE_SIZE = 10;

type ManagedUser = RouterOutputs["drivers"]["list"]["drivers"][number];
type ManagedRole = "driver" | "manager";

export function DriversManagement({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<ManagedRole>("driver");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");

  const utils = api.useUtils();

  const { data, isLoading } = api.drivers.list.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    role: tab,
    search: search.trim() ? search.trim() : undefined,
  });

  const users = data?.drivers ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleTabChange = (value: string) => {
    setTab(value as ManagedRole);
    setPage(0);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
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

  const handleDelete = (user: ManagedUser) => {
    if (
      confirm(`Tem certeza que deseja excluir ${user.name} (${user.email})?`)
    ) {
      deleteMutation.mutate({ id: user.id });
    }
  };

  const isSubmitting =
    createDriverMutation.isPending ||
    createManagerMutation.isPending ||
    updateMutation.isPending;

  const isManagerTab = tab === "manager";
  const singular = isManagerTab ? "Gerente" : "Motorista";
  const plural = isManagerTab ? "Gerentes" : "Motoristas";

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="driver">Motoristas</TabsTrigger>
                {isAdmin && <TabsTrigger value="manager">Gerentes</TabsTrigger>}
              </TabsList>
              <DebounceInput
                placeholder="Buscar por nome ou e-mail..."
                defaultValue={search}
                onDebounce={handleSearch}
                className="sm:max-w-xs"
                aria-label="Buscar usuários"
              />
            </div>

            <TabsContent value={tab}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {search.trim()
                    ? `Nenhum resultado para "${search.trim()}".`
                    : `Nenhum ${plural.toLowerCase()} cadastrado.`}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone ?? "—"}</TableCell>
                          <TableCell className="font-mono">
                            {user.document ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.role === "driver" ? "secondary" : "default"
                              }
                            >
                              {user.role === "driver"
                                ? "Motorista"
                                : user.role === "manager"
                                  ? "Gerente"
                                  : "Admin"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(user)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(user)}
                              disabled={deleteMutation.isPending}
                            >
                              Excluir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between pt-4">
                    <span className="text-sm text-muted-foreground">
                      {total} resultado{total === 1 ? "" : "s"} — página{" "}
                      {page + 1} de {totalPages}
                    </span>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page + 1 >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </>
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
    </div>
  );
}
