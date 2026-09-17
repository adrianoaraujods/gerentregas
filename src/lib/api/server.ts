import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";

import { createQueryClient } from "@/lib/query";
import { createContext } from "@/server/api";
import { type AppRouter, createCaller } from "@/server/api/router";

/**
 * This wraps the `createContext` helper and provides the required context for the tRPC API when handling a tRPC call from a React Server Component.
 */
const createCallerContext = cache(async () => {
  const resHeaders = new Headers(await headers());
  resHeaders.set("x-trpc-source", "rsc");

  return createContext({ resHeaders });
});

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createCallerContext);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
