import { BadRequestError, ConflictError, NotFoundError } from "@/server/api";

import type { FleetRepository } from "./fleet.repository";
import type {
  CreateVehicleInput,
  DeleteVehicleOutput,
  UpdateVehicleInput,
} from "./fleet.types";
import {
  createVehicleInputSchema,
  updateVehicleInputSchema,
} from "./fleet.types";

const ARCHIVED_PLATE_MESSAGE =
  "Já existe um veículo arquivado com esta placa. Restaure-o na listagem da frota.";

const LIVE_PLATE_MESSAGE = "Já existe um veículo cadastrado com esta placa.";

export class FleetService {
  constructor(private readonly repository: FleetRepository) {}

  async list(input?: { activeOnly?: boolean; includeDeleted?: boolean }) {
    return this.repository.findMany(input);
  }

  async getById(id: string) {
    const v = await this.repository.findByIdIncludingDeleted(id);
    if (!v) {
      throw new NotFoundError("Veículo não encontrado.");
    }
    return v;
  }

  async create(input: CreateVehicleInput) {
    const validated = createVehicleInputSchema.parse(input);
    const plate = validated.plate.toUpperCase();
    const existing = await this.repository.findByPlateIncludingDeleted(plate);
    if (existing) {
      throw new ConflictError(
        existing.deletedAt ? ARCHIVED_PLATE_MESSAGE : LIVE_PLATE_MESSAGE,
      );
    }

    return this.repository.create({
      id: crypto.randomUUID(),
      plate,
      model: validated.model,
      kmPerLiterHundredths: Math.round(validated.kmPerLiter * 100),
      active: validated.active ?? true,
    });
  }

  async update(input: UpdateVehicleInput) {
    const validated = updateVehicleInputSchema.parse(input);
    const plate = validated.plate.toUpperCase();
    const current = await this.repository.findById(validated.id);
    if (!current) {
      throw new NotFoundError("Veículo não encontrado.");
    }

    if (plate !== current.plate.toUpperCase()) {
      const existing = await this.repository.findByPlateIncludingDeleted(plate);
      if (existing && existing.id !== validated.id) {
        throw new ConflictError(
          existing.deletedAt
            ? ARCHIVED_PLATE_MESSAGE
            : "Já existe outro veículo cadastrado com esta placa.",
        );
      }
    }

    const updated = await this.repository.update(validated.id, {
      plate,
      model: validated.model,
      kmPerLiterHundredths: Math.round(validated.kmPerLiter * 100),
      active: validated.active,
    });

    if (!updated) {
      throw new NotFoundError("Veículo não encontrado.");
    }

    return updated;
  }

  async delete(id: string): Promise<DeleteVehicleOutput> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Veículo não encontrado.");
    }

    if (await this.repository.hasRouteHistory(id)) {
      const success = await this.repository.softDelete(id);
      if (!success) {
        throw new NotFoundError("Veículo não encontrado.");
      }
      return { success: true, result: "archived" };
    }

    const success = await this.repository.hardDelete(id);
    if (!success) {
      throw new NotFoundError("Veículo não encontrado.");
    }
    return { success: true, result: "deleted" };
  }

  async restore(id: string) {
    const existing = await this.repository.findByIdIncludingDeleted(id);
    if (!existing) {
      throw new NotFoundError("Veículo não encontrado.");
    }
    if (!existing.deletedAt) {
      throw new BadRequestError("Veículo não está arquivado.");
    }

    const restored = await this.repository.restore(id);
    if (!restored) {
      throw new NotFoundError("Veículo não encontrado.");
    }
    return restored;
  }
}
