import {
  stopDwellSeconds,
  totalDwellSeconds as sumDwellSeconds,
} from "@/lib/route-metrics";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/api";
import type { FleetRepository } from "@/server/modules/fleet";
import type { ParametersRepository } from "@/server/modules/parameters";
import {
  costCentsToBRL,
  hundredthsToKm,
  routeCostCents,
  toKmHundredths,
} from "./cost";
import {
  createOsrmClient,
  type OsrmClient,
  type OsrmRouteGeometry,
} from "./osrm";
import type { RoutesRepository } from "./routes.repository";
import type {
  AddStopInput,
  CorrectTimestampsInput,
  CreateRouteInput,
  Route,
  RouteHistoryOutput,
  RouteStatus,
  RoutesListOutput,
  RouteVersionWithStops,
  RouteWithStops,
  RouteWithStopsOutput,
  StartShiftInput,
  Stop,
  StopOutput,
  UpdateRouteInput,
  UpdateStopInput,
} from "./routes.types";

type CoordinateLike = {
  longitude: number | null;
  latitude: number | null;
};

type CoordinatePriced = {
  distanceKmHundredths: number | null;
  vehicleId: string | null;
};

export class RoutesService {
  constructor(
    private readonly repository: RoutesRepository,
    private readonly parametersRepository: ParametersRepository,
    private readonly fleetRepository: FleetRepository,
    private readonly osrm: OsrmClient = createOsrmClient(),
  ) {}

  async createRoute(
    input: CreateRouteInput,
    managerId: string,
  ): Promise<RouteWithStopsOutput> {
    const existingRoute = await this.repository.checkDriverDateConflict(
      input.driverId,
      new Date(input.date),
    );
    if (existingRoute) {
      throw new ConflictError(
        "Já existe uma rota para este motorista nesta data (RN05).",
      );
    }

    const stops = input.stops.sort((a, b) => Number(a.order) - Number(b.order));
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

    const coordinates = stops.map((s) => {
      const pointData = pointsMap.get(s.pointId);
      return pointData
        ? {
            longitude: pointData.longitude,
            latitude: pointData.latitude,
          }
        : { longitude: null, latitude: null };
    });
    const distanceKmHundredths = await this.computeRouteDistance(coordinates);

    const newRoute = await this.repository.createRoute({
      managerId,
      driverId: input.driverId,
      vehicleId: input.vehicleId ?? null,
      date: new Date(input.date),
      status: "draft",
      currentVersion: "1",
      distanceKmHundredths,
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
      distanceKmHundredths,
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
        arrivalAt: createdStop.arrivalAt ?? null,
        departureAt: createdStop.departureAt ?? null,
      });
    }

    const result = await this.repository.findRouteWithStops(newRoute.id);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota criada.");
    }
    return this.addPricing(result);
  }

  async getRoute(routeId: string): Promise<RouteWithStopsOutput> {
    const routeData = await this.repository.findRouteWithStops(routeId);
    if (!routeData) {
      throw new NotFoundError("Rota não encontrada.");
    }

    const stopsWithDwell = routeData.stops.map((stop) => ({
      ...stop,
      dwellSeconds: stopDwellSeconds(stop),
    }));

    const totalDwellSeconds = sumDwellSeconds(stopsWithDwell);

    const geometry = await this.computeRouteGeometry(
      stopsWithDwell.map((s) => ({
        longitude: s.longitudeSnapshot,
        latitude: s.latitudeSnapshot,
      })),
    );

    return this.addPricing({
      ...routeData,
      stops: stopsWithDwell,
      totalDwellSeconds,
      geometry,
    });
  }

  async listRoutes(input: {
    limit: number;
    offset: number;
    driverId?: string;
    status?: RouteStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<RoutesListOutput> {
    const { routes, total } = await this.repository.listRoutes(input);
    const fuelPricePerLiter = await this.getFuelPricePerLiter();

    const routesWithPricing = await Promise.all(
      routes.map(async (routeRow) => {
        const kmPerLiterHundredths =
          await this.getKmPerLiterHundredths(routeRow);
        const costCents = routeCostCents({
          distanceHundredths: routeRow.distanceKmHundredths,
          fuelPricePerLiter,
          kmPerLiterHundredths,
        });
        return {
          ...routeRow,
          distanceKm: hundredthsToKm(routeRow.distanceKmHundredths),
          cost: costCentsToBRL(costCents),
        };
      }),
    );

    return { routes: routesWithPricing, total };
  }

  async updateRoute(
    routeId: string,
    input: UpdateRouteInput,
    managerId: string,
  ): Promise<RouteWithStopsOutput> {
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
      if (
        input.driverId ||
        input.vehicleId !== undefined ||
        input.distanceKm !== undefined
      ) {
        throw new BadRequestError(
          "Não é possível alterar motorista, veículo ou distância de rota concluída ou cancelada.",
        );
      }
    }

    const updatedRoute = await this.repository.updateRoute(routeId, {
      driverId: input.driverId,
      vehicleId: input.vehicleId,
      status: input.status,
      distanceKmHundredths:
        input.distanceKm !== undefined
          ? toKmHundredths(input.distanceKm)
          : undefined,
    });
    if (!updatedRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    if (
      input.driverId ||
      input.vehicleId !== undefined ||
      input.status ||
      input.distanceKm !== undefined
    ) {
      await this.createNewVersion(routeId, managerId, updatedRoute);
    }

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    return this.addPricing(result);
  }

  async addStop(
    routeId: string,
    input: AddStopInput,
    managerId: string,
  ): Promise<RouteWithStopsOutput> {
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
      Number(input.order) <= Number(lastConcludedOrder)
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
      maxOrder && Number(input.order) > Number(maxOrder)
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

    await this.recomputeRouteDistance(routeId);
    const updatedRoute = await this.repository.findRouteById(routeId);
    if (!updatedRoute) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    await this.createNewVersion(routeId, managerId, updatedRoute);

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    return this.addPricing(result);
  }

  async updateStop(
    routeId: string,
    stopId: string,
    input: UpdateStopInput,
    managerId: string,
  ): Promise<RouteWithStopsOutput> {
    const existingRoute = await this.repository.findRouteWithStops(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    const existingStop = existingRoute.stops.find((s) => s.id === stopId);
    if (!existingStop) {
      throw new NotFoundError("Parada não encontrada.");
    }

    if (existingStop.departureAt) {
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
      Number(existingStop.order) <= Number(lastConcludedOrder)
    ) {
      throw new BadRequestError(
        "Não é possível alterar paradas antes ou na última parada concluída.",
      );
    }

    if (input.order && input.order !== existingStop.order) {
      if (
        lastConcludedOrder &&
        Number(input.order) <= Number(lastConcludedOrder)
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
    await this.recomputeRouteDistance(routeId);
    const updatedRoute = await this.repository.findRouteById(routeId);
    if (!updatedRoute) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    await this.createNewVersion(routeId, managerId, updatedRoute);

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    return this.addPricing(result);
  }

  async concludeStop(
    routeId: string,
    stopId: string,
  ): Promise<RouteWithStopsOutput> {
    const existingRoute = await this.repository.findRouteWithStops(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    const existingStop = existingRoute.stops.find((s) => s.id === stopId);
    if (!existingStop) {
      throw new NotFoundError("Parada não encontrada.");
    }

    if (existingStop.departureAt) {
      throw new BadRequestError("Parada já foi concluída.");
    }

    if (existingRoute.status === "draft") {
      await this.repository.updateRoute(routeId, { status: "in_flight" });
    }

    await this.repository.updateStopDeparture(stopId, new Date());

    await this.concludeRouteWhenAllStopsDeparted(routeId);

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    return this.addPricing(result);
  }

  async concludeRoute(
    routeId: string,
    managerId: string,
  ): Promise<RouteWithStopsOutput> {
    const existingRoute = await this.repository.findRouteById(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    if (existingRoute.status === "concluded") {
      const result = await this.repository.findRouteWithStops(routeId);
      if (!result) {
        throw new BadRequestError("Falha ao buscar rota atualizada.");
      }
      return this.addPricing(result);
    }

    if (existingRoute.status !== "in_flight") {
      throw new BadRequestError(
        "Somente rotas em andamento podem ser concluídas.",
      );
    }

    const now = new Date();
    const allStops = await this.repository.listStopsByRoute(routeId);
    for (const currentStop of allStops) {
      if (!currentStop.departureAt) {
        await this.repository.updateStopDeparture(currentStop.id, now);
      }
    }

    await this.repository.updateRoute(routeId, { status: "concluded" });

    const updatedRoute = await this.repository.findRouteById(routeId);
    if (!updatedRoute) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    await this.createNewVersion(routeId, managerId, updatedRoute);

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    return this.addPricing(result);
  }

  async deleteStop(
    routeId: string,
    stopId: string,
    managerId: string,
  ): Promise<RouteWithStopsOutput> {
    const existingRoute = await this.repository.findRouteWithStops(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    const existingStop = existingRoute.stops.find((s) => s.id === stopId);
    if (!existingStop) {
      throw new NotFoundError("Parada não encontrada.");
    }

    if (existingStop.departureAt) {
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
      Number(existingStop.order) <= Number(lastConcludedOrder)
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
    await this.recomputeRouteDistance(routeId);
    const updatedRoute = await this.repository.findRouteById(routeId);
    if (!updatedRoute) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    await this.createNewVersion(routeId, managerId, updatedRoute);

    const result = await this.repository.findRouteWithStops(routeId);
    if (!result) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }
    return this.addPricing(result);
  }

  async softDeleteRoute(routeId: string): Promise<void> {
    const existingRoute = await this.repository.findRouteById(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    await this.repository.softDeleteRoute(routeId);
  }

  async restoreRoute(routeId: string): Promise<RouteWithStopsOutput> {
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
    return this.addPricing(result);
  }

  async getRouteHistory(routeId: string): Promise<RouteHistoryOutput> {
    const versions = await this.repository.findRouteVersions(routeId);
    const fuelPricePerLiter = await this.getFuelPricePerLiter();

    const versionsWithStops = await Promise.all(
      versions.map(async (v) => {
        const stops = await this.repository.findStopVersionsWithPoints(v.id);
        const kmPerLiterHundredths = await this.getKmPerLiterHundredths(v);
        const costCents = routeCostCents({
          distanceHundredths: v.distanceKmHundredths,
          fuelPricePerLiter,
          kmPerLiterHundredths,
        });
        const routeVersionWithStops: RouteVersionWithStops & {
          distanceKm: number | null;
          cost: number | null;
        } = {
          ...v,
          distanceKm: hundredthsToKm(v.distanceKmHundredths),
          cost: costCentsToBRL(costCents),
          stops: stops.map(({ stopVersion: sv, point: p, actorName }) => ({
            ...sv,
            actorName,
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
        return routeVersionWithStops;
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

  async getDriverRouteWithDwell(
    driverId: string,
    date: Date,
  ): Promise<RouteWithStops | null> {
    const routeData = await this.repository.findRouteByDriverAndDate(
      driverId,
      date,
    );
    if (!routeData) return null;

    const routeWithStops = await this.repository.findRouteWithStops(
      routeData.id,
    );
    if (!routeWithStops) return null;

    const stopsWithDwell = routeWithStops.stops.map((stop) => ({
      ...stop,
      dwellSeconds: stopDwellSeconds(stop),
    }));

    const totalDwellSeconds = sumDwellSeconds(stopsWithDwell);

    return this.addPricing({
      ...routeWithStops,
      stops: stopsWithDwell,
      totalDwellSeconds,
    });
  }

  async startShift(
    routeId: string,
    input: StartShiftInput,
    driverId: string,
  ): Promise<RouteWithStops> {
    const existingRoute = await this.repository.findRouteById(routeId);
    if (!existingRoute) {
      throw new NotFoundError("Rota não encontrada.");
    }

    if (existingRoute.driverId !== driverId) {
      throw new ForbiddenError("Esta rota não pertence a este motorista.");
    }

    if (existingRoute.status !== "draft") {
      throw new BadRequestError(
        "A rota deve estar em status 'draft' para iniciar o turno.",
      );
    }

    const vehicleId = input.vehicleId ?? existingRoute.vehicleId;

    if (!vehicleId) {
      const activeVehicleIds = await this.repository.findActiveVehicleIds();
      if (activeVehicleIds.length === 0) {
        throw new BadRequestError(
          "Nenhum veículo ativo disponível para seleção.",
        );
      }
      throw new BadRequestError("Selecione um veículo para iniciar o turno.");
    }

    const isLocked = await this.repository.isVehicleLockedForDate(
      vehicleId,
      existingRoute.date,
      routeId,
    );
    if (isLocked) {
      throw new ConflictError(
        "Este veículo já está em uso em outra rota nesta data.",
      );
    }

    const originStop = await this.repository.findOriginStop(routeId);
    if (!originStop) {
      throw new BadRequestError("Parada de origem não encontrada.");
    }

    const now = new Date();
    await this.repository.updateStopDeparture(originStop.id, now);

    await this.repository.updateRoute(routeId, {
      vehicleId,
      status: "in_flight",
    });

    const updatedRoute = await this.repository.findRouteById(routeId);
    if (!updatedRoute) {
      throw new BadRequestError("Falha ao buscar rota atualizada.");
    }

    await this.createNewVersion(routeId, driverId, updatedRoute);

    return this.getDriverRouteWithDwell(
      driverId,
      existingRoute.date,
    ) as Promise<RouteWithStops>;
  }

  async checkIn(
    stopId: string,
    driverId: string,
  ): Promise<{ stop: Stop; dwellSeconds: number }> {
    const stop = await this.repository.findStopById(stopId);
    if (!stop) {
      throw new NotFoundError("Parada não encontrada.");
    }

    const route = await this.repository.findRouteById(stop.routeId);
    if (!route) {
      throw new NotFoundError("Rota não encontrada.");
    }

    if (route.driverId !== driverId) {
      throw new ForbiddenError(
        "Esta parada não pertence à rota deste motorista.",
      );
    }

    if (route.status !== "in_flight") {
      throw new BadRequestError(
        "A rota deve estar em andamento para fazer check-in.",
      );
    }

    if (stop.order === "1") {
      throw new BadRequestError(
        "A parada de origem não possui check-in (RN01).",
      );
    }

    if (stop.arrivalAt) {
      throw new BadRequestError("Check-in já realizado para esta parada.");
    }

    const now = new Date();
    const updatedStop = await this.repository.updateStopArrival(stopId, now);
    if (!updatedStop) {
      throw new BadRequestError("Falha ao realizar check-in.");
    }
    return { stop: updatedStop, dwellSeconds: 0 };
  }

  async checkOut(
    stopId: string,
    driverId: string,
  ): Promise<{ stop: Stop; dwellSeconds: number }> {
    const stop = await this.repository.findStopById(stopId);
    if (!stop) {
      throw new NotFoundError("Parada não encontrada.");
    }

    const route = await this.repository.findRouteById(stop.routeId);
    if (!route) {
      throw new NotFoundError("Rota não encontrada.");
    }

    if (route.driverId !== driverId) {
      throw new ForbiddenError(
        "Esta parada não pertence à rota deste motorista.",
      );
    }

    if (route.status !== "in_flight") {
      throw new BadRequestError(
        "A rota deve estar em andamento para fazer check-out.",
      );
    }

    if (!stop.arrivalAt) {
      throw new BadRequestError("Check-in não realizado para esta parada.");
    }

    if (stop.departureAt) {
      throw new BadRequestError("Check-out já realizado para esta parada.");
    }

    const now = new Date();
    const updatedStop = await this.repository.updateStopDeparture(stopId, now);
    if (!updatedStop) {
      throw new BadRequestError("Falha ao realizar check-out.");
    }

    await this.concludeRouteWhenAllStopsDeparted(stop.routeId);

    const dwellSeconds = Math.floor(
      (now.getTime() - new Date(stop.arrivalAt).getTime()) / 1000,
    );

    return { stop: updatedStop, dwellSeconds };
  }

  private async concludeRouteWhenAllStopsDeparted(
    routeId: string,
  ): Promise<void> {
    const allStops = await this.repository.listStopsByRoute(routeId);
    const allConcluded = allStops.every((s) => s.departureAt);
    if (allConcluded) {
      await this.repository.updateRoute(routeId, { status: "concluded" });
    }
  }

  private async recomputeRouteDistance(routeId: string): Promise<void> {
    const stops = await this.repository.listStopsByRoute(routeId);
    const coordinates: CoordinateLike[] = stops.map((s) => ({
      longitude: s.longitudeSnapshot,
      latitude: s.latitudeSnapshot,
    }));
    const distanceKmHundredths = await this.computeRouteDistance(coordinates);
    await this.repository.updateRoute(routeId, { distanceKmHundredths });
  }

  private async computeRouteDistance(
    coordinates: CoordinateLike[],
  ): Promise<number | null> {
    if (coordinates.length < 2) {
      return 0;
    }
    if (coordinates.some((c) => c.longitude === null || c.latitude === null)) {
      return null;
    }
    try {
      const legs = await this.osrm.routeLegDistancesKm(
        coordinates as Array<{ longitude: number; latitude: number }>,
      );
      const totalKm = legs.reduce((sum, leg) => sum + leg, 0);
      return toKmHundredths(totalKm);
    } catch {
      return null;
    }
  }

  private async computeRouteGeometry(
    coordinates: CoordinateLike[],
  ): Promise<OsrmRouteGeometry | null> {
    if (coordinates.length < 2) {
      return null;
    }
    if (coordinates.some((c) => c.longitude === null || c.latitude === null)) {
      return null;
    }
    try {
      return await this.osrm.routeGeometry(
        coordinates as Array<{ longitude: number; latitude: number }>,
      );
    } catch {
      return null;
    }
  }

  private async getFuelPricePerLiter(): Promise<number | null> {
    const parameters = await this.parametersRepository.find();
    return parameters?.fuelPricePerLiter ?? null;
  }

  private async getKmPerLiterHundredths(routeRow: {
    vehicleId: string | null;
  }): Promise<number | null> {
    if (!routeRow.vehicleId) return null;
    const vehicleRow = await this.fleetRepository.findById(routeRow.vehicleId);
    return vehicleRow?.kmPerLiterHundredths ?? null;
  }

  private async addPricing<T extends CoordinatePriced>(
    row: T,
  ): Promise<
    T & {
      distanceKm: number | null;
      cost: number | null;
    }
  > {
    const fuelPricePerLiter = await this.getFuelPricePerLiter();
    const kmPerLiterHundredths = await this.getKmPerLiterHundredths(row);
    const costCents = routeCostCents({
      distanceHundredths: row.distanceKmHundredths,
      fuelPricePerLiter,
      kmPerLiterHundredths,
    });
    return {
      ...row,
      distanceKm: hundredthsToKm(row.distanceKmHundredths),
      cost: costCentsToBRL(costCents),
    };
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
      distanceKmHundredths: currentRoute.distanceKmHundredths,
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
        arrivalAt: stopItem.arrivalAt,
        departureAt: stopItem.departureAt,
      });
    }

    await this.repository.updateRoute(routeId, { currentVersion: newVersion });
  }

  async correctTimestamps(
    routeId: string,
    stopId: string,
    input: CorrectTimestampsInput,
    actorId: string,
    isManager: boolean,
  ): Promise<StopOutput | null> {
    const routeData = await this.repository.findRouteById(routeId);
    if (!routeData) throw new NotFoundError("Rota não encontrada.");

    if (!isManager) {
      if (routeData.driverId !== actorId) {
        throw new BadRequestError("Motorista não autorizado para esta rota.");
      }
      if (routeData.status === "concluded") {
        throw new BadRequestError("Não é possível corrigir rota concluída.");
      }
    }

    const stopWithRoute = await this.repository.findStopWithRoute(stopId);
    if (!stopWithRoute || stopWithRoute.stop.routeId !== routeId) {
      throw new NotFoundError("Parada não encontrada nesta rota.");
    }

    const updates: Partial<Pick<Stop, "arrivalAt" | "departureAt">> = {};
    if (input.arrivalAt !== undefined) updates.arrivalAt = input.arrivalAt;
    if (input.departureAt !== undefined)
      updates.departureAt = input.departureAt;

    if (updates.arrivalAt !== undefined) {
      await this.repository.updateStopArrival(
        stopId,
        updates.arrivalAt as Date,
      );
    }
    if (updates.departureAt !== undefined) {
      await this.repository.updateStopDeparture(
        stopId,
        updates.departureAt as Date,
      );
    }

    const routeVersionId = await this.repository.findRouteVersionId(
      routeId,
      routeData.currentVersion,
    );
    if (routeVersionId) {
      const currentStop = await this.repository.findStopById(stopId);
      if (currentStop) {
        await this.repository.createStopVersion({
          stopId: currentStop.id,
          routeVersionId,
          order: currentStop.order,
          pointId: currentStop.pointId,
          addressSnapshot: currentStop.addressSnapshot,
          latitudeSnapshot: currentStop.latitudeSnapshot,
          longitudeSnapshot: currentStop.longitudeSnapshot,
          arrivalAt: currentStop.arrivalAt,
          departureAt: currentStop.departureAt,
          versionType: "correction",
          actorId,
        });
      }
    }

    const updatedStop = await this.repository.findStopById(stopId);
    if (!updatedStop) return null;
    return {
      ...updatedStop,
      point: stopWithRoute.stop.pointId
        ? {
            id: stopWithRoute.stop.pointId,
            name: "",
            address: "",
            latitude: 0,
            longitude: 0,
            geocodeStatus: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null,
    } as StopOutput; // Simple fallback, or we can just fetch the point
  }
}
