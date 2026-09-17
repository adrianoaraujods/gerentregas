import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const parameter = pgTable("parameter", {
  id: text("id").primaryKey(),
  fuelPricePerLiter: integer("fuel_price_per_liter").notNull(),
  standardWorkdayDuration: integer("standard_workday_duration").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type Parameter = typeof parameter.$inferSelect;
export type NewParameter = typeof parameter.$inferInsert;
