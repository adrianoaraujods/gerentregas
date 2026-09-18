import { createRouter, driverProcedure } from "@/server/api";
import type { Database } from "@/server/db";
import { SyncController } from "./sync.controller";
import { syncBatchInputSchema, syncBatchOutputSchema } from "./sync.types";

function createController(db: Database) {
  return new SyncController(db);
}

export const syncRouter = createRouter({
  uploadBatch: driverProcedure
    .input(syncBatchInputSchema)
    .mutation(({ ctx: { db, session }, input }) =>
      createController(db)
        .uploadBatch(input, session.user.id)
        .then(syncBatchOutputSchema.parse),
    ),
});
