import { createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";

import {
  MIN_PASSWORD_LENGTH,
  user,
  userRoleEnum,
} from "@/server/db/schemas/auth";

export const userRoleSchema = createSelectSchema(userRoleEnum);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = createSelectSchema(user);
export type User = z.infer<typeof userSchema>;

export const publicUserSchema = userSchema.pick({
  name: true,
  email: true,
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const profileSchema = userSchema.pick({
  name: true,
  email: true,
  image: true,
});
export type Profile = z.infer<typeof profileSchema>;

export const registerSchema = z.object({
  name: z.string().nonempty("Um nome é obrigatório"),
  email: z.email("Um e-mail válido é obrigatório"),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`,
    ),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: registerSchema.shape.email,
  password: z.string().nonempty("Uma senha é obrigatória"),
});
export type LoginInput = z.infer<typeof loginSchema>;
