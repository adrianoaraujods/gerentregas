import "dotenv/config";

import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schemas/auth";
import { point } from "@/server/db/schemas/points";
import {
  route,
  routeVersion,
  stop,
  stopVersion,
} from "@/server/db/schemas/routes";
import { encrypt } from "@/server/lib/crypto";

const MANAGER_EMAIL = "manager@demo.gerentregas.local";
const _MANAGER_PASSWORD = "demo123456";

const DRIVERS = [
  { name: "Carlos Silva", email: "carlos.silva@demo.gerentregas.local" },
  { name: "João Santos", email: "joao.santos@demo.gerentregas.local" },
  { name: "Pedro Oliveira", email: "pedro.oliveira@demo.gerentregas.local" },
  { name: "Lucas Souza", email: "lucas.souza@demo.gerentregas.local" },
  { name: "Rafael Costa", email: "rafael.costa@demo.gerentregas.local" },
  { name: "Marcos Ferreira", email: "marcos.ferreira@demo.gerentregas.local" },
];

const BH_POINTS = [
  {
    name: "Praça Sete",
    address: "Praça Sete de Setembro, Centro, Belo Horizonte - MG",
    latitude: -19.9191,
    longitude: -43.9386,
  },
  {
    name: "Afonso Pena - Centro",
    address: "Av. Afonso Pena, 1000, Centro, Belo Horizonte - MG",
    latitude: -19.9245,
    longitude: -43.9352,
  },
  {
    name: "Rua dos Aimorés",
    address: "Rua dos Aimorés, 500, Centro, Belo Horizonte - MG",
    latitude: -19.9211,
    longitude: -43.9318,
  },
  {
    name: "Rua da Bahia",
    address: "Rua da Bahia, 800, Centro, Belo Horizonte - MG",
    latitude: -19.9233,
    longitude: -43.9371,
  },
  {
    name: "Av. Amazonas - Centro",
    address: "Av. Amazonas, 1200, Centro, Belo Horizonte - MG",
    latitude: -19.9167,
    longitude: -43.9398,
  },
  {
    name: "Praça da Savassi",
    address: "Praça da Savassi, Savassi, Belo Horizonte - MG",
    latitude: -19.9333,
    longitude: -43.9356,
  },
  {
    name: "Rua Pernambuco - Savassi",
    address: "Rua Pernambuco, 1000, Savassi, Belo Horizonte - MG",
    latitude: -19.9356,
    longitude: -43.9321,
  },
  {
    name: "Av. Cristóvão Colombo",
    address: "Av. Cristóvão Colombo, 500, Savassi, Belo Horizonte - MG",
    latitude: -19.9312,
    longitude: -43.9378,
  },
  {
    name: "Rua Alagoas - Savassi",
    address: "Rua Alagoas, 700, Savassi, Belo Horizonte - MG",
    latitude: -19.9344,
    longitude: -43.9345,
  },
  {
    name: "Rua Goiás - Lourdes",
    address: "Rua Goiás, 1200, Lourdes, Belo Horizonte - MG",
    latitude: -19.9389,
    longitude: -43.9412,
  },
  {
    name: "Av. Bias Fortes - Lourdes",
    address: "Av. Bias Fortes, 800, Lourdes, Belo Horizonte - MG",
    latitude: -19.9401,
    longitude: -43.9389,
  },
  {
    name: "Rua Paraíba - Funcionários",
    address: "Rua Paraíba, 600, Funcionários, Belo Horizonte - MG",
    latitude: -19.9289,
    longitude: -43.9423,
  },
  {
    name: "Av. do Contorno - Funcionários",
    address: "Av. do Contorno, 3000, Funcionários, Belo Horizonte - MG",
    latitude: -19.9267,
    longitude: -43.9456,
  },
  {
    name: "Rua dos Inconfidentes - Santo Antônio",
    address: "Rua dos Inconfidentes, 400, Santo Antônio, Belo Horizonte - MG",
    latitude: -19.9123,
    longitude: -43.9289,
  },
  {
    name: "Rua Espírito Santo - Barro Preto",
    address: "Rua Espírito Santo, 900, Barro Preto, Belo Horizonte - MG",
    latitude: -19.9244,
    longitude: -43.9256,
  },
  {
    name: "Rua Ceará - Centro",
    address: "Rua Ceará, 1100, Centro, Belo Horizonte - MG",
    latitude: -19.9178,
    longitude: -43.9341,
  },
  {
    name: "Av. Brasil - Santa Efigênia",
    address: "Av. Brasil, 2000, Santa Efigênia, Belo Horizonte - MG",
    latitude: -19.9145,
    longitude: -43.9298,
  },
  {
    name: "Rua Tupinambás - Centro",
    address: "Rua Tupinambás, 300, Centro, Belo Horizonte - MG",
    latitude: -19.9156,
    longitude: -43.9367,
  },
];

type RouteStatus = "concluded" | "in_flight" | "draft" | "cancelled";

const ROUTE_STATUSES: RouteStatus[] = [
  "concluded",
  "in_flight",
  "draft",
  "cancelled",
];
const STATUS_WEIGHTS = [70, 15, 10, 5];

function _randomDateInRange(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function main() {
  console.log("🌱 Starting demo seed for Belo Horizonte...");

  await db.execute(sql`
    TRUNCATE TABLE
      "stop_version",
      "route_version",
      "stop",
      "route",
      "point",
      "user"
    CASCADE
  `);
  console.log("🧹 Cleared existing demo data");

  console.log("👤 Creating manager...");
  const managerAuth = await auth.api.createUser({
    body: {
      name: "Gerente Demo",
      email: MANAGER_EMAIL,
      password: _MANAGER_PASSWORD,
    },
  });
  if (!managerAuth.user) throw new Error("Failed to create manager");
  const managerId = managerAuth.user.id;
  await db
    .update(user)
    .set({ 
      document: encrypt("12345678901"),
      role: "manager" 
    })
    .where(sql`${user.id} = ${managerId}`);
  console.log(`   Manager created: ${MANAGER_EMAIL} (${managerId})`);

  console.log("🚗 Creating drivers...");
  const driverIds: string[] = [];
  for (const driver of DRIVERS) {
    const driverAuth = await auth.api.createUser({
      body: {
        name: driver.name,
        email: driver.email,
        password: "demo123456",
      },
    });
    if (!driverAuth.user) throw new Error(`Failed to create driver ${driver.email}`);
    const id = driverAuth.user.id;
    driverIds.push(id);
    
    await db
      .update(user)
      .set({
        document: encrypt(
          Math.floor(Math.random() * 90000000000 + 10000000000).toString(),
        ),
        role: "driver"
      })
      .where(sql`${user.id} = ${id}`);
    
    console.log(`   Driver created: ${driver.name} (${id})`);
  }

  console.log("📍 Creating points in Belo Horizonte...");
  const pointData: Array<{
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  }> = [];
  for (const pt of BH_POINTS) {
    const id = crypto.randomUUID();
    pointData.push({
      id,
      name: pt.name,
      address: pt.address,
      latitude: pt.latitude,
      longitude: pt.longitude,
    });
    await db.insert(point).values({
      id,
      name: pt.name,
      address: pt.address,
      latitude: pt.latitude,
      longitude: pt.longitude,
      geocodeStatus: "manual",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`   Point created: ${pt.name} (${pt.address})`);
  }

  console.log("🛣️  Generating routes for last 3 months...");
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);
  startDate.setHours(0, 0, 0, 0);

  const workingDays: Date[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (isWeekday(d)) {
      workingDays.push(new Date(d));
    }
  }
  console.log(`   Found ${workingDays.length} working days in range`);

  const routesCreated: Array<{
    id: string;
    driverId: string;
    date: Date;
    status: string;
  }> = [];

  for (const day of workingDays) {
    const shuffledDrivers = shuffle(driverIds);
    const routesPerDay = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < routesPerDay && i < shuffledDrivers.length; i++) {
      const driverId = shuffledDrivers[i];
      const status = pickWeighted<RouteStatus>(ROUTE_STATUSES, STATUS_WEIGHTS);
      const routeId = crypto.randomUUID();

      const routeDate = new Date(day);
      routeDate.setHours(8, Math.floor(Math.random() * 60), 0, 0);

      await db.insert(route).values({
        id: routeId,
        managerId,
        driverId,
        vehicleId: null,
        date: routeDate,
        status,
        currentVersion: "1",
        createdAt: routeDate,
        updatedAt: routeDate,
      } as typeof route.$inferInsert);

      const numStops = Math.floor(Math.random() * 4) + 3;
      const selectedPoints = shuffle(pointData).slice(0, numStops);
      const stopsCreated: Array<{
        id: string;
        order: string;
        arrivalAt: Date | null;
        departureAt: Date | null;
      }> = [];

      let currentTime = new Date(routeDate);

      for (let j = 0; j < selectedPoints.length; j++) {
        const stopId = crypto.randomUUID();
        const order = String(j + 1);
        const pointItem = selectedPoints[j];
        const isOrigin = order === "1";

        let arrivalAt: Date | null = null;
        let departureAt: Date | null = null;
        if (
          status === "concluded" ||
          (status === "in_flight" && j < numStops - 1)
        ) {
          const travel = Math.floor(Math.random() * 31) + 15;
          currentTime = addMinutes(currentTime, travel);
          if (isOrigin) {
            departureAt = new Date(currentTime);
          } else {
            arrivalAt = new Date(currentTime);
            const dwell = Math.floor(Math.random() * 26) + 10;
            currentTime = addMinutes(currentTime, dwell);
            departureAt = new Date(currentTime);
          }
        } else if (status === "in_flight" && j === numStops - 1 && !isOrigin) {
          const travel = Math.floor(Math.random() * 31) + 15;
          currentTime = addMinutes(currentTime, travel);
          arrivalAt = new Date(currentTime);
        }

        await db.insert(stop).values({
          id: stopId,
          routeId,
          pointId: pointItem.id,
          order,
          addressSnapshot: pointItem.address,
          latitudeSnapshot: pointItem.latitude,
          longitudeSnapshot: pointItem.longitude,
          arrivalAt,
          departureAt,
          createdAt: routeDate,
          updatedAt: routeDate,
        });

        stopsCreated.push({ id: stopId, order, arrivalAt, departureAt });
      }

      await db.insert(routeVersion).values({
        id: crypto.randomUUID(),
        routeId,
        version: "1",
        managerId,
        driverId,
        vehicleId: null,
        date: routeDate,
        status,
        createdAt: routeDate,
      } as typeof routeVersion.$inferInsert);

      const routeVersionId = (
        await db
          .select({ id: routeVersion.id })
          .from(routeVersion)
          .where(
            sql`${routeVersion.routeId} = ${routeId} AND ${routeVersion.version} = '1'`,
          )
          .limit(1)
      )[0]?.id;
      if (routeVersionId) {
        for (const stopItem of stopsCreated) {
          const pointItem = selectedPoints[parseInt(stopItem.order, 10) - 1];
          await db.insert(stopVersion).values({
            id: crypto.randomUUID(),
            stopId: stopItem.id,
            routeVersionId,
            order: stopItem.order,
            pointId: pointItem.id,
            addressSnapshot: pointItem.address,
            latitudeSnapshot: pointItem.latitude,
            longitudeSnapshot: pointItem.longitude,
            arrivalAt: stopItem.arrivalAt,
            departureAt: stopItem.departureAt,
            createdAt: routeDate,
          });
        }
      }

      routesCreated.push({ id: routeId, driverId, date: routeDate, status });
    }
  }

  console.log(`   Created ${routesCreated.length} routes`);

  const statusCounts = routesCreated.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log("   Status distribution:", statusCounts);

  const driverRouteCounts = routesCreated.reduce(
    (acc, r) => {
      acc[r.driverId] = (acc[r.driverId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log("   Routes per driver:", driverRouteCounts);

  const totalStops =
    (await db.select({ count: sql<number>`count(*)` }).from(stop))[0]?.count ??
    0;
  const totalPoints =
    (await db.select({ count: sql<number>`count(*)` }).from(point))[0]?.count ??
    0;
  const totalDrivers =
    (
      await db
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .where(sql`${user.role} = 'driver'`)
    )[0]?.count ?? 0;
  const totalManagers =
    (
      await db
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .where(sql`${user.role} = 'manager'`)
    )[0]?.count ?? 0;

  console.log("\n✅ Demo seed completed!");
  console.log(`   Managers: ${totalManagers}`);
  console.log(`   Drivers: ${totalDrivers}`);
  console.log(`   Points: ${totalPoints}`);
  console.log(`   Routes: ${routesCreated.length}`);
  console.log(`   Stops: ${totalStops}`);
  console.log(
    `   Date range: ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error("❌ Demo seed failed:", err);
    process.exit(1);
  });
}
