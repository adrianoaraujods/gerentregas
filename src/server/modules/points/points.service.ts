import { BadRequestError, NotFoundError } from "@/server/api";
import type { GeocodeResult, Geocoder } from "./geocoder";

import type { PointsRepository } from "./points.repository";
import type {
  CreatePointInput,
  ListPointsInput,
  PointOutput,
  PointsListOutput,
  PointWithDeletedAt,
  UpdatePointInput,
} from "./points.types";
import { createPointInputSchema, updatePointInputSchema } from "./points.types";

export class PointsService {
  constructor(
    private readonly repository: PointsRepository,
    private readonly geocoder: Geocoder,
  ) {}

  async createPoint(input: CreatePointInput): Promise<PointOutput> {
    const validated = createPointInputSchema.parse(input);

    let latitude: number | null = validated.latitude ?? null;
    let longitude: number | null = validated.longitude ?? null;
    let geocodeStatus: "success" | "failed" | "manual" = "failed";

    if (validated.latitude !== undefined && validated.longitude !== undefined) {
      geocodeStatus = "manual";
    } else {
      const geocodeResult = await this.geocodeWithFallback(validated.address);
      if (geocodeResult) {
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;
        geocodeStatus = "success";
      } else {
        geocodeStatus = "failed";
      }
    }

    const point = await this.repository.create({
      name: validated.name,
      address: validated.address,
      latitude,
      longitude,
      geocodeStatus,
    });

    if (!point) {
      throw new BadRequestError("Falha ao criar ponto.");
    }

    return point;
  }

  async getPoint(id: string): Promise<PointOutput> {
    const point = await this.repository.findById(id);
    if (!point) {
      throw new NotFoundError("Ponto não encontrado.");
    }
    return point;
  }

  async listPoints(input: ListPointsInput): Promise<PointsListOutput> {
    return this.repository.list(input);
  }

  async updatePoint(id: string, input: UpdatePointInput): Promise<PointOutput> {
    const validated = updatePointInputSchema.parse(input);

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Ponto não encontrado.");
    }

    let latitude: number | null | undefined = validated.latitude;
    let longitude: number | null | undefined = validated.longitude;
    let geocodeStatus: "success" | "failed" | "manual" | undefined;

    const coordinatesProvided =
      validated.latitude !== undefined && validated.longitude !== undefined;
    const coordinatesChanged =
      coordinatesProvided &&
      (validated.latitude !== existing.latitude ||
        validated.longitude !== existing.longitude);

    if (
      validated.address !== undefined &&
      validated.address !== existing.address
    ) {
      if (coordinatesChanged) {
        geocodeStatus = "manual";
      } else {
        const geocodeResult = await this.geocodeWithFallback(validated.address);
        if (geocodeResult) {
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
          geocodeStatus = "success";
        } else {
          latitude = null;
          longitude = null;
          geocodeStatus = "failed";
        }
      }
    } else if (coordinatesChanged) {
      geocodeStatus = "manual";
    }

    const updated = await this.repository.update(id, {
      name: validated.name,
      address: validated.address,
      latitude,
      longitude,
      geocodeStatus,
    });

    if (!updated) {
      throw new NotFoundError("Ponto não encontrado.");
    }

    return updated;
  }

  async deletePoint(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Ponto não encontrado.");
    }

    await this.repository.softDelete(id);
  }

  async restorePoint(id: string): Promise<PointOutput> {
    const existing = (await this.repository.findById(
      id,
      true,
    )) as PointWithDeletedAt | null;
    if (!existing) {
      throw new NotFoundError("Ponto não encontrado.");
    }
    if (!existing.deletedAt) {
      throw new BadRequestError("Ponto não está excluído.");
    }

    const restored = await this.repository.restore(id);
    if (!restored) {
      throw new NotFoundError("Ponto não encontrado.");
    }
    return restored;
  }

  private async geocodeWithFallback(
    address: string,
  ): Promise<GeocodeResult | null> {
    try {
      return await this.geocoder.geocode(address);
    } catch {
      return null;
    }
  }
}
