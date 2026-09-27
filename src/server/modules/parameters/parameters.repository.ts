import { eq } from "drizzle-orm";

import type { Database } from "@/server/db";
import { parameter } from "@/server/db/schemas/parameters";

import type { NewParameter, Parameter } from "./parameters.types";

const PARAMETER_ID = "system";

export class ParametersRepository {
  constructor(private readonly db: Database) {}

  async find() {
    const [row] = await this.db
      .select()
      .from(parameter)
      .where(eq(parameter.id, PARAMETER_ID))
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async upsert(input: NewParameter) {
    const fuelPricePerLiter = Math.round(input.fuelPricePerLiter * 100);
    const [row] = await this.db
      .insert(parameter)
      .values({
        id: PARAMETER_ID,
        fuelPricePerLiter,
        standardWorkdayDuration: input.standardWorkdayDuration,
      })
      .onConflictDoUpdate({
        target: parameter.id,
        set: {
          fuelPricePerLiter,
          standardWorkdayDuration: input.standardWorkdayDuration,
          updatedAt: new Date(),
        },
      })
      .returning();
    return this.toDomain(row);
  }

  private toDomain(row: typeof parameter.$inferSelect): Parameter {
    return {
      ...row,
      fuelPricePerLiter: row.fuelPricePerLiter / 100,
    };
  }
}
