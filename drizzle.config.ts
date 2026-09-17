import { defineConfig } from "drizzle-kit";

const { DATABASE_URL, DATABASE_URL_UNPOOLED } = process.env;
const url = DATABASE_URL_UNPOOLED ?? DATABASE_URL;
if (!url) {
  throw new Error(
    "[ERROR] The environment variable 'DATABASE_URL' is not defined.",
  );
}

export default defineConfig({
  schema: "./src/server/db/schemas",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
