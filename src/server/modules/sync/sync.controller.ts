import type { Database } from "@/server/db";
import { SyncRepository } from "./sync.repository";
import { SyncService } from "./sync.service";
import type { SyncBatchInput, SyncBatchOutput } from "./sync.types";
import { syncBatchInputSchema, syncBatchOutputSchema } from "./sync.types";

export class SyncController {
  private readonly service: SyncService;

  constructor(readonly db: Database) {
    this.service = new SyncService(new SyncRepository(db));
  }

  async uploadBatch(
    input: SyncBatchInput,
    driverId: string,
  ): Promise<SyncBatchOutput> {
    const validated = syncBatchInputSchema.parse(input);
    const result = await this.service.uploadBatch(validated, driverId);
    return syncBatchOutputSchema.parse(result);
  }
}
