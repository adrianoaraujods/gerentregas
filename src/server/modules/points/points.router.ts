import { z } from "zod";
import { adminProcedure, createRouter, managerProcedure } from "@/server/api";
import type { Database } from "@/server/db";

import { PointsController } from "./points.controller";
import {
  createPointInputSchema,
  listPointsInputSchema,
  pointOutputSchema,
  pointsListOutputSchema,
  updatePointInputSchema,
} from "./points.types";

function createController(db: Database) {
  return new PointsController(db);
}

export const pointsRouter = createRouter({
  create: managerProcedure
    .input(createPointInputSchema)
    .mutation(({ ctx: { db }, input }) =>
      createController(db).createPoint(input).then(pointOutputSchema.parse),
    ),

  list: managerProcedure
    .input(listPointsInputSchema)
    .query(({ ctx: { db }, input }) =>
      createController(db).listPoints(input).then(pointsListOutputSchema.parse),
    ),

  get: managerProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx: { db }, input }) =>
      createController(db).getPoint(input.id).then(pointOutputSchema.parse),
    ),

  update: managerProcedure
    .input(z.object({ id: z.string() }).merge(updatePointInputSchema))
    .mutation(({ ctx: { db }, input }) => {
      const { id, ...data } = input;
      return createController(db)
        .updatePoint(id, data)
        .then(pointOutputSchema.parse);
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx: { db }, input }) =>
      createController(db).deletePoint(input.id),
    ),

  restore: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx: { db }, input }) =>
      createController(db).restorePoint(input.id).then(pointOutputSchema.parse),
    ),
});
