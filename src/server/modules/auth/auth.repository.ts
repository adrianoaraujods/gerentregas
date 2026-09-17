import { eq } from "drizzle-orm";

import type { Database } from "@/server/db";
import { user as userTable } from "@/server/db/schemas/auth";

import type { User } from "./auth.types";

export class AuthRepository {
  constructor(private readonly db: Database) {}

  async findUserById(id: User["id"]) {
    const [user] = await this.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1);
    return user ? user : null;
  }
}
