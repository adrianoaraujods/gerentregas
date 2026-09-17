import type { USER_ROLES } from "@/server/db/schemas/auth";

import { ForbiddenError, UnauthorizedError } from "./errors";
import { createMiddleware } from "./trpc";

type UserRole = (typeof USER_ROLES)[number];

export const authMiddleware = createMiddleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new UnauthorizedError("Você deve estar autenticado.");
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

function roleMiddleware(allowedRoles: readonly UserRole[]) {
  return createMiddleware(async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new UnauthorizedError("Você deve estar autenticado.");
    }
    if (!allowedRoles.includes(ctx.session.user.role as UserRole)) {
      throw new ForbiddenError("Você não tem autorização.");
    }
    return next({ ctx: { ...ctx, session: ctx.session } });
  });
}

export const managerMiddleware = roleMiddleware(["manager", "admin"] as const);

export const adminMiddleware = roleMiddleware(["admin"] as const);

export const driverMiddleware = roleMiddleware(["driver"] as const);
