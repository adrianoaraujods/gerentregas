import { BadRequestError, ConflictError, NotFoundError } from "@/server/api";

import type { RoutesRepository } from "./routes.repository";
import type {
  AddStopInput,
  CreateRouteInput,
  Route,
  RouteStatus,
  RouteWithStops,
  Stop,
  UpdateRouteInput,
  UpdateStopInput,
} from "./routes.types";

export class RoutesService {
  constructor(private readonly repository: RoutesRepository) {}

  async createRoute(
    input: CreateRouteInput,
    managerId: string,
  ): Promise<RouteWithStops> {
    const existingRoute = await this.repository.checkDriverDateConflict(
      input.driverId,
      new Date(input.date),
    );
    if (existingRoute) {
      throw new ConflictError(
        "Já existe uma rota para este motorista nesta data (RN05).",
      );
    }

    const stops = input.stops.sort((a, b) => a.order.localeCompare(b.order));
    if (stops[0].order !== "1") {
      throw new BadRequestError("A primeira parada deve ter ordem '1' (RN01).");
    }

    for (let i = 0; i < stops.length; i++) {
      if (stops[i].order !== String(i + 1)) {
        throw new BadRequestError(
          "As paradas devem ter ordem sequencial (RN06).",
        );
      }
    }

    const pointIds = stops.map((s) => s.pointId);
    const pointsData = await this.repository.findPointsByIds(pointIds);
    const pointsMap = new Map(pointsData.map((p) => [p.id, p]));

    for (const stopInput of stops) {
      const pointData = pointsMap.get(stopInput.pointId);
      if (!pointData) {
        throw new NotFoundError(`Ponto ${stopInput.pointId} não encontrado.`);
      }
    }

    const newRoute = await this.repository.createRoute({
      managerId,
      driverId: input.driverId,
      vehicleId: input.vehicleId ?? null,
      date: new Date(input.date),
      status: "draft",
      currentVersion: "1",
    });

    if (!newRoute) {
      throw new BadRequestError("Falha ao criar rota.");
    }

    const createdStops: Stop[] = [];
    for (const stopInput of stops) {
      const pointData = pointsMap.get(stopInput.pointId);
      if (!pointData) continue;
      const createdStop = await this.repository.createStop({
        routeId: newRoute.id,
        pointId: stopInput.pointId,
        order: stopInput.order,
        addressSnapshot: pointData.address,
        latitudeSnapshot: pointData.latitude,
        longitudeSnapshot: pointData.longitude,
      });
      if (createdStop) createdStops.push(createdStop);
    }

    await this.repository.createRouteVersion({
      routeId: newRoute.id,
      version: "1",
      managerId,
      driverId: input.driverId,
      vehicleId: input.vehicleId ?? null,
      date: new Date(input.date),
      status: "draft",
    });

    const routeVersionId = await this.repository.findRouteVersionId(
      newRoute.id,
      "1",
    );
    if (!routeVersionId) {
      throw new BadRequestError("Falha ao buscar versão da rota.");
    }

    for (const createdStop of createdStops) {
      await this.repository.createStopVersion({
        stopId: createdStop.id,
        routeVersionId,
        order: createdStop.order,
        pointId: createdStop.pointId,
        addressSnapshot: createdStop.addressSnapshot,
        latitudeSnapshot: createdStop.latitudeSnapshot,
        longitudeSnapshot: createdStop.longitudeSnapshot,
        concludedAt: createdStop.concludedAt,
      });
    }

    const result = await this.repository.findRouteWithStops(newRoute.id);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota criada.");
    }
    return result;
  }

  async getRoute(routeId: string): Promise<RouteWithStops> {
    const routeData = await this.repository.findRouteWithStops(routeId);
    if (!routeData) {
      throw new NotFoundError("Rota não encontrada.");
    }
    return routeData;
  }

  async getDriverRoute(
    driverId: string,
    date: Date,
  ): Promise<RouteWithStops | null> {
    const routeData = await this.repository.findRouteByDriverAndDate(
      driverId,
      date,
    );
    if (!routeData) return null;
    return this.repository.findRouteWithStops(routeData.id);
  }

  async listRoutes(input: {
    limit: number;
    offset: number;
    driverId?: string;
    status?: RouteStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    return this.repository.listRoutes(input);
  }

  async updateRoute(
    routeId: string,
    input: UpdateRouteInput,
    managerId: string,
  ): Promise<RouteWithStops> {
    const existingRoute = await this.repository.findRouteById(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    if (input.driverId && input.driverId !== existingRoute.driverId) {
      const conflict = await this.repository.checkDriverDateConflict(
        input.driverId,
        existingRoute.date,
        routeId,
      );
      if (conflict) {
        throw new ConflictError(
          "Já existe uma rota para este motorista nesta data (RN05).",
        );
      }
    }

    if (input.status) {
      await this.validateStatusTransition(existingRoute.status, input.status);
    }

    if (
      existingRoute.status !== "draft" &&
      existingRoute.status !== "in_flight"
    ) {
      if (input.driverId || input.vehicleId !== undefined) {
        throw new BadRequestError(
          "Não é possível alterar motorista ou veículo de rota concluída ou cancelada.",
        );
      }
    }

    const updatedRoute = await this.repository.updateRoute(routeId, input);
    if (!updatedRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    if (input.driverId || input.vehicleId !== undefined || input.status) {
      await this.createNewVersion(routeId, managerId, updatedRoute);
    }

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    return result;
  }

  async addStop(
    routeId: string,
    input: AddStopInput,
    managerId: string,
  ): Promise<RouteWithStops> {
    const existingRoute = await this.repository.findRouteWithStops(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    if (
      existingRoute.status === "concluded" ||
      existingRoute.status === "cancelled"
    ) {
      throw new BadRequestError(
        "Não é possível adicionar paradas a rota concluída ou cancelada.",
      );
    }

    const pointData = await this.repository.findPointById(input.pointId);
    if (!pointData) {
      throw new NotFoundError("Ponto não encontrado.");
    }

    const lastConcludedOrder =
      await this.repository.getLastConcludedStopOrder(routeId);
    if (
      lastConcludedOrder &&
      input.order.localeCompare(lastConcludedOrder) <= 0
    ) {
      throw new BadRequestError(
        "Não é possível inserir paradas antes ou na última parada concluída.",
      );
    }

    const orderConflict = await this.repository.checkOrderConflict(
      routeId,
      input.order,
    );
    if (orderConflict) {
      throw new ConflictError("Já existe uma parada com esta ordem (RN06).");
    }

    const maxOrder = await this.repository.getMaxStopOrder(routeId);
    const newOrder =
      maxOrder && input.order.localeCompare(maxOrder) > 0
        ? input.order
        : String(Number(maxOrder ?? 0) + 1);

    const newStop = await this.repository.createStop({
      routeId,
      pointId: input.pointId,
      order: newOrder,
      addressSnapshot: pointData.address,
      latitudeSnapshot: pointData.latitude,
      longitudeSnapshot: pointData.longitude,
    });

    if (!newStop) {
      throw new BadRequestError("Falha ao criar parada.");
    }

    await this.createNewVersion(routeId, managerId, existingRoute);

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    return result;
  }

  async updateStop(
    routeId: string,
    stopId: string,
    input: UpdateStopInput,
    managerId: string,
  ): Promise<RouteWithStops> {
    const existingRoute = await this.repository.findRouteWithStops(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    const existingStop = existingRoute.stops.find((s) => s.id === stopId);
    if (!existingStop) {
      throw new NotFoundError("Parada não encontrada.");
    }

    if (existingStop.concludedAt) {
      throw new BadRequestError(
        "Não é possível alterar uma parada já concluída.",
      );
    }

    if (
      existingRoute.status === "concluded" ||
      existingRoute.status === "cancelled"
    ) {
      throw new BadRequestError(
        "Não é possível alterar paradas de rota concluída ou cancelada.",
      );
    }

    const lastConcludedOrder =
      await this.repository.getLastConcludedStopOrder(routeId);
    if (
      lastConcludedOrder &&
      existingStop.order.localeCompare(lastConcludedOrder) <= 0
    ) {
      throw new BadRequestError(
        "Não é possível alterar paradas antes ou na última parada concluída.",
      );
    }

    if (input.order && input.order !== existingStop.order) {
      if (
        lastConcludedOrder &&
        input.order.localeCompare(lastConcludedOrder) <= 0
      ) {
        throw new BadRequestError(
          "Não é possível mover parada para antes ou na última parada concluída.",
        );
      }

      const orderConflict = await this.repository.checkOrderConflict(
        routeId,
        input.order,
        stopId,
      );
      if (orderConflict) {
        throw new ConflictError("Já existe uma parada com esta ordem (RN06).");
      }
    }

    if (input.pointId) {
      const pointData = await this.repository.findPointById(input.pointId);
      if (!pointData) {
        throw new NotFoundError("Ponto não encontrado.");
      }
    }

    await this.repository.updateStop(stopId, input);
    await this.createNewVersion(routeId, managerId, existingRoute);

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    return result;
  }

  async concludeStop(routeId: string, stopId: string): Promise<RouteWithStops> {
    const existingRoute = await this.repository.findRouteWithStops(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    const existingStop = existingRoute.stops.find((s) => s.id === stopId);
    if (!existingStop) {
      throw new NotFoundError("Parada não encontrada.");
    }

    if (existingStop.concludedAt) {
      throw new BadRequestError("Parada já foi concluída.");
    }

    if (existingRoute.status === "draft") {
      await this.repository.updateRoute(routeId, { status: "in_flight" });
    }

    await this.repository.updateStop(stopId, { concludedAt: new Date() });

    const allStops = await this.repository.listStopsByRoute(routeId);
    const allConcluded = allStops.every((s) => s.concludedAt);
    if (allConcluded) {
      await this.repository.updateRoute(routeId, { status: "concluded" });
    }

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    return result;
  }

  async deleteStop(
    routeId: string,
    stopId: string,
    managerId: string,
  ): Promise<RouteWithStops> {
    const existingRoute = await this.repository.findRouteWithStops(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    const existingStop = existingRoute.stops.find((s) => s.id === stopId);
    if (!existingStop) {
      throw new NotFoundError("Parada não encontrada.");
    }

    if (existingStop.concludedAt) {
      throw new BadRequestError(
        "Não é possível excluir uma parada já concluída.",
      );
    }

    if (
      existingRoute.status === "concluded" ||
      existingRoute.status === "cancelled"
    ) {
      throw new BadRequestError(
        "Não é possível excluir paradas de rota concluída ou cancelada.",
      );
    }

    const lastConcludedOrder =
      await this.repository.getLastConcludedStopOrder(routeId);
    if (
      lastConcludedOrder &&
      existingStop.order.localeCompare(lastConcludedOrder) <= 0
    ) {
      throw new BadRequestError(
        "Não é possível excluir paradas antes ou na última parada concluída.",
      );
    }

    if (existingStop.order === "1") {
      throw new BadRequestError(
        "Não é possível excluir a parada de origem (RN01).",
      );
    }

    await this.repository.softDeleteStop(stopId);
    await this.createNewVersion(routeId, managerId, existingRoute);

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    return result;
  }

  async softDeleteRoute(routeId: string): Promise<void> {
    const existingRoute = await this.repository.findRouteById(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    await this.repository.softDeleteRoute(routeId);
  }

  async restoreRoute(routeId: string): Promise<RouteWithStops> {
    const existingRoute = await this.repository.findRouteById(routeId, true);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }
    if (!existingRoute.deletedAt) {
      throw new BadRequestError("Rota não está excluída.");
    }

    const restored = await this.repository.restoreRoute(routeId);
    if (!restored) {
      throw new NotFoundError("Rota não encontrada.");
    }

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota restaurada.");
    }
    return result;
  }

  async getRouteHistory(routeId: string) {
    const versions = await this.repository.findRouteVersions(routeId);

    const versionsWithStops = await Promise.all(
      versions.map(async (v) => {
        const stops = await this.repository.findStopVersionsWithPoints(v.id);

        return {
          ...v,
          stops: stops.map(({ stopVersion: sv, point: p }) => ({
            ...sv,
            point: p
              ? {
                  id: p.id,
                  name: p.name,
                  address: p.address,
                  latitude: p.latitude,
                  longitude: p.longitude,
                  geocodeStatus: p.geocodeStatus,
                  createdAt: p.createdAt,
                  updatedAt: p.updatedAt,
                }
              : null,
          })),
        };
      }),
    );

    return { versions: versionsWithStops };
  }

  private async validateStatusTransition(
    current: RouteStatus,
    next: RouteStatus,
  ): Promise<void> {
    const validTransitions: Record<RouteStatus, RouteStatus[]> = {
      draft: ["in_flight", "cancelled"],
      in_flight: ["concluded", "cancelled"],
      concluded: [],
      cancelled: ["draft"],
    };

    if (!validTransitions[current].includes(next)) {
      throw new BadRequestError(
        `Transição de status inválida: ${current} -> ${next}`,
      );
    }
  }

  private async createNewVersion(
    routeId: string,
    managerId: string,
    currentRoute: Route,
  ): Promise<void> {
    const currentVersionNum = parseInt(currentRoute.currentVersion, 10);
    const newVersion = String(currentVersionNum + 1);

    const stops = await this.repository.listStopsByRoute(routeId);

    const newRouteVersion = await this.repository.createRouteVersion({
      routeId,
      version: newVersion,
      managerId,
      driverId: currentRoute.driverId,
      vehicleId: currentRoute.vehicleId,
      date: currentRoute.date,
      status: currentRoute.status,
    });

    if (!newRouteVersion) {
      throw new BadRequestError("Falha ao criar versão da rota.");
    }

    for (const stopItem of stops) {
      await this.repository.createStopVersion({
        stopId: stopItem.id,
        routeVersionId: newRouteVersion.id,
        order: stopItem.order,
        pointId: stopItem.pointId,
        addressSnapshot: stopItem.addressSnapshot,
        latitudeSnapshot: stopItem.latitudeSnapshot,
        longitudeSnapshot: stopItem.longitudeSnapshot,
        concludedAt: stopItem.concludedAt,
      });
    }

    await this.repository.updateRoute(routeId, { currentVersion: newVersion });
  }
}
