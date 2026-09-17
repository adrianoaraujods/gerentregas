import type { Database } from "@/server/db";

import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import type { User } from "./auth.types";

export class AuthController {
  private readonly service;

  constructor(db: Database) {
    this.service = new AuthService(new AuthRepository(db));
  }

  async getUser(userId: User["id"]): Promise<User> {
    return this.service.getUser(userId);
  }
}
