import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";

import {
  authenticatedProcedure,
  createRouter,
  ForbiddenError,
  managerProcedure,
  publicProcedure,
  UnauthorizedError,
} from "@/server/api";
import { appRouter } from "@/server/api/router";
import { type Context, createCallerFactory } from "@/server/api/trpc";
import { db } from "@/server/db";

const createCaller = createCallerFactory(appRouter);

function caller() {
  return createCaller({ db, session: null, headers: new Headers() });
}

describe("tRPC router composition", () => {
  it("auth.getProfile is protected and rejects unauthenticated callers", async () => {
    await expect(caller().auth.getProfile()).rejects.toThrow(UnauthorizedError);
  });
});

describe("tRPC middleware", () => {
  const testRouter = createRouter({
    protected: authenticatedProcedure.query(() => "ok"),
    admin: managerProcedure.query(() => "ok"),
  });
  const createTestCaller = createCallerFactory(testRouter);

  function testCaller(session: Context["session"]) {
    return createTestCaller({ db, session, headers: new Headers() });
  }

  it("authMiddleware rejects unauthenticated request", async () => {
    await expect(testCaller(null).protected()).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("authMiddleware passes any authenticated request", async () => {
    const result = await testCaller({
      user: { role: "driver" },
    } as Context["session"]).protected();
    expect(result).toBe("ok");
  });

  it("managerMiddleware rejects unauthenticated request", async () => {
    await expect(testCaller(null).admin()).rejects.toThrow(UnauthorizedError);
  });

  it("managerMiddleware rejects driver user", async () => {
    await expect(
      testCaller({ user: { role: "driver" } } as Context["session"]).admin(),
    ).rejects.toThrow(ForbiddenError);
  });

  it("managerMiddleware passes manager user", async () => {
    const result = await testCaller({
      user: { role: "manager" },
    } as Context["session"]).admin();
    expect(result).toBe("ok");
  });

  it("managerMiddleware passes admin user", async () => {
    const result = await testCaller({
      user: { role: "admin" },
    } as Context["session"]).admin();
    expect(result).toBe("ok");
  });
});

describe("tRPC Zod validation", () => {
  const validationRouter = createRouter({
    echoId: publicProcedure.input(z.string()).query(({ input }) => input),
  });
  const createValidationCaller = createCallerFactory(validationRouter);

  it("rejects invalid input with ZodError cause", async () => {
    try {
      await createValidationCaller({
        db,
        session: null,
        headers: new Headers(),
      }).echoId(123 as unknown as string);
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
      expect(trpcError.cause).toBeInstanceOf(ZodError);
    }
  });

  it("passes valid input through the router to the controller", async () => {
    const result = await createValidationCaller({
      db,
      session: null,
      headers: new Headers(),
    }).echoId("valid-id");
    expect(result).toBe("valid-id");
  });
});

describe("tRPC output shaping", () => {
  const fullSchema = z.object({
    id: z.string(),
    name: z.string(),
  });
  const publicSchema = fullSchema.pick({ id: true });

  const fakeController = {
    getFull: async () =>
      fullSchema.parse({ id: "1", name: "Widget", internalCost: 100 }),
  };

  const shapingRouter = createRouter({
    getFull: publicProcedure.query(() => fakeController.getFull()),
    getPublic: publicProcedure.query(() =>
      fakeController.getFull().then(publicSchema.parse),
    ),
  });
  const createShapingCaller = createCallerFactory(shapingRouter);

  it("controller full-schema parse strips fields not in the output schema", async () => {
    const result = await createShapingCaller({
      db,
      session: null,
      headers: new Headers(),
    }).getFull();

    expect(result).toEqual({ id: "1", name: "Widget" });
    expect(result).not.toHaveProperty("internalCost");
  });

  it("router access-level schema narrows the parsed full output", async () => {
    const result = await createShapingCaller({
      db,
      session: null,
      headers: new Headers(),
    }).getPublic();

    expect(result).toEqual({ id: "1" });
  });
});
