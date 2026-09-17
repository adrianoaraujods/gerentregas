import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  createCallerFactory,
  createRouter,
  driverProcedure,
  ForbiddenError,
  managerProcedure,
  publicProcedure,
  UnauthorizedError,
} from "@/server/api";
import type { Context } from "@/server/api/trpc";
import { db } from "@/server/db";

describe("tRPC middleware role matrix", () => {
  const testRouter = createRouter({
    any: authenticatedProcedure.query(() => "ok"),
    manager: managerProcedure.query(() => "ok"),
    admin: adminProcedure.query(() => "ok"),
    driver: driverProcedure.query(() => "ok"),
  });
  const createTestCaller = createCallerFactory(testRouter);

  function testCaller(session: Context["session"]) {
    return createTestCaller({ db, session, headers: new Headers() });
  }

  const matrix = [
    { procedure: "any", role: "driver", expected: "ok" },
    { procedure: "any", role: "manager", expected: "ok" },
    { procedure: "any", role: "admin", expected: "ok" },
    { procedure: "manager", role: "driver", expected: ForbiddenError },
    { procedure: "manager", role: "manager", expected: "ok" },
    { procedure: "manager", role: "admin", expected: "ok" },
    { procedure: "admin", role: "driver", expected: ForbiddenError },
    { procedure: "admin", role: "manager", expected: ForbiddenError },
    { procedure: "admin", role: "admin", expected: "ok" },
    { procedure: "driver", role: "driver", expected: "ok" },
    { procedure: "driver", role: "manager", expected: ForbiddenError },
    { procedure: "driver", role: "admin", expected: ForbiddenError },
  ] as const;

  it.each(matrix)(
    "$procedure procedure with $role user",
    async ({ procedure, role, expected }) => {
      const call = testCaller({
        user: { role },
      } as Context["session"])[procedure]();

      if (expected === "ok") {
        await expect(call).resolves.toBe("ok");
      } else {
        await expect(call).rejects.toThrow(ForbiddenError);
      }
    },
  );

  it.each(["any", "manager", "admin", "driver"] as const)(
    "$procedure rejects unauthenticated request",
    async (procedure) => {
      await expect(testCaller(null)[procedure]()).rejects.toThrow(
        UnauthorizedError,
      );
    },
  );
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
