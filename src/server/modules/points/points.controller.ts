import type { Database } from "@/server/db";
import { createGeocoder } from "./geocoder";
import { PointsRepository } from "./points.repository";
import { PointsService } from "./points.service";
import type {
  CreatePointInput,
  ListPointsInput,
  PointOutput,
  PointsListOutput,
  UpdatePointInput,
} from "./points.types";

export class PointsController {
  private readonly service: PointsService;

  constructor(db: Database) {
    this.service = new PointsService(
      new PointsRepository(db),
      createGeocoder(),
    );
  }

  createPoint(input: CreatePointInput): Promise<PointOutput> {
    return this.service.createPoint(input);
  }

  getPoint(id: string): Promise<PointOutput> {
    return this.service.getPoint(id);
  }

  listPoints(input: ListPointsInput): Promise<PointsListOutput> {
    return this.service.listPoints(input);
  }

  updatePoint(id: string, input: UpdatePointInput): Promise<PointOutput> {
    return this.service.updatePoint(id, input);
  }

  deletePoint(id: string): Promise<void> {
    return this.service.deletePoint(id);
  }

  restorePoint(id: string): Promise<PointOutput> {
    return this.service.restorePoint(id);
  }
}
