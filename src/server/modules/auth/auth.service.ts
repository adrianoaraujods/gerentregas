import { NotFoundError } from "@/server/api";

import type { AuthRepository } from "./auth.repository";
import type { User } from "./auth.types";

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async getUser(id: User["id"]) {
    const user = await this.repository.findUserById(id);
    if (!user) {
      throw new NotFoundError("Usuário não encontrado.");
    }
    return user;
  }
}
