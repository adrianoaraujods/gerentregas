import { beforeEach, describe, expect, it } from "vitest";

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
        phone: "+5511999999999",
        document: "12345678901",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("João Motorista");
      expect(result.email).toBe("joao@test.com");
      expect(result.phone).toBe("+5511999999999");
      expect(result.document).toBe("12345678901");
      expect(result.role).toBe("driver");
    });

    it("rejects driver creation by driver role", async () => {
      await expect(
        driverCaller.drivers.create({
          name: "João Motorista",
          email: "joao@test.com",
          password: "senha123",
          phone: "+5511999999999",
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
          phone: "+5511999999999",
          document: "12345678901",
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("rejects duplicate email", async () => {
      await managerCaller.drivers.create({
        name: "João Motorista",
        email: "joao@test.com",
        password: "senha123",
        phone: "+5511999999999",
        document: "12345678901",
      });

      await expect(
        managerCaller.drivers.create({
          name: "Outro Motorista",
          email: "joao@test.com",
          password: "senha123",
          phone: "+5511888888888",
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
          phone: "+5511999999999",
          document: "1234567890", // 10 digits
        }),
      ).rejects.toThrow();
    });

    it("validates phone format (E.164)", async () => {
      await expect(
        managerCaller.drivers.create({
          name: "João Motorista",
          email: "joao@test.com",
          password: "senha123",
          phone: "11999999999", // missing +55
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
        phone: "+5511999999999",
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
          phone: "+5511999999999",
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
          phone: "+5511999999999",
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
        phone: "+5511999999999",
        document: "11111111111",
      });

      await managerCaller.drivers.create({
        name: "Driver 2",
        email: "driver2@test.com",
        password: "senha123",
        phone: "+5511888888888",
        document: "22222222222",
      });

      const result = await managerCaller.drivers.list({ limit: 10, offset: 0 });
      expect(result.drivers.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it("excludes soft-deleted drivers from list", async () => {
      const driver = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
        document: "11111111111",
      });

      await managerCaller.drivers.delete({ id: driver.id });

      const result = await managerCaller.drivers.list({ limit: 10, offset: 0 });
      expect(result.drivers.length).toBe(0);
      expect(result.total).toBe(0);
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
          phone: `+55119999999${i.toString().padStart(2, "0")}`,
          document: `${i}`.repeat(11),
        });
      }

      const page1 = await managerCaller.drivers.list({ limit: 2, offset: 0 });
      expect(page1.drivers.length).toBe(2);
      expect(page1.total).toBe(5);

      const page2 = await managerCaller.drivers.list({ limit: 2, offset: 2 });
      expect(page2.drivers.length).toBe(2);
    });

    it("filters by role", async () => {
      await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
        document: "11111111111",
      });

      await adminCaller.drivers.createManager({
        name: "Manager 1",
        email: "manager1@test.com",
        password: "senha123",
        phone: "+5511888888888",
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

      const managers = await managerCaller.drivers.list({
        limit: 10,
        offset: 0,
        role: "manager",
      });
      expect(managers.drivers.length).toBe(1);
      expect(managers.drivers[0].role).toBe("manager");
    });
  });

  describe("get", () => {
    it("allows manager to get driver by ID", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
        document: "11111111111",
      });

      const result = await managerCaller.drivers.get({ id: created.id });
      expect(result.id).toBe(created.id);
      expect(result.name).toBe("Driver 1");
      expect(result.document).toBe("11111111111"); // decrypted
    });

    it("rejects get by driver role", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
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
        phone: "+5511999999999",
        document: "11111111111",
      });

      const result = await managerCaller.drivers.update({
        id: created.id,
        name: "Driver 1 Updated",
        phone: "+5511888888888",
      });

      expect(result.name).toBe("Driver 1 Updated");
      expect(result.phone).toBe("+5511888888888");
      expect(result.document).toBe("11111111111"); // unchanged
    });

    it("allows updating document (re-encrypts)", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
        document: "11111111111",
      });

      const result = await managerCaller.drivers.update({
        id: created.id,
        document: "22222222222",
      });

      expect(result.document).toBe("22222222222");
    });

    it("rejects update by driver role", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
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

  describe("delete (soft delete)", () => {
    it("allows manager to soft delete driver", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
        document: "11111111111",
      });

      await managerCaller.drivers.delete({ id: created.id });

      const list = await managerCaller.drivers.list({ limit: 10, offset: 0 });
      expect(list.drivers.length).toBe(0);
    });

    it("preserves driver data after soft delete", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
        document: "11111111111",
      });

      await managerCaller.drivers.delete({ id: created.id });

      // Should still be able to get by ID including deleted
      // (This would require a different endpoint or admin access)
    });

    it("rejects delete by driver role", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
        document: "11111111111",
      });

      await expect(
        driverCaller.drivers.delete({ id: created.id }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("restore (admin only)", () => {
    it("allows admin to restore soft-deleted driver", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
        document: "11111111111",
      });

      await managerCaller.drivers.delete({ id: created.id });

      const restored = await adminCaller.drivers.restore({ id: created.id });
      expect(restored.id).toBe(created.id);
      expect(restored.name).toBe("Driver 1");

      const list = await managerCaller.drivers.list({ limit: 10, offset: 0 });
      expect(list.drivers.length).toBe(1);
    });

    it("rejects restore by manager role", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
        document: "11111111111",
      });

      await managerCaller.drivers.delete({ id: created.id });

      await expect(
        managerCaller.drivers.restore({ id: created.id }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("rejects restore by driver role", async () => {
      const created = await managerCaller.drivers.create({
        name: "Driver 1",
        email: "driver1@test.com",
        password: "senha123",
        phone: "+5511999999999",
        document: "11111111111",
      });

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
        phone: "+5511999999999",
        document: "11111111111",
      });

      await expect(
        adminCaller.drivers.restore({ id: created.id }),
      ).rejects.toThrow(BadRequestError);
    });
  });
});
