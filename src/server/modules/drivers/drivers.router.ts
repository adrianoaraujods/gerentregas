import { z } from "zod";
import { adminProcedure, createRouter, managerProcedure } from "@/server/api";
import type { Database } from "@/server/db";

import { DriversController } from "./drivers.controller";
import {
  createDriverInputSchema,
  createManagerInputSchema,
  driverOutputSchema,
  driversListOutputSchema,
  listDriversInputSchema,
  updateDriverInputSchema,
} from "./drivers.types";

function createController(db: Database) {
  return new DriversController(db);
}

export const driversRouter = createRouter({
  create: managerProcedure
    .input(createDriverInputSchema)
    .mutation(({ ctx: { db }, input }) =>
      createController(db).createDriver(input).then(driverOutputSchema.parse),
    ),

  createManager: adminProcedure
    .input(createManagerInputSchema)
    .mutation(({ ctx: { db }, input }) =>
      createController(db).createManager(input).then(driverOutputSchema.parse),
    ),

  list: managerProcedure
    .input(listDriversInputSchema)
    .query(({ ctx: { db, session }, input }) =>
      createController(db)
        .listDrivers(input, session.user.role === "admin")
        .then(driversListOutputSchema.parse),
    ),

  get: managerProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx: { db }, input }) =>
      createController(db).getDriver(input.id).then(driverOutputSchema.parse),
    ),

  update: managerProcedure
    .input(z.object({ id: z.string() }).merge(updateDriverInputSchema))
    .mutation(({ ctx: { db }, input }) => {
      const { id, ...data } = input;
      return createController(db)
        .updateDriver(id, data)
        .then(driverOutputSchema.parse);
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx: { db, session }, input }) =>
      createController(db).deleteDriver(
        input.id,
        session.user.role === "admin",
      ),
    ),

  restore: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx: { db, session }, input }) =>
      createController(db)
        .restoreDriver(input.id, session.user.role === "admin")
        .then(driverOutputSchema.parse),
    ),
});
