import type { Database } from "@/server/db";

import { DriversRepository } from "./drivers.repository";
import { DriversService } from "./drivers.service";
import type {
  CreateDriverInput,
  CreateManagerInput,
  DriverOutput,
  ListDriversInput,
  UpdateDriverInput,
} from "./drivers.types";

export class DriversController {
  private readonly service: DriversService;

  constructor(db: Database) {
    this.service = new DriversService(new DriversRepository(db));
  }

  createDriver(input: CreateDriverInput): Promise<DriverOutput> {
    return this.service.createDriver(input);
  }

  createManager(input: CreateManagerInput): Promise<DriverOutput> {
    return this.service.createManager(input);
  }

  getDriver(id: string): Promise<DriverOutput> {
    return this.service.getDriver(id);
  }

  listDrivers(input: ListDriversInput) {
    return this.service.listDrivers(input);
  }

  updateDriver(id: string, input: UpdateDriverInput): Promise<DriverOutput> {
    return this.service.updateDriver(id, input);
  }

  deleteDriver(id: string): Promise<void> {
    return this.service.deleteDriver(id);
  }

  restoreDriver(id: string): Promise<DriverOutput> {
    return this.service.restoreDriver(id);
  }
}
