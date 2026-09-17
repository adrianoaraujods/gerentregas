import { describe, expect, it } from "vitest";

import { UnauthorizedError } from "@/server/api";
import { appRouter } from "@/server/api/router";
import { createCallerFactory } from "@/server/api/trpc";
import { db } from "@/server/db";

const createCaller = createCallerFactory(appRouter);

function caller() {
  return createCaller({ db, session: null, headers: new Headers() });
}

describe("auth router", () => {
  it("getProfile rejects unauthenticated callers with UnauthorizedError", async () => {
    await expect(caller().auth.getProfile()).rejects.toThrow(UnauthorizedError);
  });
});
