import "dotenv/config";

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { parameter } from "@/server/db/schemas/parameters";
import { ensureAdmin } from "@/server/db/scripts/ensure-admin";
import { migrateIdsToUuid } from "@/server/db/scripts/migrate-ids";

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  await ensureAdmin({
    email: ADMIN_EMAIL ?? "",
    password: ADMIN_PASSWORD ?? "",
  });

  console.log(`Admin user ensured: ${ADMIN_EMAIL}`);

  const migration = await migrateIdsToUuid();
  if (migration.usersMigrated > 0 || migration.vehiclesMigrated > 0) {
    console.log(
      `Migrated ${migration.usersMigrated} user(s) and ${migration.vehiclesMigrated} vehicle(s) to UUID ids`,
    );
  }

  // Seed default parameters
  const [existing] = await db
    .select()
    .from(parameter)
    .where(eq(parameter.id, "system"))
    .limit(1);

  if (!existing) {
    await db.insert(parameter).values({
      id: "system",
      fuelPricePerLiter: 600, // R$ 6.00 in cents
      standardWorkdayDuration: 480, // 8 hours in minutes
    });
    console.log("Default parameters seeded");
  } else {
    console.log("Parameters already exist, skipping seed");
  }

  // Seed default active vehicle
  const { vehicle } = await import("@/server/db/schemas/fleet");
  const [existingVehicle] = await db.select().from(vehicle).limit(1);
  if (!existingVehicle) {
    await db.insert(vehicle).values({
      id: crypto.randomUUID(),
      plate: "ABC-1D23",
      model: "Furgão Utilitário",
      kmPerLiterHundredths: 1250, // 12.50 km/L
      active: true,
    });
    console.log("Default active vehicle seeded (ABC-1D23)");
  } else {
    console.log("Vehicles already exist, skipping vehicle seed");
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
