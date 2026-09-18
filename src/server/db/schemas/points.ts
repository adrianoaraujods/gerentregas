import {
  index,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const geocodeStatusEnum = pgEnum("geocode_status", [
  "success",
  "failed",
  "manual",
]);

export const point = pgTable(
  "point",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    address: text("address").notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    geocodeStatus: geocodeStatusEnum("geocode_status")
      .notNull()
      .default("failed"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("point_deleted_at_idx").on(table.deletedAt)],
);

export type Point = typeof point.$inferSelect;
export type NewPoint = typeof point.$inferInsert;
