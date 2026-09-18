import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";

import { geocodeStatusEnum, point } from "@/server/db/schemas/points";

export const geocodeStatusSchema = createSelectSchema(geocodeStatusEnum);
export type GeocodeStatus = z.infer<typeof geocodeStatusSchema>;

export const pointSchema = createSelectSchema(point);
export type Point = z.infer<typeof pointSchema>;

export const newPointSchema = createInsertSchema(point);
export type NewPoint = z.infer<typeof newPointSchema>;

export const pointOutputSchema = pointSchema.pick({
  id: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  geocodeStatus: true,
  createdAt: true,
  updatedAt: true,
});
export type PointOutput = z.infer<typeof pointOutputSchema>;

export const pointWithDeletedAtSchema = pointOutputSchema.extend({
  deletedAt: z.date().nullable(),
});
export type PointWithDeletedAt = z.infer<typeof pointWithDeletedAtSchema>;

export const createPointInputSchema = z.object({
  name: z.string().nonempty("Nome é obrigatório"),
  address: z.string().nonempty("Endereço é obrigatório"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type CreatePointInput = z.infer<typeof createPointInputSchema>;

export const updatePointInputSchema = z.object({
  name: z.string().nonempty("Nome é obrigatório").optional(),
  address: z.string().nonempty("Endereço é obrigatório").optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type UpdatePointInput = z.infer<typeof updatePointInputSchema>;

export const listPointsInputSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  includeDeleted: z.boolean().default(false),
});
export type ListPointsInput = z.infer<typeof listPointsInputSchema>;

export const pointsListOutputSchema = z.object({
  points: z.array(pointOutputSchema),
  total: z.number().int().nonnegative(),
});
export type PointsListOutput = z.infer<typeof pointsListOutputSchema>;
