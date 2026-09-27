import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/server/api";
import { appRouter } from "@/server/api/router";
import { createCallerFactory } from "@/server/api/trpc";
import { db } from "@/server/db";
import {
  session as sessionTable,
  user as userTable,
} from "@/server/db/schemas/auth";
import { route } from "@/server/db/schemas/routes";

const createCaller = createCallerFactory(appRouter);

interface TestSession {
  user: {
    id: string;
    role: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    banned: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

function createTestCaller(role: "admin" | "manager" | "driver") {
  const session: TestSession = {
    user: {
      id: `${role}-id`,
      role,
      name: `${role} user`,
      email: `${role}@test.com`,
      emailVerified: true,
      image: null,
      banned: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: `${role}-session-id`,
      userId: `${role}-id`,
      expiresAt: new Date(Date.now() + 86400000),
      token: "test-token",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  return createCaller({ db, session, headers: new Headers() });
}

let routeSeedCounter = 0;

async function seedRouteReferencing(
  driverId: string,
  managerId?: string,
): Promise<string> {
  routeSeedCounter += 1;
  let resolvedManagerId = managerId;
  if (!resolvedManagerId) {
    const [manager] = await db
      .insert(userTable)
      .values({
        id: crypto.randomUUID(),
        name: `Route Manager ${routeSeedCounter}`,
        email: `route-manager-${routeSeedCounter}-${crypto.randomUUID()}@test.com`,
        emailVerified: true,
        role: "manager",
      })
      .returning();
    resolvedManagerId = manager.id;
  }

  const [routeRow] = await db
    .insert(route)
    .values({
      id: crypto.randomUUID(),
      managerId: resolvedManagerId,
      driverId,
      date: new Date(),
    })
    .returning();

  return routeRow.id;
}

describe("drivers router", () => {
  let adminCaller: ReturnType<typeof createCaller>;
  let managerCaller: ReturnType<typeof createCaller>;
  let driverCaller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    adminCaller = createTestCaller("admin");
    managerCaller = createTestCaller("manager");
    driverCaller = createTestCaller("driver");
  });

  describe("create (manager creates driver)", () => {
    it("allows manager to create a driver", async () => {
      const result = await managerCaller.drivers.create({
        name: "João Motorista",
        email: "joao@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "12345678901",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("João Motorista");
      expect(result.email).toBe("joao@test.com");
      expect(result.phone).toBe("11999999999");
      expect(result.document).toBe("***.***.***-01"); // masked, no plaintext in response
      expect(result.role).toBe("driver");
    });

    it("rejects driver creation by driver role", async () => {
      await expect(
        driverCaller.drivers.create({
          name: "João Motorista",
          email: "joao@test.com",
          password: "senha123",
          phone: "11999999999",
          document: "12345678901",
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("rejects driver creation by unauthenticated user", async () => {
      const unauthCaller = createCaller({
        db,
        session: null,
        headers: new Headers(),
      });
      await expect(
        unauthCaller.drivers.create({
          name: "João Motorista",
          email: "joao@test.com",
          password: "senha123",
          phone: "11999999999",
          document: "12345678901",
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("rejects duplicate email", async () => {
      await managerCaller.drivers.create({
        name: "João Motorista",
        email: "joao@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "12345678901",
      });

      await expect(
        managerCaller.drivers.create({
          name: "Outro Motorista",
          email: "joao@test.com",
          password: "senha123",
          phone: "1188888888",
          document: "10987654321",
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("validates CPF format (11 digits)", async () => {
      await expect(
        managerCaller.drivers.create({
          name: "João Motorista",
          email: "joao@test.com",
          password: "senha123",
          phone: "11999999999",
          document: "1234567890", // 10 digits
        }),
      ).rejects.toThrow();
    });

    it("validates phone format (digits only with DDD)", async () => {
      await expect(
        managerCaller.drivers.create({
          name: "João Motorista",
          email: "joao@test.com",
          password: "senha123",
          phone: "+5511999999999", // E.164 no longer accepted
          document: "12345678901",
        }),
      ).rejects.toThrow();

      await expect(
        managerCaller.drivers.create({
          name: "João Motorista",
          email: "joao@test.com",
          password: "senha123",
          phone: "119999999", // 9 digits
          document: "12345678901",
        }),
      ).rejects.toThrow();
    });
  });

  describe("createManager (admin creates manager)", () => {
    it("allows admin to create a manager", async () => {
      const result = await adminCaller.drivers.createManager({
        name: "Maria Gerente",
        email: "maria@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "12345678901",
        role: "manager",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Maria Gerente");
      expect(result.email).toBe("maria@test.com");
      expect(result.role).toBe("manager");
    });

    it("rejects manager creation by manager role", async () => {
      await expect(
        managerCaller.drivers.createManager({
          name: "Maria Gerente",
          email: "maria@test.com",
          password: "senha123",
          phone: "11999999999",
          document: "12345678901",
          role: "manager",
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("rejects manager creation by driver role", async () => {
      await expect(
        driverCaller.drivers.createManager({
          name: "Maria Gerente",
          email: "maria@test.com",
          password: "senha123",
          phone: "11999999999",
          document: "12345678901",
          role: "manager",
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("list", () => {
    it("allows manager to list drivers", async () => {
      await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await managerCaller.drivers.create({
        name: "Driver 2",
        email: "driver2@test.com",
        password: "senha123",
        phone: "1188888888",
        document: "22222222222",
      });

      const result = await managerCaller.drivers.list({ limit: 10, offset: 0 });
      expect(result.drivers.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it("excludes archived drivers from list unless includeDeleted is set", async () => {
      const driver = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await seedRouteReferencing(driver.id);
      await managerCaller.drivers.delete({ id: driver.id });

      const result = await managerCaller.drivers.list({ limit: 10, offset: 0 });
      expect(result.drivers.length).toBe(0);
      expect(result.total).toBe(0);

      const includingDeleted = await managerCaller.drivers.list({
        limit: 10,
        offset: 0,
        includeDeleted: true,
      });
      expect(includingDeleted.drivers.length).toBe(1);
      expect(includingDeleted.total).toBe(1);
      expect(includingDeleted.drivers[0].deletedAt).toBeTruthy();
    });

    it("rejects list by driver role", async () => {
      await expect(
        driverCaller.drivers.list({ limit: 10, offset: 0 }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("supports pagination", async () => {
      for (let i = 0; i < 5; i++) {
        await managerCaller.drivers.create({
          name: `Driver ${i}`,
          email: `driver${i}@test.com`,
          password: "senha123",
          phone: `1199999${i.toString().padStart(4, "0")}`,
          document: `${i}`.repeat(11),
        });
      }

      const page1 = await managerCaller.drivers.list({ limit: 2, offset: 0 });
      expect(page1.drivers.length).toBe(2);
      expect(page1.total).toBe(5);

      const page2 = await managerCaller.drivers.list({ limit: 2, offset: 2 });
      expect(page2.drivers.length).toBe(2);
    });

    it("filters by search term matching name or email", async () => {
      await managerCaller.drivers.create({
        name: "Carlos Silva",
        email: "carlos@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await managerCaller.drivers.create({
        name: "Ana Souza",
        email: "ana@test.com",
        password: "senha123",
        phone: "1188888888",
        document: "22222222222",
      });

      const byName = await managerCaller.drivers.list({
        limit: 10,
        offset: 0,
        search: "carlos",
      });
      expect(byName.drivers.length).toBe(1);
      expect(byName.drivers[0].name).toBe("Carlos Silva");
      expect(byName.total).toBe(1);

      const byEmail = await managerCaller.drivers.list({
        limit: 10,
        offset: 0,
        search: "ana@test",
      });
      expect(byEmail.drivers.length).toBe(1);
      expect(byEmail.drivers[0].name).toBe("Ana Souza");
    });

    it("filters by role", async () => {
      await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await adminCaller.drivers.createManager({
        name: "Manager 1",
        email: "manager1@test.com",
        password: "senha123",
        phone: "1188888888",
        document: "22222222222",
        role: "manager",
      });

      const drivers = await managerCaller.drivers.list({
        limit: 10,
        offset: 0,
        role: "driver",
      });
      expect(drivers.drivers.length).toBe(1);
      expect(drivers.drivers[0].role).toBe("driver");

      const managers = await adminCaller.drivers.list({
        limit: 10,
        offset: 0,
        role: "manager",
      });
      expect(managers.drivers.length).toBe(1);
      expect(managers.drivers[0].role).toBe("manager");
    });

    it("excludes managers from manager's default list", async () => {
      await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await adminCaller.drivers.createManager({
        name: "Manager 1",
        email: "manager1@test.com",
        password: "senha123",
        phone: "1188888888",
        document: "22222222222",
        role: "manager",
      });

      const managerList = await managerCaller.drivers.list({
        limit: 10,
        offset: 0,
      });
      expect(managerList.drivers.every((d) => d.role === "driver")).toBe(true);

      const adminList = await adminCaller.drivers.list({
        limit: 10,
        offset: 0,
      });
      expect(adminList.drivers.length).toBe(2);
    });

    it("rejects manager listing managers", async () => {
      await expect(
        managerCaller.drivers.list({
          limit: 10,
          offset: 0,
          role: "manager",
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("returns masked document in list (no plaintext)", async () => {
      await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      const result = await managerCaller.drivers.list({
        limit: 10,
        offset: 0,
      });
      expect(result.drivers[0].document).toBe("***.***.***-11");
    });
  });

  describe("get", () => {
    it("allows manager to get driver by ID", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      const result = await managerCaller.drivers.get({ id: created.id });
      expect(result.id).toBe(created.id);
      expect(result.name).toBe("Driver 1");
      expect(result.document).toBe("***.***.***-11"); // masked, no plaintext in response
    });

    it("rejects get by driver role", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await expect(
        driverCaller.drivers.get({ id: created.id }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws NotFoundError for non-existent driver", async () => {
      await expect(
        managerCaller.drivers.get({ id: "non-existent-id" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("update", () => {
    it("allows manager to update driver", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      const result = await managerCaller.drivers.update({
        id: created.id,
        name: "Driver 1 Updated",
        phone: "1188888888",
      });

      expect(result.name).toBe("Driver 1 Updated");
      expect(result.phone).toBe("1188888888");
      expect(result.document).toBe("***.***.***-11"); // masked, unchanged
    });

    it("allows updating document (re-encrypts)", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      const result = await managerCaller.drivers.update({
        id: created.id,
        document: "22222222222",
      });

      expect(result.document).toBe("***.***.***-22"); // masked
    });

    it("rejects update by driver role", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await expect(
        driverCaller.drivers.update({
          id: created.id,
          name: "Updated",
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws NotFoundError for non-existent driver", async () => {
      await expect(
        managerCaller.drivers.update({
          id: "non-existent-id",
          name: "Updated",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete (archive vs permanent)", () => {
    it("allows manager to delete driver", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      const result = await managerCaller.drivers.delete({ id: created.id });
      expect(result).toEqual({ success: true, result: "deleted" });

      const list = await managerCaller.drivers.list({ limit: 10, offset: 0 });
      expect(list.drivers.length).toBe(0);
    });

    it("permanently deletes a driver without routes, freeing the e-mail", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      const result = await managerCaller.drivers.delete({ id: created.id });
      expect(result).toEqual({ success: true, result: "deleted" });

      const recreated = await managerCaller.drivers.create({
        name: "Novo Motorista",
        email: "driver1@test.com",
        password: "senha456",
        phone: "11999999999",
        document: "11111111111",
      });
      expect(recreated.id).not.toBe(created.id);

      const list = await managerCaller.drivers.list({
        limit: 10,
        offset: 0,
        includeDeleted: true,
      });
      expect(list.drivers.length).toBe(1);
    });

    it("archives a driver assigned to a route, blocking login and revoking sessions", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver Arquivado",
        email: "arquivado@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await auth.api.signInEmail({
        body: { email: "arquivado@test.com", password: "senha123" },
      });
      const sessionsBefore = await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.userId, created.id));
      expect(sessionsBefore.length).toBeGreaterThan(0);

      await seedRouteReferencing(created.id);

      const result = await managerCaller.drivers.delete({ id: created.id });
      expect(result).toEqual({ success: true, result: "archived" });

      const [archivedUser] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, created.id));
      expect(archivedUser.deletedAt).toBeTruthy();
      expect(archivedUser.banned).toBe(true);

      const sessionsAfter = await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.userId, created.id));
      expect(sessionsAfter.length).toBe(0);

      await expect(
        auth.api.signInEmail({
          body: { email: "arquivado@test.com", password: "senha123" },
        }),
      ).rejects.toThrow(/arquivada/);
    });

    it("lets an archived driver sign in again after restore", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver Restaurado",
        email: "restaurado@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "22222222222",
      });

      await seedRouteReferencing(created.id);
      await managerCaller.drivers.delete({ id: created.id });

      await adminCaller.drivers.restore({ id: created.id });

      const { user } = await auth.api.signInEmail({
        body: { email: "restaurado@test.com", password: "senha123" },
      });
      expect(user.email).toBe("restaurado@test.com");

      const [restoredUser] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, created.id));
      expect(restoredUser.deletedAt).toBeNull();
      expect(restoredUser.banned).toBe(false);
    });

    it("rejects creating a user with the e-mail of an archived user", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver E-mail",
        email: "email-arquivado@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "33333333333",
      });

      await seedRouteReferencing(created.id);
      await managerCaller.drivers.delete({ id: created.id });

      await expect(
        managerCaller.drivers.create({
          name: "Outro Motorista",
          email: "email-arquivado@test.com",
          password: "senha123",
          phone: "11999999999",
          document: "44444444444",
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("rejects delete by driver role", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await expect(
        driverCaller.drivers.delete({ id: created.id }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("rejects manager deleting a manager, allows admin", async () => {
      const manager = await adminCaller.drivers.createManager({
        name: "Manager Alvo",
        email: "manager-alvo@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "66666666666",
        role: "manager",
      });

      await expect(
        managerCaller.drivers.delete({ id: manager.id }),
      ).rejects.toThrow(ForbiddenError);

      const result = await adminCaller.drivers.delete({ id: manager.id });
      expect(result).toEqual({ success: true, result: "deleted" });
    });
  });

  describe("restore (manager for drivers, admin for everyone)", () => {
    it("allows admin to restore archived driver", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await seedRouteReferencing(created.id);
      await managerCaller.drivers.delete({ id: created.id });

      const restored = await adminCaller.drivers.restore({ id: created.id });
      expect(restored.id).toBe(created.id);
      expect(restored.name).toBe("Driver 1");

      const list = await managerCaller.drivers.list({ limit: 10, offset: 0 });
      expect(list.drivers.length).toBe(1);
    });

    it("allows manager to restore archived driver", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await seedRouteReferencing(created.id);
      await managerCaller.drivers.delete({ id: created.id });

      const restored = await managerCaller.drivers.restore({ id: created.id });
      expect(restored.id).toBe(created.id);

      const list = await managerCaller.drivers.list({ limit: 10, offset: 0 });
      expect(list.drivers.length).toBe(1);
    });

    it("rejects manager restoring an archived manager", async () => {
      const manager = await adminCaller.drivers.createManager({
        name: "Manager Arquivado",
        email: "manager-arquivado@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "55555555555",
        role: "manager",
      });

      const [driver] = await db
        .insert(userTable)
        .values({
          id: crypto.randomUUID(),
          name: "Route Driver",
          email: `route-driver-${crypto.randomUUID()}@test.com`,
          emailVerified: true,
          role: "driver",
        })
        .returning();
      await seedRouteReferencing(driver.id, manager.id);
      await adminCaller.drivers.delete({ id: manager.id });

      await expect(
        managerCaller.drivers.restore({ id: manager.id }),
      ).rejects.toThrow(ForbiddenError);

      const restored = await adminCaller.drivers.restore({ id: manager.id });
      expect(restored.id).toBe(manager.id);
    });

    it("rejects restore by driver role", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await seedRouteReferencing(created.id);
      await managerCaller.drivers.delete({ id: created.id });

      await expect(
        driverCaller.drivers.restore({ id: created.id }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws BadRequestError when restoring non-deleted driver", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "11999999999",
        document: "11111111111",
      });

      await expect(
        adminCaller.drivers.restore({ id: created.id }),
      ).rejects.toThrow(BadRequestError);
    });
  });
});
