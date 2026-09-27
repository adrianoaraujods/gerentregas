import { z } from "zod";
import type { Database } from "@/server/db";
import { FleetRepository } from "./fleet.repository";
import { FleetService } from "./fleet.service";
import type {
  CreateVehicleInput,
  DeleteVehicleOutput,
  ListVehiclesInput,
  UpdateVehicleInput,
  VehicleOutput,
} from "./fleet.types";
import { vehicleOutputSchema } from "./fleet.types";

export class FleetController {
  private readonly service: FleetService;

  constructor(db: Database) {
    this.service = new FleetService(new FleetRepository(db));
  }

  async list(input?: ListVehiclesInput): Promise<VehicleOutput[]> {
    return z.array(vehicleOutputSchema).parse(await this.service.list(input));
  }

  async getById(id: string): Promise<VehicleOutput> {
    return vehicleOutputSchema.parse(await this.service.getById(id));
  }

  async create(input: CreateVehicleInput): Promise<VehicleOutput> {
    return vehicleOutputSchema.parse(await this.service.create(input));
  }

  async update(input: UpdateVehicleInput): Promise<VehicleOutput> {
    return vehicleOutputSchema.parse(await this.service.update(input));
  }

  async delete(id: string): Promise<DeleteVehicleOutput> {
    return this.service.delete(id);
  }

  async restore(id: string): Promise<VehicleOutput> {
    return vehicleOutputSchema.parse(await this.service.restore(id));
  }
}
