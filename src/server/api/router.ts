import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { authRouter } from "@/server/modules/auth";
import { driversRouter } from "@/server/modules/drivers";
import { parametersRouter } from "@/server/modules/parameters";
import { pointsRouter } from "@/server/modules/points";

import { createCallerFactory, createRouter } from "./trpc";

/**
 * Create the global app tRPC router. Every module router layer should be plugged here.
 *
 * @see https://trpc.io/docs/server/routers
 */
export const appRouter = createRouter({
  auth: authRouter,
  drivers: driversRouter,
  parameters: parametersRouter,
  points: pointsRouter,
});

/**
 * Create a server-side caller for the tRPC API.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCaller = createCallerFactory(appRouter);

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
