import { and, eq, isNotNull, isNull } from "drizzle-orm";

import type { Database } from "@/server/db";
import { vehicle } from "@/server/db/schemas/fleet";
import { route, routeVersion } from "@/server/db/schemas/routes";

import type { NewVehicle } from "./fleet.types";

export class FleetRepository {
  constructor(private readonly db: Database) {}

  async findMany(options?: { activeOnly?: boolean; includeDeleted?: boolean }) {
    const conditions = [];

    if (!options?.includeDeleted) {
      conditions.push(isNull(vehicle.deletedAt));
    }

    if (options?.activeOnly) {
      conditions.push(eq(vehicle.active, true));
    }

    return this.db
      .select()
      .from(vehicle)
      .where(and(...conditions));
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(vehicle)
      .where(and(eq(vehicle.id, id), isNull(vehicle.deletedAt)))
      .limit(1);

    return row || null;
  }

  async findByIdIncludingDeleted(id: string) {
    const [row] = await this.db
      .select()
      .from(vehicle)
      .where(eq(vehicle.id, id))
      .limit(1);

    return row || null;
  }

  async findByPlate(plate: string) {
    const [row] = await this.db
      .select()
      .from(vehicle)
      .where(and(eq(vehicle.plate, plate), isNull(vehicle.deletedAt)))
      .limit(1);

    return row || null;
  }

  async findByPlateIncludingDeleted(plate: string) {
    const [row] = await this.db
      .select()
      .from(vehicle)
      .where(eq(vehicle.plate, plate))
      .limit(1);

    return row || null;
  }

  async hasRouteHistory(id: string) {
    const [routeRef] = await this.db
      .select({ id: route.id })
      .from(route)
      .where(eq(route.vehicleId, id))
      .limit(1);
    if (routeRef) return true;

    const [versionRef] = await this.db
      .select({ id: routeVersion.id })
      .from(routeVersion)
      .where(eq(routeVersion.vehicleId, id))
      .limit(1);
    return !!versionRef;
  }

  async create(input: NewVehicle) {
    const [row] = await this.db.insert(vehicle).values(input).returning();

    return row;
  }

  async update(id: string, input: Partial<NewVehicle>) {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.plate !== undefined) {
      updateData.plate = input.plate;
    }
    if (input.model !== undefined) {
      updateData.model = input.model;
    }
    if (input.kmPerLiterHundredths !== undefined) {
      updateData.kmPerLiterHundredths = input.kmPerLiterHundredths;
    }
    if (input.active !== undefined) {
      updateData.active = input.active;
    }

    const [row] = await this.db
      .update(vehicle)
      .set(updateData)
      .where(and(eq(vehicle.id, id), isNull(vehicle.deletedAt)))
      .returning();

    return row || null;
  }

  async softDelete(id: string) {
    const [row] = await this.db
      .update(vehicle)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(vehicle.id, id), isNull(vehicle.deletedAt)))
      .returning();

    return !!row;
  }

  async hardDelete(id: string) {
    const [row] = await this.db
      .delete(vehicle)
      .where(and(eq(vehicle.id, id), isNull(vehicle.deletedAt)))
      .returning();

    return !!row;
  }

  async restore(id: string) {
    const [row] = await this.db
      .update(vehicle)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(vehicle.id, id), isNotNull(vehicle.deletedAt)))
      .returning();

    return row || null;
  }
}
