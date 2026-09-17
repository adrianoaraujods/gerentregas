import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { relations } from "@/server/db/relations";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error(
    "[ERROR] The environment variable 'DATABASE_URL' is not defined.",
  );
}

const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, relations });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
