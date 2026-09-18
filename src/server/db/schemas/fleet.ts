import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const vehicle = pgTable("vehicle", {
  id: text("id").primaryKey(),
  plate: text("plate").notNull().unique(),
  model: text("model").notNull(),
  kmPerLiterHundredths: integer("km_per_liter_hundredths").notNull(),
  active: boolean("active").default(true).notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
