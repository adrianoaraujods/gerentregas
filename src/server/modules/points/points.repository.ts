import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "@/server/db";
import { point } from "@/server/db/schemas/points";
import type { NewPoint, PointOutput, PointWithDeletedAt } from "./points.types";

export class PointsRepository {
  constructor(private readonly db: Database) {}

  async create(input: Omit<NewPoint, "id">): Promise<PointOutput | null> {
    const [row] = await this.db
      .insert(point)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();
    return row ? this.toOutput(row) : null;
  }

  async findById(
    id: string,
    includeDeleted = false,
  ): Promise<PointOutput | PointWithDeletedAt | null> {
    const where = includeDeleted
      ? eq(point.id, id)
      : and(eq(point.id, id), isNull(point.deletedAt));

    const [row] = await this.db.select().from(point).where(where).limit(1);
    return row
      ? includeDeleted
        ? this.toOutputWithDeletedAt(row)
        : this.toOutput(row)
      : null;
  }

  async list(input: {
    limit: number;
    offset: number;
    includeDeleted: boolean;
  }) {
    const where = input.includeDeleted ? undefined : isNull(point.deletedAt);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(point)
        .where(where)
        .orderBy(desc(point.createdAt))
        .limit(input.limit)
        .offset(input.offset),
      this.db.select({ total: count() }).from(point).where(where),
    ]);

    return {
      points: rows.map((row) =>
        input.includeDeleted
          ? this.toOutputWithDeletedAt(row)
          : this.toOutput(row),
      ),
      total,
    };
  }

  async update(
    id: string,
    input: Partial<
      Pick<
        NewPoint,
        "name" | "address" | "latitude" | "longitude" | "geocodeStatus"
      >
    >,
  ): Promise<PointOutput | null> {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.address !== undefined) updates.address = input.address;
    if (input.latitude !== undefined) updates.latitude = input.latitude;
    if (input.longitude !== undefined) updates.longitude = input.longitude;
    if (input.geocodeStatus !== undefined)
      updates.geocodeStatus = input.geocodeStatus;
    if (Object.keys(updates).length === 0) return null;

    updates.updatedAt = new Date();

    const [row] = await this.db
      .update(point)
      .set(updates)
      .where(and(eq(point.id, id), isNull(point.deletedAt)))
      .returning();
    return row ? this.toOutput(row) : null;
  }

  async softDelete(id: string): Promise<PointOutput | null> {
    const [row] = await this.db
      .update(point)
      .set({ deletedAt: new Date() })
      .where(and(eq(point.id, id), isNull(point.deletedAt)))
      .returning();
    return row ? this.toOutput(row) : null;
  }

  async restore(id: string): Promise<PointOutput | null> {
    const [row] = await this.db
      .update(point)
      .set({ deletedAt: null })
      .where(and(eq(point.id, id), sql`${point.deletedAt} IS NOT NULL`))
      .returning();
    return row ? this.toOutput(row) : null;
  }

  private toOutput(row: typeof point.$inferSelect): PointOutput {
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      geocodeStatus: row.geocodeStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toOutputWithDeletedAt(
    row: typeof point.$inferSelect,
  ): PointWithDeletedAt {
    return {
      ...this.toOutput(row),
      deletedAt: row.deletedAt,
    };
  }
}
