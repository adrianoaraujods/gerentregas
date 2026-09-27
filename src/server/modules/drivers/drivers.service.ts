import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/api";

import type { DriversRepository } from "./drivers.repository";
import type {
  CreateDriverInput,
  CreateManagerInput,
  DeleteUserOutput,
  DriverOutput,
  ListDriversInput,
  UpdateDriverInput,
} from "./drivers.types";

const ARCHIVED_EMAIL_MESSAGE =
  "Já existe um usuário arquivado com este e-mail. Restaure-o para reativar o acesso.";

const LIVE_EMAIL_MESSAGE = "Já existe um usuário com este e-mail.";

const MANAGE_NON_DRIVER_MESSAGE =
  "Apenas administradores podem excluir ou restaurar gerentes e administradores.";

export class DriversService {
  constructor(private readonly repository: DriversRepository) {}

  private async assertEmailAvailable(email: string) {
    const existing = await this.repository.findByEmailIncludingDeleted(email);
    if (existing) {
      throw new ConflictError(
        existing.deletedAt ? ARCHIVED_EMAIL_MESSAGE : LIVE_EMAIL_MESSAGE,
      );
    }
  }

  async createDriver(input: CreateDriverInput): Promise<DriverOutput> {
    await this.assertEmailAvailable(input.email);

    const driver = await this.repository.create({
      ...input,
      role: "driver",
    });
    if (!driver) {
      throw new BadRequestError("Falha ao criar motorista.");
    }
    return driver;
  }

  async createManager(input: CreateManagerInput): Promise<DriverOutput> {
    await this.assertEmailAvailable(input.email);

    const manager = await this.repository.create({
      ...input,
      role: "manager",
    });
    if (!manager) {
      throw new BadRequestError("Falha ao criar gerente.");
    }
    return manager;
  }

  async getDriver(id: string): Promise<DriverOutput> {
    const driver = await this.repository.findById(id);
    if (!driver) {
      throw new NotFoundError("Motorista não encontrado.");
    }
    return driver;
  }

  async listDrivers(input: ListDriversInput, isAdmin = false) {
    if (!isAdmin && input.role && input.role !== "driver") {
      throw new ForbiddenError(
        "Apenas administradores podem listar gerentes e administradores.",
      );
    }
    return this.repository.list(input, isAdmin);
  }

  async updateDriver(
    id: string,
    input: UpdateDriverInput,
  ): Promise<DriverOutput> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Motorista não encontrado.");
    }

    if (input.document) {
      const duplicate = await this.repository.findByEmail(existing.email);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError("Já existe um usuário com este documento.");
      }
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new NotFoundError("Motorista não encontrado.");
    }
    return updated;
  }

  async deleteDriver(id: string, isAdmin = false): Promise<DeleteUserOutput> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Motorista não encontrado.");
    }
    if (!isAdmin && existing.role !== "driver") {
      throw new ForbiddenError(MANAGE_NON_DRIVER_MESSAGE);
    }

    if (await this.repository.hasRouteHistory(id)) {
      const archived = await this.repository.archive(id);
      if (!archived) {
        throw new NotFoundError("Motorista não encontrado.");
      }
      return { success: true, result: "archived" };
    }

    const deleted = await this.repository.hardDelete(id);
    if (!deleted) {
      throw new NotFoundError("Motorista não encontrado.");
    }
    return { success: true, result: "deleted" };
  }

  async restoreDriver(id: string, isAdmin = false): Promise<DriverOutput> {
    const existing = await this.repository.findByIdIncludingDeleted(id);
    if (!existing) {
      throw new NotFoundError("Motorista não encontrado.");
    }
    if (!isAdmin && existing.role !== "driver") {
      throw new ForbiddenError(MANAGE_NON_DRIVER_MESSAGE);
    }
    if (!existing.deletedAt) {
      throw new BadRequestError("Motorista não está excluído.");
    }

    const restored = await this.repository.restore(id);
    if (!restored) {
      throw new NotFoundError("Motorista não encontrado.");
    }

    const driver = await this.repository.findById(id);
    if (!driver) {
      throw new NotFoundError("Motorista não encontrado.");
    }
    return driver;
  }
}
