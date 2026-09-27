import { createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";

import { phoneSchema } from "@/lib/validators";
import { user, userRoleEnum } from "@/server/db/schemas/auth";

export const userRoleSchema = createSelectSchema(userRoleEnum);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = createSelectSchema(user);
export type User = z.infer<typeof userSchema>;

export type UserWithDeletedAt = User & { deletedAt: Date | null };

export const publicUserSchema = userSchema.pick({
  name: true,
  email: true,
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const driverOutputSchema = userSchema.pick({
  id: true,
  name: true,
  email: true,
  phone: true,
  document: true,
  role: true,
  createdAt: true,
  updatedAt: true,
});
export type DriverOutput = z.infer<typeof driverOutputSchema>;

export const createDriverInputSchema = z.object({
  name: z.string().nonempty("Nome é obrigatório"),
  email: z.email("E-mail válido é obrigatório"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  phone: phoneSchema,
  document: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
});
export type CreateDriverInput = z.infer<typeof createDriverInputSchema>;

export const createManagerInputSchema = createDriverInputSchema.extend({
  role: z.literal("manager"),
});
export type CreateManagerInput = z.infer<typeof createManagerInputSchema>;

export const updateDriverInputSchema = z.object({
  name: z.string().nonempty("Nome é obrigatório").optional(),
  phone: phoneSchema.optional(),
  document: z
    .string()
    .regex(/^\d{11}$/, "CPF deve ter 11 dígitos")
    .optional(),
});
export type UpdateDriverInput = z.infer<typeof updateDriverInputSchema>;

export const listDriversInputSchema = z.object({
  limit: z.number().int().positive().max(1000).default(20),
  offset: z.number().int().nonnegative().default(0),
  role: userRoleSchema.optional(),
  search: z.string().trim().max(100).optional(),
});
export type ListDriversInput = z.infer<typeof listDriversInputSchema>;

export const driversListOutputSchema = z.object({
  drivers: z.array(driverOutputSchema),
  total: z.number().int().nonnegative(),
});
export type DriversListOutput = z.infer<typeof driversListOutputSchema>;
