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
});
export type StopWithPoint = z.infer<typeof stopWithPointSchema>;

export const routeWithStopsSchema = routeSchema.extend({
  stops: z.array(stopWithPointSchema),
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

export const routeOutputSchema = routeSchema.pick({
  id: true,
  managerId: true,
  driverId: true,
  vehicleId: true,
  date: true,
  status: true,
  currentVersion: true,
  createdAt: true,
  updatedAt: true,
});
export type RouteOutput = z.infer<typeof routeOutputSchema>;

export const stopOutputSchema = stopSchema.pick({
  id: true,
  routeId: true,
  pointId: true,
  order: true,
  addressSnapshot: true,
  latitudeSnapshot: true,
  longitudeSnapshot: true,
  concludedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type StopOutput = z.infer<typeof stopOutputSchema>;

export const stopWithPointOutputSchema = stopOutputSchema.extend({
  point: pointOutputSchema.nullable(),
});
export type StopWithPointOutput = z.infer<typeof stopWithPointOutputSchema>;

export const routeWithStopsOutputSchema = routeOutputSchema.extend({
  stops: z.array(stopWithPointOutputSchema),
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
  versions: z.array(routeVersionWithStopsSchema),
});
export type RouteHistoryOutput = z.infer<typeof routeHistoryOutputSchema>;
