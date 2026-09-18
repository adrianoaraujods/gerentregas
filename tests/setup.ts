import { sql } from "drizzle-orm";
import { beforeEach } from "vitest";

import { db } from "@/server/db";

beforeEach(async () => {
  await db.execute(sql`
    TRUNCATE TABLE
      "user",
      "session",
      "account",
      "verification",
      "point",
      "parameter"
    CASCADE
  `);
});
