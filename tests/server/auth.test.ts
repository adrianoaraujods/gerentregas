import { describe, expect, it } from "vitest";

import { ForbiddenError, UnauthorizedError } from "@/server/api";
import { appRouter } from "@/server/api/router";
import { createCallerFactory } from "@/server/api/trpc";
import { db } from "@/server/db";

const createCaller = createCallerFactory(appRouter);

function caller() {
  return createCaller({ db, session: null, headers: new Headers() });
}

function bannedSessionCaller() {
  return createCaller({
    db,
    session: {
      user: {
        id: "archived-driver-id",
        role: "driver",
        name: "Archived Driver",
        email: "archived@test.com",
        emailVerified: true,
        image: null,
        banned: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        id: "archived-session-id",
        userId: "archived-driver-id",
        expiresAt: new Date(Date.now() + 86400000),
        token: "archived-token",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    headers: new Headers(),
  });
}

describe("auth router", () => {
  it("getProfile rejects unauthenticated callers with UnauthorizedError", async () => {
    await expect(caller().auth.getProfile()).rejects.toThrow(UnauthorizedError);
  });

  it("getProfile rejects banned (archived) sessions with ForbiddenError", async () => {
    await expect(bannedSessionCaller().auth.getProfile()).rejects.toThrow(
      ForbiddenError,
    );
  });
});
