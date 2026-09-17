import { createRouter, managerProcedure } from "@/server/api";

import { ParametersController } from "./parameters.controller";
import { ParametersRepository } from "./parameters.repository";
import { ParametersService } from "./parameters.service";
import {
  parameterOutputSchema,
  updateParametersInputSchema,
} from "./parameters.types";

function createController(db: ParametersRepository["db"]) {
  return new ParametersController(
    new ParametersService(new ParametersRepository(db)),
  );
}

export const parametersRouter = createRouter({
  get: managerProcedure.query(({ ctx: { db } }) =>
    createController(db).get().then(parameterOutputSchema.parse),
  ),
  update: managerProcedure
    .input(updateParametersInputSchema)
    .mutation(({ ctx: { db }, input }) =>
      createController(db).update(input).then(parameterOutputSchema.parse),
    ),
});
