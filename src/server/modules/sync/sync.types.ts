import { z } from "zod";

export const syncBatchItemSchema = z.object({
  id: z.string().uuid("ID do evento inválido"),
  stopId: z.string().uuid("ID da parada inválido"),
  arrival: z.iso.datetime({ local: true }),
  departure: z.iso.datetime({ local: true }),
});
export type SyncBatchItem = z.infer<typeof syncBatchItemSchema>;

export const syncBatchInputSchema = z.object({
  items: z
    .array(syncBatchItemSchema)
    .min(1, "Envie pelo menos um item no lote")
    .max(500, "Lote muito grande (máximo 500 itens)"),
});
export type SyncBatchInput = z.infer<typeof syncBatchInputSchema>;

export const syncAcceptedItemSchema = syncBatchItemSchema;
export type SyncAcceptedItem = z.infer<typeof syncAcceptedItemSchema>;

export const syncRejectionReasonSchema = z.enum([
  "departure_before_arrival",
  "off_route_date",
  "stop_already_closed",
  "stop_not_in_route",
  "future_timestamp",
]);
export type SyncRejectionReason = z.infer<typeof syncRejectionReasonSchema>;

export const syncRejectedItemSchema = z.object({
  id: z.string().uuid(),
  stopId: z.string().uuid(),
  reason: syncRejectionReasonSchema,
  message: z.string(),
});
export type SyncRejectedItem = z.infer<typeof syncRejectedItemSchema>;

export const syncBatchOutputSchema = z.object({
  accepted: z.array(syncAcceptedItemSchema),
  rejected: z.array(syncRejectedItemSchema),
  summary: z.object({
    total: z.number().int().nonnegative(),
    accepted: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
  }),
});
export type SyncBatchOutput = z.infer<typeof syncBatchOutputSchema>;

export const syncRejectionMessages: Record<SyncRejectionReason, string> = {
  departure_before_arrival: "A saída deve ocorrer após a chegada.",
  off_route_date: "O horário não pertence à data da rota.",
  stop_already_closed: "Chegada duplicada em parada já concluída.",
  stop_not_in_route: "A parada não pertence à rota do motorista.",
  future_timestamp: "O horário informado está no futuro.",
};
