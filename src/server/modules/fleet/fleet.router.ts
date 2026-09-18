import { z } from "zod";
import {
  authenticatedProcedure,
  createRouter,
  managerProcedure,
} from "@/server/api";

import { FleetController } from "./fleet.controller";
import {
  createVehicleInputSchema,
  listVehiclesInputSchema,
  updateVehicleInputSchema,
} from "./fleet.types";

export const fleetRouter = createRouter({
  list: authenticatedProcedure
    .input(listVehiclesInputSchema)
    .query(({ ctx: { db, session }, input }) => {
      const isManager =
        session.user.role === "manager" || session.user.role === "admin";
      const safeInput = isManager ? input : { ...input, activeOnly: true };
      return new FleetController(db).list(safeInput);
    }),

  getById: authenticatedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx: { db }, input }) =>
      new FleetController(db).getById(input.id),
    ),

  create: managerProcedure
    .input(createVehicleInputSchema)
    .mutation(({ ctx: { db }, input }) =>
      new FleetController(db).create(input),
    ),

  update: managerProcedure
    .input(updateVehicleInputSchema)
    .mutation(({ ctx: { db }, input }) =>
      new FleetController(db).update(input),
    ),

  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx: { db }, input }) =>
      new FleetController(db).delete(input.id),
    ),
});
