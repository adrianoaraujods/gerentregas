import type { Database } from "@/server/db";
import { RoutesRepository } from "./routes.repository";
import { RoutesService } from "./routes.service";
import type {
  AddStopInput,
  CreateRouteInput,
  DriverRouteOutput,
  ListRoutesInput,
  RouteHistoryOutput,
  RoutesListOutput,
  RouteWithStopsOutput,
  UpdateRouteInput,
  UpdateStopInput,
} from "./routes.types";
import {
  addStopInputSchema,
  createRouteInputSchema,
  driverRouteOutputSchema,
  routeHistoryOutputSchema,
  routesListOutputSchema,
  routeWithStopsOutputSchema,
  updateRouteInputSchema,
  updateStopInputSchema,
} from "./routes.types";

export class RoutesController {
  private readonly service: RoutesService;

  constructor(readonly db: Database) {
    this.service = new RoutesService(new RoutesRepository(db), db);
  }

  async createRoute(
    input: CreateRouteInput,
    managerId: string,
  ): Promise<RouteWithStopsOutput> {
    const validated = createRouteInputSchema.parse(input);
    const result = await this.service.createRoute(validated, managerId);
    return routeWithStopsOutputSchema.parse(result);
  }

  async getRoute(routeId: string): Promise<RouteWithStopsOutput> {
    const result = await this.service.getRoute(routeId);
    return routeWithStopsOutputSchema.parse(result);
  }

  async getDriverRoute(
    driverId: string,
    date: Date,
  ): Promise<DriverRouteOutput | null> {
    const result = await this.service.getDriverRoute(driverId, date);
    return result ? driverRouteOutputSchema.parse(result) : null;
  }

  async listRoutes(input: ListRoutesInput): Promise<RoutesListOutput> {
    const result = await this.service.listRoutes(input);
    return routesListOutputSchema.parse(result);
  }

  async updateRoute(
    routeId: string,
    input: UpdateRouteInput,
    managerId: string,
  ): Promise<RouteWithStopsOutput> {
    const validated = updateRouteInputSchema.parse(input);
    const result = await this.service.updateRoute(
      routeId,
      validated,
      managerId,
    );
    return routeWithStopsOutputSchema.parse(result);
  }

  async addStop(
    routeId: string,
    input: AddStopInput,
    managerId: string,
  ): Promise<RouteWithStopsOutput> {
    const validated = addStopInputSchema.parse(input);
    const result = await this.service.addStop(routeId, validated, managerId);
    return routeWithStopsOutputSchema.parse(result);
  }

  async updateStop(
    routeId: string,
    stopId: string,
    input: UpdateStopInput,
    managerId: string,
  ): Promise<RouteWithStopsOutput> {
    const validated = updateStopInputSchema.parse(input);
    const result = await this.service.updateStop(
      routeId,
      stopId,
      validated,
      managerId,
    );
    return routeWithStopsOutputSchema.parse(result);
  }

  async concludeStop(
    routeId: string,
    stopId: string,
  ): Promise<RouteWithStopsOutput> {
    const result = await this.service.concludeStop(routeId, stopId);
    return routeWithStopsOutputSchema.parse(result);
  }

  async deleteStop(
    routeId: string,
    stopId: string,
    managerId: string,
  ): Promise<RouteWithStopsOutput> {
    const result = await this.service.deleteStop(routeId, stopId, managerId);
    return routeWithStopsOutputSchema.parse(result);
  }

  async softDeleteRoute(routeId: string): Promise<void> {
    await this.service.softDeleteRoute(routeId);
  }

  async restoreRoute(routeId: string): Promise<RouteWithStopsOutput> {
    const result = await this.service.restoreRoute(routeId);
    return routeWithStopsOutputSchema.parse(result);
  }

  async getRouteHistory(routeId: string): Promise<RouteHistoryOutput> {
    const result = await this.service.getRouteHistory(routeId);
    return routeHistoryOutputSchema.parse(result);
  }
}
