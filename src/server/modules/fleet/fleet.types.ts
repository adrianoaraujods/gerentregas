import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";

import { normalizePlate, plateSchema } from "@/lib/validators";
import { vehicle } from "@/server/db/schemas/fleet";

export const vehicleSchema = createSelectSchema(vehicle);
export type Vehicle = z.infer<typeof vehicleSchema>;

export const newVehicleSchema = createInsertSchema(vehicle);
export type NewVehicle = z.infer<typeof newVehicleSchema>;

export const vehicleOutputSchema = z
  .object({
    id: z.string(),
    plate: z.string().transform(normalizePlate),
    model: z.string(),
    kmPerLiterHundredths: z.number(),
    active: z.boolean(),
    deletedAt: z.union([z.date(), z.string()]).nullable().optional(),
    createdAt: z.union([z.date(), z.string()]),
    updatedAt: z.union([z.date(), z.string()]),
  })
  .transform((v) => {
    const { kmPerLiterHundredths, ...rest } = v;
    return {
      ...rest,
      kmPerLiter: kmPerLiterHundredths / 100,
    };
  });
export type VehicleOutput = z.infer<typeof vehicleOutputSchema>;

const vehicleFields = {
  plate: plateSchema,
  model: z.string().trim().min(1, "Modelo é obrigatório"),
  kmPerLiter: z
    .number()
    .positive("Rendimento (km/L) deve ser um valor positivo"),
};

export const vehicleFormSchema = z.object({
  ...vehicleFields,
  active: z.boolean(),
});

export const createVehicleInputSchema = z.object({
  ...vehicleFields,
  active: z.boolean().optional().default(true),
});
export type CreateVehicleInput = z.input<typeof createVehicleInputSchema>;

export const updateVehicleInputSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  ...vehicleFields,
  active: z.boolean().optional(),
});
export type UpdateVehicleInput = z.infer<typeof updateVehicleInputSchema>;

export const listVehiclesInputSchema = z
  .object({
    activeOnly: z.boolean().optional(),
    includeDeleted: z.boolean().optional(),
  })
  .optional();
export type ListVehiclesInput = z.infer<typeof listVehiclesInputSchema>;

export const vehicleDeleteResultSchema = z.enum(["archived", "deleted"]);
export type VehicleDeleteResult = z.infer<typeof vehicleDeleteResultSchema>;

export const deleteVehicleOutputSchema = z.object({
  success: z.literal(true),
  result: vehicleDeleteResultSchema,
});
export type DeleteVehicleOutput = z.infer<typeof deleteVehicleOutputSchema>;
