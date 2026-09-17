import { authenticatedProcedure, createRouter } from "@/server/api";

import { AuthController } from "./auth.controller";
import { profileSchema } from "./auth.types";

export const authRouter = createRouter({
  getProfile: authenticatedProcedure.query(({ ctx: { db, session } }) =>
    new AuthController(db).getUser(session.user.id).then(profileSchema.parse),
  ),
});
