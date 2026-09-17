import { ForbiddenError, UnauthorizedError } from "./errors";
import { createMiddleware } from "./trpc";

export const authMiddleware = createMiddleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new UnauthorizedError("Você deve estar autenticado.");
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const managerMiddleware = createMiddleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new UnauthorizedError("Você deve estar autenticado.");
  }
  if (
    ctx.session.user.role !== "manager" &&
    ctx.session.user.role !== "admin"
  ) {
    throw new ForbiddenError("Você não tem autorização.");
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
