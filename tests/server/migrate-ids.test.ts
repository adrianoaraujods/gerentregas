import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { account, session, user as userTable } from "@/server/db/schemas/auth";
import { vehicle as vehicleTable } from "@/server/db/schemas/fleet";
import { point as pointTable } from "@/server/db/schemas/points";
import {
  route,
  routeVersion,
  stop,
  stopVersion,
} from "@/server/db/schemas/routes";
import { isUuid, migrateIdsToUuid } from "@/server/db/scripts/migrate-ids";

const LEGACY_DRIVER_ID = "legacy-driver-id-0001";
const LEGACY_MANAGER_ID = "legacy-manager-id-0001";
const LEGACY_VEHICLE_ID = "seed-vehicle-9999";
const LEGACY_PLATE = "LGC9999";

describe("migrateIdsToUuid", () => {
  it("migrates non-UUID user and vehicle ids and repoints all references", async () => {
    await db.insert(userTable).values([
      {
        id: LEGACY_DRIVER_ID,
        name: "Legacy Driver",
        email: "legacy-driver@migrate.test",
        emailVerified: true,
        role: "driver",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: LEGACY_MANAGER_ID,
        name: "Legacy Manager",
        email: "legacy-manager@migrate.test",
        emailVerified: true,
        role: "manager",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: LEGACY_DRIVER_ID,
      providerId: "credential",
      userId: LEGACY_DRIVER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(session).values({
      id: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      token: `token-${crypto.randomUUID()}`,
      userId: LEGACY_DRIVER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(vehicleTable).values({
      id: LEGACY_VEHICLE_ID,
      plate: LEGACY_PLATE,
      model: "Furgão Utilitário",
      kmPerLiterHundredths: 1250,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [routeRow] = await db
      .insert(route)
      .values({
        managerId: LEGACY_MANAGER_ID,
        driverId: LEGACY_DRIVER_ID,
        vehicleId: LEGACY_VEHICLE_ID,
        date: new Date(),
      })
      .returning();

    const [versionRow] = await db
      .insert(routeVersion)
      .values({
        routeId: routeRow.id,
        version: "1",
        managerId: LEGACY_MANAGER_ID,
        driverId: LEGACY_DRIVER_ID,
        vehicleId: LEGACY_VEHICLE_ID,
        date: new Date(),
        status: "draft",
      })
      .returning();

    const [pointRow] = await db
      .insert(pointTable)
      .values({
        name: "Ponto Migração",
        address: "Av. Paulista, 1000, São Paulo, SP",
        latitude: -23.5505,
        longitude: -46.6333,
        geocodeStatus: "manual",
      })
      .returning();

    const [stopRow] = await db
      .insert(stop)
      .values({
        routeId: routeRow.id,
        pointId: pointRow.id,
        order: "1",
        addressSnapshot: "Av. Paulista, 1000, São Paulo, SP",
      })
      .returning();

    await db.insert(stopVersion).values({
      stopId: stopRow.id,
      routeVersionId: versionRow.id,
      order: "1",
      pointId: pointRow.id,
      addressSnapshot: "Av. Paulista, 1000, São Paulo, SP",
      versionType: "structural",
      actorId: LEGACY_MANAGER_ID,
    });

    const result = await migrateIdsToUuid();

    expect(result.usersMigrated).toBe(2);
    expect(result.vehiclesMigrated).toBe(1);

    const [migratedDriver] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, "legacy-driver@migrate.test"));
    const [migratedManager] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, "legacy-manager@migrate.test"));
    const [migratedVehicle] = await db
      .select()
      .from(vehicleTable)
      .where(eq(vehicleTable.plate, LEGACY_PLATE));

    expect(isUuid(migratedDriver.id)).toBe(true);
    expect(isUuid(migratedManager.id)).toBe(true);
    expect(isUuid(migratedVehicle.id)).toBe(true);
    expect(migratedVehicle.model).toBe("Furgão Utilitário");

    const legacyUsers = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.id, LEGACY_DRIVER_ID));
    expect(legacyUsers).toHaveLength(0);

    const [migratedAccount] = await db
      .select()
      .from(account)
      .where(eq(account.userId, migratedDriver.id));
    expect(migratedAccount.accountId).toBe(migratedDriver.id);

    const [migratedSession] = await db
      .select()
      .from(session)
      .where(eq(session.userId, migratedDriver.id));
    expect(migratedSession).toBeDefined();

    const [migratedRoute] = await db
      .select()
      .from(route)
      .where(eq(route.id, routeRow.id));
    expect(migratedRoute.driverId).toBe(migratedDriver.id);
    expect(migratedRoute.managerId).toBe(migratedManager.id);
    expect(migratedRoute.vehicleId).toBe(migratedVehicle.id);

    const [migratedVersion] = await db
      .select()
      .from(routeVersion)
      .where(eq(routeVersion.id, versionRow.id));
    expect(migratedVersion.driverId).toBe(migratedDriver.id);
    expect(migratedVersion.managerId).toBe(migratedManager.id);
    expect(migratedVersion.vehicleId).toBe(migratedVehicle.id);

    const [migratedStopVersion] = await db
      .select()
      .from(stopVersion)
      .where(eq(stopVersion.stopId, stopRow.id));
    expect(migratedStopVersion.actorId).toBe(migratedManager.id);
  });

  it("is a no-op when all ids are already UUIDs", async () => {
    const result = await migrateIdsToUuid();

    expect(result.usersMigrated).toBe(0);
    expect(result.vehiclesMigrated).toBe(0);
  });

  it("detects UUID and non-UUID ids", () => {
    expect(isUuid(crypto.randomUUID())).toBe(true);
    expect(isUuid("0MVs5SuIEYf4MfmBEng5p1RH5Y8nfnfE")).toBe(false);
    expect(isUuid("seed-vehicle-1")).toBe(false);
  });
});
