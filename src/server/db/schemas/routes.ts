import {
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { vehicle } from "./fleet";
import { point } from "./points";

export const routeStatusEnum = pgEnum("route_status", [
  "draft",
  "in_flight",
  "concluded",
  "cancelled",
]);

export const stopVersionTypeEnum = pgEnum("stop_version_type", [
  "structural",
  "correction",
]);

export const route = pgTable(
  "route",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    managerId: text("manager_id")
      .notNull()
      .references(() => user.id),
    driverId: text("driver_id")
      .notNull()
      .references(() => user.id),
    vehicleId: text("vehicle_id").references(() => vehicle.id),
    date: timestamp("date").notNull(),
    status: routeStatusEnum("status").notNull().default("draft"),
    currentVersion: text("current_version").notNull().default("1"),
    distanceKmHundredths: integer("distance_km_hundredths"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("unique_driver_date_idx").on(table.driverId, table.date),
    index("route_manager_id_idx").on(table.managerId),
    index("route_driver_id_idx").on(table.driverId),
    index("route_date_idx").on(table.date),
    index("route_deleted_at_idx").on(table.deletedAt),
  ],
);

export const routeVersion = pgTable(
  "route_version",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    routeId: text("route_id")
      .notNull()
      .references(() => route.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    managerId: text("manager_id")
      .notNull()
      .references(() => user.id),
    driverId: text("driver_id")
      .notNull()
      .references(() => user.id),
    vehicleId: text("vehicle_id").references(() => vehicle.id),
    date: timestamp("date").notNull(),
    status: routeStatusEnum("status").notNull(),
    distanceKmHundredths: integer("distance_km_hundredths"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_route_version_idx").on(table.routeId, table.version),
    index("route_version_route_id_idx").on(table.routeId),
  ],
);

export const stop = pgTable(
  "stop",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    routeId: text("route_id")
      .notNull()
      .references(() => route.id, { onDelete: "cascade" }),
    pointId: text("point_id")
      .notNull()
      .references(() => point.id),
    order: text("order").notNull(),
    addressSnapshot: text("address_snapshot").notNull(),
    latitudeSnapshot: real("latitude_snapshot"),
    longitudeSnapshot: real("longitude_snapshot"),
    arrivalAt: timestamp("arrival_at"),
    departureAt: timestamp("departure_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("unique_route_order_idx").on(table.routeId, table.order),
    index("stop_route_id_idx").on(table.routeId),
    index("stop_point_id_idx").on(table.pointId),
    index("stop_deleted_at_idx").on(table.deletedAt),
  ],
);

export const stopVersion = pgTable(
  "stop_version",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    stopId: text("stop_id")
      .notNull()
      .references(() => stop.id, { onDelete: "cascade" }),
    routeVersionId: text("route_version_id")
      .notNull()
      .references(() => routeVersion.id, { onDelete: "cascade" }),
    order: text("order").notNull(),
    pointId: text("point_id")
      .notNull()
      .references(() => point.id),
    addressSnapshot: text("address_snapshot").notNull(),
    latitudeSnapshot: real("latitude_snapshot"),
    longitudeSnapshot: real("longitude_snapshot"),
    arrivalAt: timestamp("arrival_at"),
    departureAt: timestamp("departure_at"),
    deletedAt: timestamp("deleted_at"),
    versionType: stopVersionTypeEnum("version_type")
      .notNull()
      .default("structural"),
    actorId: text("actor_id").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("stop_version_stop_id_idx").on(table.stopId),
    index("stop_version_route_version_idx").on(table.routeVersionId),
  ],
);

export type Route = typeof route.$inferSelect;
export type NewRoute = typeof route.$inferInsert;
export type RouteVersion = typeof routeVersion.$inferSelect;
export type NewRouteVersion = typeof routeVersion.$inferInsert;
export type Stop = typeof stop.$inferSelect;
export type NewStop = typeof stop.$inferInsert;
export type StopVersion = typeof stopVersion.$inferSelect;
export type NewStopVersion = typeof stopVersion.$inferInsert;
