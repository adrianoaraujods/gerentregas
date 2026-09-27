import { beforeEach, describe, expect, it } from "vitest";

import { ConflictError, NotFoundError } from "@/server/api";
import { db } from "@/server/db";
import { user as userTable } from "@/server/db/schemas/auth";
import { route, routeVersion } from "@/server/db/schemas/routes";
import { FleetRepository } from "@/server/modules/fleet/fleet.repository";
import { FleetService } from "@/server/modules/fleet/fleet.service";

let routeUserCounter = 0;

async function seedRouteUser(role: "manager" | "driver") {
  routeUserCounter += 1;
  const [row] = await db
    .insert(userTable)
    .values({
      id: crypto.randomUUID(),
      name: `Route ${role} ${routeUserCounter}`,
      email: `route-${role}-${routeUserCounter}-${crypto.randomUUID()}@test.com`,
      emailVerified: true,
      role,
    })
    .returning();
  return row;
}

describe("FleetService", () => {
  let repository: FleetRepository;
  let service: FleetService;

  beforeEach(() => {
    repository = new FleetRepository(db);
    service = new FleetService(repository);
  });

  describe("create", () => {
    it("creates a new vehicle successfully", async () => {
      const result = await service.create({
        plate: "BRA-2E19",
        model: "Moto Cargo 160",
        kmPerLiter: 35.5,
        active: true,
      });

      expect(result.id).toBeDefined();
      expect(result.plate).toBe("BRA-2E19");
      expect(result.model).toBe("Moto Cargo 160");
      expect(result.kmPerLiterHundredths).toBe(3550);
      expect(result.active).toBe(true);
    });

    it("converts plate to uppercase", async () => {
      const result = await service.create({
        plate: "abc-1234",
        model: "Furgão Médio",
        kmPerLiter: 10.0,
      });

      expect(result.plate).toBe("ABC-1234");
    });

    it("rejects duplicate plate creation", async () => {
      await service.create({
        plate: "DUP-1111",
        model: "Caminhão Leve",
        kmPerLiter: 8.0,
      });

      await expect(
        service.create({
          plate: "dup-1111",
          model: "Caminhão Baú",
          kmPerLiter: 7.5,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("rejects negative or zero kmPerLiter", async () => {
      await expect(
        service.create({
          plate: "NEG-0000",
          model: "Teste",
          kmPerLiter: -5,
        }),
      ).rejects.toThrow();

      await expect(
        service.create({
          plate: "ZERO-000",
          model: "Teste",
          kmPerLiter: 0,
        }),
      ).rejects.toThrow();
    });
  });

  describe("getById & list", () => {
    it("returns vehicle by id", async () => {
      const created = await service.create({
        plate: "GET-9999",
        model: "Kombu",
        kmPerLiter: 12.0,
      });

      const found = await service.getById(created.id);
      expect(found.id).toBe(created.id);
      expect(found.plate).toBe("GET-9999");
    });

    it("throws NotFoundError when vehicle does not exist", async () => {
      await expect(service.getById("invalid-id-xyz")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("filters active vehicles when activeOnly is true", async () => {
      const v1 = await service.create({
        plate: "ACT-0001",
        model: "Ativo",
        kmPerLiter: 10.0,
        active: true,
      });

      const v2 = await service.create({
        plate: "INA-0002",
        model: "Inativo",
        kmPerLiter: 10.0,
        active: false,
      });

      const activeList = await service.list({ activeOnly: true });
      expect(activeList.some((v) => v.id === v1.id)).toBe(true);
      expect(activeList.some((v) => v.id === v2.id)).toBe(false);

      const allList = await service.list({ activeOnly: false });
      expect(allList.some((v) => v.id === v1.id)).toBe(true);
      expect(allList.some((v) => v.id === v2.id)).toBe(true);
    });
  });

  describe("update", () => {
    it("updates existing vehicle details", async () => {
      const created = await service.create({
        plate: "UPD-1000",
        model: "Modelo Antigo",
        kmPerLiter: 10.0,
        active: true,
      });

      const updated = await service.update({
        id: created.id,
        plate: "UPD-1000",
        model: "Modelo Novo",
        kmPerLiter: 14.2,
        active: false,
      });

      expect(updated.model).toBe("Modelo Novo");
      expect(updated.kmPerLiterHundredths).toBe(1420);
      expect(updated.active).toBe(false);
    });

    it("throws ConflictError when updating to a plate used by another vehicle", async () => {
      const _v1 = await service.create({
        plate: "PLT-0001",
        model: "Carro 1",
        kmPerLiter: 10.0,
      });

      const v2 = await service.create({
        plate: "PLT-0002",
        model: "Carro 2",
        kmPerLiter: 12.0,
      });

      await expect(
        service.update({
          id: v2.id,
          plate: "PLT-0001",
          model: "Carro 2",
          kmPerLiter: 12.0,
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("delete", () => {
    it("permanently deletes an unused vehicle", async () => {
      const created = await service.create({
        plate: "DEL-7777",
        model: "Para Deletar",
        kmPerLiter: 15.0,
      });

      const result = await service.delete(created.id);
      expect(result).toEqual({ success: true, result: "deleted" });

      await expect(service.getById(created.id)).rejects.toThrow(NotFoundError);

      const list = await service.list();
      expect(list.some((v) => v.id === created.id)).toBe(false);

      const includingDeleted = await service.list({ includeDeleted: true });
      expect(includingDeleted.some((v) => v.id === created.id)).toBe(false);
    });

    it("archives a vehicle referenced by a route", async () => {
      const created = await service.create({
        plate: "ARC-0001",
        model: "Usado em roteiro",
        kmPerLiter: 10.0,
      });

      const manager = await seedRouteUser("manager");
      const driver = await seedRouteUser("driver");
      await db.insert(route).values({
        id: crypto.randomUUID(),
        managerId: manager.id,
        driverId: driver.id,
        vehicleId: created.id,
        date: new Date(),
      });

      const result = await service.delete(created.id);
      expect(result).toEqual({ success: true, result: "archived" });

      const found = await service.getById(created.id);
      expect(found.deletedAt).toBeTruthy();

      const live = await service.list();
      expect(live.some((v) => v.id === created.id)).toBe(false);

      const includingDeleted = await service.list({ includeDeleted: true });
      const archived = includingDeleted.find((v) => v.id === created.id);
      expect(archived?.deletedAt).toBeTruthy();
    });

    it("archives a vehicle referenced only by a route version", async () => {
      const created = await service.create({
        plate: "ARV-0002",
        model: "Usado em versão antiga",
        kmPerLiter: 10.0,
      });

      const manager = await seedRouteUser("manager");
      const driver = await seedRouteUser("driver");
      const [routeRow] = await db
        .insert(route)
        .values({
          id: crypto.randomUUID(),
          managerId: manager.id,
          driverId: driver.id,
          vehicleId: null,
          date: new Date(),
        })
        .returning();
      await db.insert(routeVersion).values({
        id: crypto.randomUUID(),
        routeId: routeRow.id,
        version: "1",
        managerId: manager.id,
        driverId: driver.id,
        vehicleId: created.id,
        date: new Date(),
        status: "draft",
      });

      const result = await service.delete(created.id);
      expect(result).toEqual({ success: true, result: "archived" });
    });

    it("rejects re-creating the plate of an archived vehicle with a friendly error", async () => {
      const created = await service.create({
        plate: "DUP-ARC1",
        model: "Arquivado",
        kmPerLiter: 10.0,
      });

      const manager = await seedRouteUser("manager");
      const driver = await seedRouteUser("driver");
      await db.insert(route).values({
        id: crypto.randomUUID(),
        managerId: manager.id,
        driverId: driver.id,
        vehicleId: created.id,
        date: new Date(),
      });
      await service.delete(created.id);

      await expect(
        service.create({
          plate: "DUP-ARC1",
          model: "Tentativa de recriar",
          kmPerLiter: 12.0,
        }),
      ).rejects.toThrow(/arquivado/);
    });

    it("throws NotFoundError when vehicle does not exist", async () => {
      await expect(service.delete("invalid-id-xyz")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("restore", () => {
    it("restores an archived vehicle", async () => {
      const created = await service.create({
        plate: "RES-0001",
        model: "Para Restaurar",
        kmPerLiter: 10.0,
      });

      const manager = await seedRouteUser("manager");
      const driver = await seedRouteUser("driver");
      await db.insert(route).values({
        id: crypto.randomUUID(),
        managerId: manager.id,
        driverId: driver.id,
        vehicleId: created.id,
        date: new Date(),
      });
      await service.delete(created.id);

      const restored = await service.restore(created.id);
      expect(restored.id).toBe(created.id);
      expect(restored.deletedAt).toBeNull();

      const live = await service.list();
      expect(live.some((v) => v.id === created.id)).toBe(true);
    });

    it("rejects restoring a vehicle that is not archived", async () => {
      const created = await service.create({
        plate: "RES-0002",
        model: "Ativo",
        kmPerLiter: 10.0,
      });

      await expect(service.restore(created.id)).rejects.toThrow();
    });

    it("throws NotFoundError for non-existent vehicle", async () => {
      await expect(service.restore("invalid-id-xyz")).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
