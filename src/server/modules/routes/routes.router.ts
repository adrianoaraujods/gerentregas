import { z } from "zod";
import {
  adminProcedure,
  authenticatedProcedure,
  createRouter,
  driverProcedure,
  managerProcedure,
} from "@/server/api";
import type { Database } from "@/server/db";

import { RoutesController } from "./routes.controller";
import {
  addStopInputSchema,
  checkInInputSchema,
  checkOutInputSchema,
  correctTimestampsInputSchema,
  createRouteInputSchema,
  driverRouteOutputSchema,
  listRoutesInputSchema,
  routeHistoryOutputSchema,
  routesListOutputSchema,
  routeWithStopsOutputSchema,
  startShiftInputSchema,
  updateRouteInputSchema,
  updateStopInputSchema,
} from "./routes.types";

function createController(db: Database) {
  return new RoutesController(db);
}

export const routesRouter = createRouter({
  create: managerProcedure
    .input(createRouteInputSchema)
    .mutation(({ ctx: { db, session }, input }) =>
      createController(db)
        .createRoute(input, session.user.id)
        .then(routeWithStopsOutputSchema.parse),
    ),

  list: managerProcedure
    .input(listRoutesInputSchema)
    .query(({ ctx: { db }, input }) =>
      createController(db).listRoutes(input).then(routesListOutputSchema.parse),
    ),

  get: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx: { db }, input }) =>
      createController(db)
        .getRoute(input.id)
        .then(routeWithStopsOutputSchema.parse),
    ),

  update: managerProcedure
    .input(z.object({ id: z.string().uuid() }).merge(updateRouteInputSchema))
    .mutation(({ ctx: { db, session }, input }) => {
      const { id, ...data } = input;
      return createController(db)
        .updateRoute(id, data, session.user.id)
        .then(routeWithStopsOutputSchema.parse);
    }),

  addStop: managerProcedure
    .input(addStopInputSchema)
    .mutation(({ ctx: { db, session }, input }) =>
      createController(db)
        .addStop(input.routeId, input, session.user.id)
        .then(routeWithStopsOutputSchema.parse),
    ),

  updateStop: managerProcedure
    .input(
      z
        .object({
          routeId: z.string().uuid(),
          stopId: z.string().uuid(),
        })
        .merge(updateStopInputSchema),
    )
    .mutation(({ ctx: { db, session }, input }) => {
      const { routeId, stopId, ...data } = input;
      return createController(db)
        .updateStop(routeId, stopId, data, session.user.id)
        .then(routeWithStopsOutputSchema.parse);
    }),

  concludeStop: managerProcedure
    .input(z.object({ routeId: z.string().uuid(), stopId: z.string().uuid() }))
    .mutation(({ ctx: { db }, input }) =>
      createController(db)
        .concludeStop(input.routeId, input.stopId)
        .then(routeWithStopsOutputSchema.parse),
    ),

  concludeRoute: managerProcedure
    .input(z.object({ routeId: z.string().uuid() }))
    .mutation(({ ctx: { db, session }, input }) =>
      createController(db)
        .concludeRoute(input.routeId, session.user.id)
        .then(routeWithStopsOutputSchema.parse),
    ),

  deleteStop: managerProcedure
    .input(z.object({ routeId: z.string().uuid(), stopId: z.string().uuid() }))
    .mutation(({ ctx: { db, session }, input }) =>
      createController(db)
        .deleteStop(input.routeId, input.stopId, session.user.id)
        .then(routeWithStopsOutputSchema.parse),
    ),

  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx: { db }, input }) =>
      createController(db).softDeleteRoute(input.id),
    ),

  restore: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx: { db }, input }) =>
      createController(db)
        .restoreRoute(input.id)
        .then(routeWithStopsOutputSchema.parse),
    ),

  history: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx: { db }, input }) =>
      createController(db)
        .getRouteHistory(input.id)
        .then(routeHistoryOutputSchema.parse),
    ),

  getMyRouteWithDwell: driverProcedure
    .input(
      z.object({
        date: z.iso.datetime({ local: true }).optional(),
      }),
    )
    .query(({ ctx: { db, session }, input }) => {
      const date = input.date ? new Date(input.date) : new Date();
      return createController(db)
        .getDriverRouteWithDwell(session.user.id, date)
        .then((result) =>
          result ? driverRouteOutputSchema.parse(result) : null,
        );
    }),

  startShift: driverProcedure
    .input(
      z.object({ routeId: z.string().uuid() }).merge(startShiftInputSchema),
    )
    .mutation(({ ctx: { db, session }, input }) => {
      const { routeId, ...data } = input;
      return createController(db)
        .startShift(routeId, data, session.user.id)
        .then(routeWithStopsOutputSchema.parse);
    }),

  checkIn: driverProcedure
    .input(checkInInputSchema)
    .mutation(({ ctx: { db, session }, input }) =>
      createController(db).checkIn(input.stopId, session.user.id),
    ),

  checkOut: driverProcedure
    .input(checkOutInputSchema)
    .mutation(({ ctx: { db, session }, input }) =>
      createController(db).checkOut(input.stopId, session.user.id),
    ),

  correctTimestamps: authenticatedProcedure
    .input(
      z
        .object({
          routeId: z.string().uuid(),
          stopId: z.string().uuid(),
        })
        .merge(correctTimestampsInputSchema),
    )
    .mutation(({ ctx: { db, session }, input }) => {
      const { routeId, stopId, ...data } = input;
      const isManager = ["manager", "admin"].includes(
        session.user.role as string,
      );
      return createController(db).correctTimestamps(
        routeId,
        stopId,
        data,
        session.user.id,
        isManager,
      );
    }),
});
