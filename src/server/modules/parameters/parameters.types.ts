import { z } from "zod";

export const parameterOutputSchema = z.object({
  id: z.string(),
  fuelPricePerLiter: z.number(),
  standardWorkdayDuration: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Parameter = z.infer<typeof parameterOutputSchema>;
export type ParameterOutput = Parameter;

export type NewParameter = {
  fuelPricePerLiter: number;
  standardWorkdayDuration: number;
};

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
