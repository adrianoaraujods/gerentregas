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
  "DEPARTURE_BEFORE_ARRIVAL",
  "TIMESTAMP_OFF_ROUTE_DATE",
  "DUPLICATE_ARRIVAL_ON_CLOSED_STOP",
  "STOP_NOT_IN_DRIVER_ROUTE",
  "FUTURE_TIMESTAMP",
  "STOP_NOT_FOUND",
  "ROUTE_NOT_FOUND",
  "ROUTE_NOT_IN_FLIGHT",
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
  DEPARTURE_BEFORE_ARRIVAL: "A saída deve ocorrer após a chegada.",
  TIMESTAMP_OFF_ROUTE_DATE: "O horário não pertence à data da rota.",
  DUPLICATE_ARRIVAL_ON_CLOSED_STOP: "Chegada duplicada em parada já concluída.",
  STOP_NOT_IN_DRIVER_ROUTE: "A parada não pertence à rota do motorista.",
  FUTURE_TIMESTAMP: "O horário informado está no futuro.",
  STOP_NOT_FOUND: "Parada não encontrada.",
  ROUTE_NOT_FOUND: "Rota não encontrada.",
  ROUTE_NOT_IN_FLIGHT: "A rota deve estar em andamento para sincronizar.",
};
