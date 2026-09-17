import {
  adminMiddleware,
  authMiddleware,
  driverMiddleware,
  managerMiddleware,
} from "./middleware";
import { procedure } from "./trpc";

export * from "./errors";
export {
  createCallerFactory,
  createContext,
  createRouter,
} from "./trpc";

export const publicProcedure = procedure;
export const authenticatedProcedure = procedure.use(authMiddleware);
export const managerProcedure = procedure.use(managerMiddleware);
export const adminProcedure = procedure.use(adminMiddleware);
export const driverProcedure = procedure.use(driverMiddleware);
