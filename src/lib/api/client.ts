import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/api/router";

/**
 * This is used to call the API from client components.
 */
export const api = createTRPCReact<AppRouter>();
