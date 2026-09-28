import { eq } from "drizzle-orm";

import { db, type Transaction } from "@/server/db";
import { account, session, user } from "@/server/db/schemas/auth";
import { vehicle } from "@/server/db/schemas/fleet";
import { route, routeVersion, stopVersion } from "@/server/db/schemas/routes";

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface MigrateIdsResult {
  usersMigrated: number;
  vehiclesMigrated: number;
}

export async function migrateIdsToUuid(): Promise<MigrateIdsResult> {
  const users = await db.select({ id: user.id }).from(user);
  const vehicles = await db.select({ id: vehicle.id }).from(vehicle);

  const staleUserIds = users.map((u) => u.id).filter((id) => !isUuid(id));
  const staleVehicleIds = vehicles.map((v) => v.id).filter((id) => !isUuid(id));

  for (const id of staleUserIds) {
    await migrateUserToUuid(id);
  }
  for (const id of staleVehicleIds) {
    await migrateVehicleToUuid(id);
  }

  return {
    usersMigrated: staleUserIds.length,
    vehiclesMigrated: staleVehicleIds.length,
  };
}

async function migrateUserToUuid(oldId: string): Promise<void> {
  await db.transaction(async (tx: Transaction) => {
    const [row] = await tx.select().from(user).where(eq(user.id, oldId));
    if (!row) return;

    const newId = crypto.randomUUID();

    // Free the unique email constraint while both rows coexist.
    await tx
      .update(user)
      .set({ email: `migrated-${oldId}@gerentregas.invalid` })
      .where(eq(user.id, oldId));

    await tx.insert(user).values({ ...row, id: newId });

    await repointUserReferences(tx, oldId, newId);

    await tx.delete(user).where(eq(user.id, oldId));
  });
}

async function repointUserReferences(
  tx: Transaction,
  oldId: string,
  newId: string,
): Promise<void> {
  await tx
    .update(session)
    .set({ userId: newId })
    .where(eq(session.userId, oldId));
  await tx
    .update(session)
    .set({ impersonatedBy: newId })
    .where(eq(session.impersonatedBy, oldId));
  await tx
    .update(account)
    .set({ userId: newId })
    .where(eq(account.userId, oldId));
  await tx
    .update(account)
    .set({ accountId: newId })
    .where(eq(account.accountId, oldId));
  await tx
    .update(route)
    .set({ driverId: newId })
    .where(eq(route.driverId, oldId));
  await tx
    .update(route)
    .set({ managerId: newId })
    .where(eq(route.managerId, oldId));
  await tx
    .update(routeVersion)
    .set({ driverId: newId })
    .where(eq(routeVersion.driverId, oldId));
  await tx
    .update(routeVersion)
    .set({ managerId: newId })
    .where(eq(routeVersion.managerId, oldId));
  await tx
    .update(stopVersion)
    .set({ actorId: newId })
    .where(eq(stopVersion.actorId, oldId));
}

async function migrateVehicleToUuid(oldId: string): Promise<void> {
  await db.transaction(async (tx: Transaction) => {
    const [row] = await tx.select().from(vehicle).where(eq(vehicle.id, oldId));
    if (!row) return;

    const newId = crypto.randomUUID();

    // Free the unique plate constraint while both rows coexist.
    await tx
      .update(vehicle)
      .set({ plate: `MIGRATED-${oldId}` })
      .where(eq(vehicle.id, oldId));

    await tx.insert(vehicle).values({ ...row, id: newId });

    await tx
      .update(route)
      .set({ vehicleId: newId })
      .where(eq(route.vehicleId, oldId));
    await tx
      .update(routeVersion)
      .set({ vehicleId: newId })
      .where(eq(routeVersion.vehicleId, oldId));

    await tx.delete(vehicle).where(eq(vehicle.id, oldId));
  });
}
