import { initTRPC } from "@trpc/server";
import { treeifyError, ZodError } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";

/**
 * @see https://trpc.io/docs/server/context
 */
export async function createContext(opts: {
  req?: Request;
  resHeaders: Headers;
}) {
  const { req, resHeaders } = opts;
  const headers = req?.headers ?? resHeaders;
  const session = await auth.api.getSession({ headers });

  return { db, session, headers };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const trpc = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? treeifyError(error.cause) : null,
      },
    };
  },
});

/**
 * This is what you use to create new procedures.
 *
 * @see https://trpc.io/docs/server/procedures
 */
export const procedure = trpc.procedure;

/**
 * This is how you create new middlewares.
 *
 * @see https://trpc.io/docs/server/middlewares
 */
export const createMiddleware = trpc.middleware;

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/server/router
 */
export const createRouter = trpc.router;

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = trpc.createCallerFactory;
