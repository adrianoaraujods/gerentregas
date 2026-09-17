import { defineRelations } from "drizzle-orm";

import { schema } from "./schemas";

export const relations = defineRelations(schema, (helpers) => ({
  user: {
    sessions: helpers.many.session(),
    accounts: helpers.many.account(),
  },
  session: {
    user: helpers.one.user({
      from: helpers.session.userId,
      to: helpers.user.id,
    }),
  },
  account: {
    user: helpers.one.user({
      from: helpers.account.userId,
      to: helpers.user.id,
    }),
  },
}));
