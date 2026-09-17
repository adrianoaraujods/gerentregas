import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ".env.test" });

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error(
    "[ERROR] The environment variable 'DATABASE_URL' is not defined.",
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    env: { DATABASE_URL },
    fileParallelism: false,
  },
  resolve: {
    alias: [{ find: "@", replacement: `${path.resolve(__dirname)}/src/` }],
  },
});
