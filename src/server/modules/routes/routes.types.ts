import { createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";

import {
  route,
  routeStatusEnum,
  routeVersion,
  stop,
  stopVersion,
} from "@/server/db/schemas/routes";
import { pointOutputSchema } from "@/server/modules/points/points.types";

export const routeStatusSchema = createSelectSchema(routeStatusEnum);
export type RouteStatus = z.infer<typeof routeStatusSchema>;

export const routeSchema = createSelectSchema(route);
export type Route = z.infer<typeof routeSchema>;

export const routeVersionSchema = createSelectSchema(routeVersion);
export type RouteVersion = z.infer<typeof routeVersionSchema>;

export const stopSchema = createSelectSchema(stop);
export type Stop = z.infer<typeof stopSchema>;

export const stopVersionSchema = createSelectSchema(stopVersion);
export type StopVersion = z.infer<typeof stopVersionSchema>;

export const stopWithPointSchema = stopSchema.extend({
  point: pointOutputSchema.nullable(),
  arrivalAt: z.date().nullable().optional(),
  departureAt: z.date().nullable().optional(),
  dwellSeconds: z.number().int().nonnegative().optional(),
});
export type StopWithPoint = z.infer<typeof stopWithPointSchema>;

export const routeWithStopsSchema = routeSchema.extend({
  stops: z.array(stopWithPointSchema),
  totalDwellSeconds: z.number().int().nonnegative().optional(),
});
export type RouteWithStops = z.infer<typeof routeWithStopsSchema>;

export const routeVersionWithStopsSchema = routeVersionSchema.extend({
  stops: z.array(
    stopVersionSchema.extend({
      point: pointOutputSchema.nullable(),
    }),
  ),
});
export type RouteVersionWithStops = z.infer<typeof routeVersionWithStopsSchema>;

export const routePricingSchema = z.object({
  distanceKm: z.number().nonnegative().nullable(),
  cost: z.number().nonnegative().nullable(),
});
export type RoutePricing = z.infer<typeof routePricingSchema>;

export const routeOutputSchema = routeSchema
  .pick({
    id: true,
    managerId: true,
    driverId: true,
    vehicleId: true,
    date: true,
    status: true,
    currentVersion: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend(routePricingSchema.shape);
export type RouteOutput = z.infer<typeof routeOutputSchema>;

export const routeVersionOutputSchema = routeVersionSchema
  .pick({
    id: true,
    routeId: true,
    version: true,
    managerId: true,
    driverId: true,
    vehicleId: true,
    date: true,
    status: true,
    createdAt: true,
  })
  .extend(routePricingSchema.shape);
export type RouteVersionOutput = z.infer<typeof routeVersionOutputSchema>;

export const routeVersionWithStopsOutputSchema =
  routeVersionOutputSchema.extend({
    stops: z.array(
      stopVersionSchema.extend({
        point: pointOutputSchema.nullable(),
      }),
    ),
  });
export type RouteVersionWithStopsOutput = z.infer<
  typeof routeVersionWithStopsOutputSchema
>;

export const stopOutputSchema = stopSchema.pick({
  id: true,
  routeId: true,
  pointId: true,
  order: true,
  addressSnapshot: true,
  latitudeSnapshot: true,
  longitudeSnapshot: true,
  concludedAt: true,
  arrivalAt: true,
  departureAt: true,
  createdAt: true,
  updatedAt: true,
});
export type StopOutput = z.infer<typeof stopOutputSchema>;

export const stopWithPointOutputSchema = stopOutputSchema.extend({
  point: pointOutputSchema.nullable(),
  dwellSeconds: z.number().int().nonnegative().optional(),
});
export type StopWithPointOutput = z.infer<typeof stopWithPointOutputSchema>;

export const routeWithStopsOutputSchema = routeOutputSchema.extend({
  stops: z.array(stopWithPointOutputSchema),
  totalDwellSeconds: z.number().int().nonnegative().optional(),
});
export type RouteWithStopsOutput = z.infer<typeof routeWithStopsOutputSchema>;

export const createRouteInputSchema = z.object({
  driverId: z.string().uuid("ID do motorista inválido"),
  vehicleId: z.string().uuid("ID do veículo inválido").optional().nullable(),
  date: z.iso.datetime({ local: true }),
  stops: z
    .array(
      z.object({
        pointId: z.string().uuid("ID do ponto inválido"),
        order: z.string().nonempty("Ordem é obrigatória"),
      }),
    )
    .min(1, "Pelo menos uma parada (origem) é obrigatória"),
});
export type CreateRouteInput = z.infer<typeof createRouteInputSchema>;

export const updateRouteInputSchema = z.object({
  driverId: z.string().uuid("ID do motorista inválido").optional(),
  vehicleId: z.string().uuid("ID do veículo inválido").optional().nullable(),
  status: routeStatusSchema.optional(),
  distanceKm: z
    .number()
    .positive("Distância deve ser um valor positivo")
    .optional(),
});
export type UpdateRouteInput = z.infer<typeof updateRouteInputSchema>;

export const addStopInputSchema = z.object({
  routeId: z.string().uuid("ID da rota inválido"),
  pointId: z.string().uuid("ID do ponto inválido"),
  order: z.string().nonempty("Ordem é obrigatória"),
});
export type AddStopInput = z.infer<typeof addStopInputSchema>;

export const updateStopInputSchema = z.object({
  pointId: z.string().uuid("ID do ponto inválido").optional(),
  order: z.string().nonempty("Ordem é obrigatória").optional(),
});
export type UpdateStopInput = z.infer<typeof updateStopInputSchema>;

export const concludeStopInputSchema = z.object({
  stopId: z.string().uuid("ID da parada inválido"),
});
export type ConcludeStopInput = z.infer<typeof concludeStopInputSchema>;

export const listRoutesInputSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  driverId: z.string().uuid().optional(),
  status: routeStatusSchema.optional(),
  dateFrom: z.iso
    .datetime({ local: true })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  dateTo: z.iso
    .datetime({ local: true })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});
export type ListRoutesInput = z.infer<typeof listRoutesInputSchema>;

export const routesListOutputSchema = z.object({
  routes: z.array(routeOutputSchema),
  total: z.number().int().nonnegative(),
});
export type RoutesListOutput = z.infer<typeof routesListOutputSchema>;

export const driverRouteOutputSchema = routeWithStopsOutputSchema;
export type DriverRouteOutput = z.infer<typeof driverRouteOutputSchema>;

export const routeHistoryOutputSchema = z.object({
  versions: z.array(routeVersionWithStopsOutputSchema),
});
export type RouteHistoryOutput = z.infer<typeof routeHistoryOutputSchema>;

export const startShiftInputSchema = z.object({
  vehicleId: z.string().uuid("ID do veículo inválido").optional().nullable(),
});
export type StartShiftInput = z.infer<typeof startShiftInputSchema>;

export const checkInInputSchema = z.object({
  stopId: z.string().uuid("ID da parada inválido"),
});
export type CheckInInput = z.infer<typeof checkInInputSchema>;

export const checkOutInputSchema = z.object({
  stopId: z.string().uuid("ID da parada inválido"),
});
export type CheckOutInput = z.infer<typeof checkOutInputSchema>;

export const syncStopEventTypeEnum = z.enum(["arrival", "departure"]);
export type SyncStopEventType = z.infer<typeof syncStopEventTypeEnum>;

export const syncStopEventInputSchema = z.object({
  stopId: z.string().uuid("ID da parada inválido"),
  type: syncStopEventTypeEnum,
  timestamp: z.iso.datetime({ local: true }),
});
export type SyncStopEventInput = z.infer<typeof syncStopEventInputSchema>;

export const syncBatchInputSchema = z.object({
  events: z
    .array(syncStopEventInputSchema)
    .min(1, "Pelo menos um evento é obrigatório"),
});
export type SyncBatchInput = z.infer<typeof syncBatchInputSchema>;

export const syncRejectReasonEnum = z.enum([
  "DEPARTURE_BEFORE_ARRIVAL",
  "TIMESTAMP_OFF_ROUTE_DATE",
  "DUPLICATE_ARRIVAL_ON_CLOSED_STOP",
  "STOP_NOT_IN_DRIVER_ROUTE",
  "FUTURE_TIMESTAMP",
  "STOP_NOT_FOUND",
  "ROUTE_NOT_FOUND",
  "ROUTE_NOT_IN_FLIGHT",
]);
export type SyncRejectReason = z.infer<typeof syncRejectReasonEnum>;

export const syncEventResultSchema = z.object({
  stopId: z.string().uuid(),
  type: syncStopEventTypeEnum,
  accepted: z.boolean(),
  reason: syncRejectReasonEnum.nullable(),
  timestamp: z.iso.datetime({ local: true }),
});
export type SyncEventResult = z.infer<typeof syncEventResultSchema>;

export const syncBatchOutputSchema = z.object({
  results: z.array(syncEventResultSchema),
  acceptedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
});
export type SyncBatchOutput = z.infer<typeof syncBatchOutputSchema>;
