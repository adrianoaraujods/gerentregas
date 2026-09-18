import { ConflictError, NotFoundError } from "@/server/api";

import type { FleetRepository } from "./fleet.repository";
import type { CreateVehicleInput, UpdateVehicleInput } from "./fleet.types";
import { createVehicleInputSchema, updateVehicleInputSchema } from "./fleet.types";

export class FleetService {
  constructor(private readonly repository: FleetRepository) {}

  async list(input?: { activeOnly?: boolean }) {
    return this.repository.findMany(input);
  }

  async getById(id: string) {
    const v = await this.repository.findById(id);
    if (!v) {
      throw new NotFoundError("Veículo não encontrado.");
    }
    return v;
  }

  async create(input: CreateVehicleInput) {
    const validated = createVehicleInputSchema.parse(input);
    const plate = validated.plate.toUpperCase();
    const existing = await this.repository.findByPlate(plate);
    if (existing) {
      throw new ConflictError(
        "Já existe um veículo cadastrado com esta placa.",
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
      const existing = await this.repository.findByPlate(plate);
      if (existing && existing.id !== validated.id) {
        throw new ConflictError(
          "Já existe outro veículo cadastrado com esta placa.",
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

  async delete(id: string) {
    const success = await this.repository.softDelete(id);
    if (!success) {
      throw new NotFoundError("Veículo não encontrado.");
    }
    return { success: true };
  }
}
