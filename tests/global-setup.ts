import { execSync } from "node:child_process";
import { config } from "dotenv";
import { Client } from "pg";

export async function setup() {
  console.log("[INFO] Setting up test database...");

  config({ path: ".env.test" });

  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    throw new Error(
      "[ERROR] The environment variable 'DATABASE_URL' is not defined.",
    );
  }

  const connectionUrl = new URL(DATABASE_URL);

  const testDbName = connectionUrl.pathname.replace("/", "");

  connectionUrl.pathname = "/postgres";
  const client = new Client({ connectionString: connectionUrl.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS ${testDbName} WITH (FORCE)`);
  await client.query(`CREATE DATABASE ${testDbName}`);
  await client.end();

  execSync("pnpm db:push", {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}
