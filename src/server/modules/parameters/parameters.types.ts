import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";

import { parameter } from "@/server/db/schemas/parameters";

export const parameterSchema = createSelectSchema(parameter);
export type Parameter = z.infer<typeof parameterSchema>;

export const newParameterSchema = createInsertSchema(parameter);
export type NewParameter = z.infer<typeof newParameterSchema>;

export const parameterOutputSchema = parameterSchema.transform((p) => ({
  ...p,
  fuelPricePerLiter: p.fuelPricePerLiter / 100,
}));
export type ParameterOutput = z.infer<typeof parameterOutputSchema>;

export const updateParametersInputSchema = z.object({
  fuelPricePerLiter: z
    .number()
    .positive("Preço do combustível deve ser positivo"),
  standardWorkdayDuration: z
    .number()
    .int()
    .positive("Duração da jornada padrão deve ser positiva"),
});
export type UpdateParametersInput = z.infer<typeof updateParametersInputSchema>;
