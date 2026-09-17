import { BadRequestError, ConflictError, NotFoundError } from "@/server/api";

import type { DriversRepository } from "./drivers.repository";
import type {
  CreateDriverInput,
  CreateManagerInput,
  DriverOutput,
  ListDriversInput,
  UpdateDriverInput,
} from "./drivers.types";

export class DriversService {
  constructor(private readonly repository: DriversRepository) {}

  async createDriver(input: CreateDriverInput): Promise<DriverOutput> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("Já existe um usuário com este e-mail.");
    }

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
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("Já existe um usuário com este e-mail.");
    }

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

  async listDrivers(input: ListDriversInput) {
    return this.repository.list(input);
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

  async deleteDriver(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Motorista não encontrado.");
    }

    await this.repository.softDelete(id);
  }

  async restoreDriver(id: string): Promise<DriverOutput> {
    const existing = await this.repository.findByIdIncludingDeleted(id);
    if (!existing) {
      throw new NotFoundError("Motorista não encontrado.");
    }
    if (!existing.deletedAt) {
      throw new BadRequestError("Motorista não está excluído.");
    }

    const restored = await this.repository.restore(id);
    if (!restored) {
      throw new NotFoundError("Motorista não encontrado.");
    }
    return this.repository.findById(id) as Promise<DriverOutput>;
  }
}
