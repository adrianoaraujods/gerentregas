import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { relations } from "@/server/db/relations";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/dummy";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[WARNING] The environment variable 'DATABASE_URL' is not defined.",
  );
}

const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, relations });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
