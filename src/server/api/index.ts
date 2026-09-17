import { authMiddleware, managerMiddleware } from "./middleware";
import { procedure } from "./trpc";

export * from "./errors";
export { createContext, createRouter } from "./trpc";

export const publicProcedure = procedure;
export const authenticatedProcedure = procedure.use(authMiddleware);
export const managerProcedure = procedure.use(managerMiddleware);
