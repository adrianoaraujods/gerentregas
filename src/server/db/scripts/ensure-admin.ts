import { sql } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schemas/auth";

export interface EnsureAdminInput {
  email: string;
  password: string;
}

export async function ensureAdmin({ email, password }: EnsureAdminInput) {
  if (!email) {
    throw new Error(
      "[ERROR] The environment variable 'ADMIN_EMAIL' is not defined.",
    );
  }

  if (!password) {
    throw new Error(
      "[ERROR] The environment variable 'ADMIN_PASSWORD' is not defined.",
    );
  }

  const normalizedEmail = email.toLowerCase();

  const [existing] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(sql`lower(${user.email}) = ${normalizedEmail}`)
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      await db
        .update(user)
        .set({ role: "admin" })
        .where(sql`lower(${user.email}) = ${normalizedEmail}`);
    }
    return;
  }

  try {
    await auth.api.createUser({
      body: { name: "Admin", role: "admin", email, password },
    });
  } catch {
    const [created] = await db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(sql`lower(${user.email}) = ${normalizedEmail}`)
      .limit(1);

    if (!created) {
      throw new Error(`[ERROR] Failed to create admin user '${email}'.`);
    }

    if (created.role !== "admin") {
      await db
        .update(user)
        .set({ role: "admin" })
        .where(sql`lower(${user.email}) = ${normalizedEmail}`);
    }
  }
}
