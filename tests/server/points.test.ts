import { beforeEach, describe, expect, it, vi } from "vitest";

import { BadRequestError, NotFoundError } from "@/server/api";
import { db } from "@/server/db";
import type { GeocodeResult, Geocoder } from "@/server/modules/points/geocoder";
import { PointsRepository } from "@/server/modules/points/points.repository";
import { PointsService } from "@/server/modules/points/points.service";

describe("PointsService", () => {
  let repository: PointsRepository;
  let mockGeocoder: Geocoder;
  let service: PointsService;

  beforeEach(() => {
    repository = new PointsRepository(db);
    mockGeocoder = {
      geocode: vi.fn(),
    };
    service = new PointsService(repository, mockGeocoder);
  });

  describe("createPoint", () => {
    it("creates a point with successful geocoding", async () => {
      mockGeocoder.geocode.mockResolvedValueOnce({
        latitude: -23.5505,
        longitude: -46.6333,
        displayName: "São Paulo, SP, Brasil",
      } as GeocodeResult);

      const result = await service.createPoint({
        name: "Escritório Central",
        address: "Av. Paulista, 1000, São Paulo, SP",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Escritório Central");
      expect(result.address).toBe("Av. Paulista, 1000, São Paulo, SP");
      expect(result.latitude).toBe(-23.5505);
      expect(result.longitude).toBe(-46.6333);
      expect(result.geocodeStatus).toBe("success");
    });

    it("creates a point with manual coordinates when provided", async () => {
      const result = await service.createPoint({
        name: "Ponto Manual",
        address: "Endereço sem geocoding",
        latitude: -22.9068,
        longitude: -43.1729,
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Ponto Manual");
      expect(result.latitude).toBe(-22.9068);
      expect(result.longitude).toBe(-43.1729);
      expect(result.geocodeStatus).toBe("manual");
      expect(mockGeocoder.geocode).not.toHaveBeenCalled();
    });

    it("creates a point with failed geocoding status when geocoder returns null", async () => {
      mockGeocoder.geocode.mockResolvedValueOnce(null);

      const result = await service.createPoint({
        name: "Ponto Falhou",
        address: "Endereço inexistente xyz123",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Ponto Falhou");
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.geocodeStatus).toBe("failed");
    });

    it("creates a point with failed geocoding status when geocoder throws", async () => {
      mockGeocoder.geocode.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.createPoint({
        name: "Ponto Erro",
        address: "Endereço com erro",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Ponto Erro");
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.geocodeStatus).toBe("failed");
    });

    it("rejects invalid input (empty name)", async () => {
      await expect(
        service.createPoint({
          name: "",
          address: "Av. Paulista, 1000",
        }),
      ).rejects.toThrow();
    });

    it("rejects invalid input (empty address)", async () => {
      await expect(
        service.createPoint({
          name: "Teste",
          address: "",
        }),
      ).rejects.toThrow();
    });

    it("rejects invalid latitude", async () => {
      await expect(
        service.createPoint({
          name: "Teste",
          address: "Av. Paulista, 1000",
          latitude: 100,
          longitude: -46.6333,
        }),
      ).rejects.toThrow();
    });

    it("rejects invalid longitude", async () => {
      await expect(
        service.createPoint({
          name: "Teste",
          address: "Av. Paulista, 1000",
          latitude: -23.5505,
          longitude: 200,
        }),
      ).rejects.toThrow();
    });
  });

  describe("getPoint", () => {
    it("returns point by ID", async () => {
      mockGeocoder.geocode.mockResolvedValueOnce({
        latitude: -23.5505,
        longitude: -46.6333,
        displayName: "São Paulo, SP, Brasil",
      } as GeocodeResult);

      const created = await service.createPoint({
        name: "Escritório Central",
        address: "Av. Paulista, 1000, São Paulo, SP",
      });

      const result = await service.getPoint(created.id);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe("Escritório Central");
    });

    it("throws NotFoundError for non-existent point", async () => {
      await expect(service.getPoint("non-existent-id")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("listPoints", () => {
    it("lists points with pagination", async () => {
      mockGeocoder.geocode.mockResolvedValue({
        latitude: -23.5505,
        longitude: -46.6333,
        displayName: "São Paulo, SP, Brasil",
      } as GeocodeResult);

      await service.createPoint({ name: "Ponto 1", address: "Endereço 1" });
      await service.createPoint({ name: "Ponto 2", address: "Endereço 2" });
      await service.createPoint({ name: "Ponto 3", address: "Endereço 3" });

      const result = await service.listPoints({
        limit: 2,
        offset: 0,
        includeDeleted: false,
      });

      expect(result.points.length).toBe(2);
      expect(result.total).toBe(3);
    });

    it("excludes soft-deleted points by default", async () => {
      mockGeocoder.geocode.mockResolvedValue({
        latitude: -23.5505,
        longitude: -46.6333,
        displayName: "São Paulo, SP, Brasil",
      } as GeocodeResult);

      const created = await service.createPoint({
        name: "Ponto 1",
        address: "Endereço 1",
      });
      await service.deletePoint(created.id);

      const result = await service.listPoints({
        limit: 10,
        offset: 0,
        includeDeleted: false,
      });

      expect(result.points.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it("includes soft-deleted points when requested", async () => {
      mockGeocoder.geocode.mockResolvedValue({
        latitude: -23.5505,
        longitude: -46.6333,
        displayName: "São Paulo, SP, Brasil",
      } as GeocodeResult);

      const created = await service.createPoint({
        name: "Ponto 1",
        address: "Endereço 1",
      });
      await service.deletePoint(created.id);

      const result = await service.listPoints({
        limit: 10,
        offset: 0,
        includeDeleted: true,
      });

      expect(result.points.length).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe("updatePoint", () => {
    it("updates point name", async () => {
      mockGeocoder.geocode.mockResolvedValueOnce({
        latitude: -23.5505,
        longitude: -46.6333,
        displayName: "São Paulo, SP, Brasil",
      } as GeocodeResult);

      const created = await service.createPoint({
        name: "Nome Original",
        address: "Av. Paulista, 1000",
      });

      const result = await service.updatePoint(created.id, {
        name: "Nome Atualizado",
      });

      expect(result.name).toBe("Nome Atualizado");
      expect(result.address).toBe("Av. Paulista, 1000");
    });

    it("re-geocodes when address changes and no manual coordinates provided", async () => {
      mockGeocoder.geocode
        .mockResolvedValueOnce({
          latitude: -23.5505,
          longitude: -46.6333,
          displayName: "São Paulo, SP, Brasil",
        } as GeocodeResult)
        .mockResolvedValueOnce({
          latitude: -22.9068,
          longitude: -43.1729,
          displayName: "Rio de Janeiro, RJ, Brasil",
        } as GeocodeResult);

      const created = await service.createPoint({
        name: "Ponto",
        address: "Av. Paulista, 1000, São Paulo, SP",
      });

      const result = await service.updatePoint(created.id, {
        address: "Av. Atlântica, 2000, Rio de Janeiro, RJ",
      });

      expect(result.address).toBe("Av. Atlântica, 2000, Rio de Janeiro, RJ");
      expect(result.latitude).toBe(-22.9068);
      expect(result.longitude).toBe(-43.1729);
      expect(result.geocodeStatus).toBe("success");
    });

    it("uses manual coordinates when provided during address update", async () => {
      mockGeocoder.geocode.mockResolvedValueOnce({
        latitude: -23.5505,
        longitude: -46.6333,
        displayName: "São Paulo, SP, Brasil",
      } as GeocodeResult);

      const created = await service.createPoint({
        name: "Ponto",
        address: "Av. Paulista, 1000, São Paulo, SP",
      });

      const result = await service.updatePoint(created.id, {
        address: "Novo endereço",
        latitude: -15.7942,
        longitude: -47.8825,
      });

      expect(result.latitude).toBe(-15.7942);
      expect(result.longitude).toBe(-47.8825);
      expect(result.geocodeStatus).toBe("manual");
    });

    it("sets geocodeStatus to failed when geocoding fails on address update", async () => {
      mockGeocoder.geocode
        .mockResolvedValueOnce({
          latitude: -23.5505,
          longitude: -46.6333,
          displayName: "São Paulo, SP, Brasil",
        } as GeocodeResult)
        .mockResolvedValueOnce(null);

      const created = await service.createPoint({
        name: "Ponto",
        address: "Av. Paulista, 1000, São Paulo, SP",
      });

      const result = await service.updatePoint(created.id, {
        address: "Endereço inexistente xyz123",
      });

      expect(result.address).toBe("Endereço inexistente xyz123");
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.geocodeStatus).toBe("failed");
    });

    it("sets geocodeStatus to manual when manual coordinates provided without address change", async () => {
      mockGeocoder.geocode.mockResolvedValueOnce({
        latitude: -23.5505,
        longitude: -46.6333,
        displayName: "São Paulo, SP, Brasil",
      } as GeocodeResult);

      const created = await service.createPoint({
        name: "Ponto",
        address: "Av. Paulista, 1000, São Paulo, SP",
      });

      const result = await service.updatePoint(created.id, {
        latitude: -15.7942,
        longitude: -47.8825,
      });

      expect(result.latitude).toBe(-15.7942);
      expect(result.longitude).toBe(-47.8825);
      expect(result.geocodeStatus).toBe("manual");
    });

    it("throws NotFoundError for non-existent point", async () => {
      await expect(
        service.updatePoint("non-existent-id", { name: "Novo Nome" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deletePoint (soft delete)", () => {
    it("soft deletes a point", async () => {
      mockGeocoder.geocode.mockResolvedValueOnce({
        latitude: -23.5505,
        longitude: -46.6333,
        displayName: "São Paulo, SP, Brasil",
      } as GeocodeResult);

      const created = await service.createPoint({
        name: "Ponto para deletar",
        address: "Av. Paulista, 1000",
      });

      await service.deletePoint(created.id);

      const list = await service.listPoints({
        limit: 10,
        offset: 0,
        includeDeleted: false,
      });
      expect(list.points.length).toBe(0);
    });

    it("throws NotFoundError for non-existent point", async () => {
      await expect(service.deletePoint("non-existent-id")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("restorePoint", () => {
    it("restores a soft-deleted point", async () => {
      mockGeocoder.geocode.mockResolvedValueOnce({
        latitude: -23.5505,
        longitude: -46.6333,
        displayName: "São Paulo, SP, Brasil",
      } as GeocodeResult);

      const created = await service.createPoint({
        name: "Ponto para restaurar",
        address: "Av. Paulista, 1000",
      });

      await service.deletePoint(created.id);

      const restored = await service.restorePoint(created.id);
      expect(restored.id).toBe(created.id);
      expect(restored.name).toBe("Ponto para restaurar");

      const list = await service.listPoints({
        limit: 10,
        offset: 0,
        includeDeleted: false,
      });
      expect(list.points.length).toBe(1);
    });

    it("throws NotFoundError for non-existent point", async () => {
      await expect(service.restorePoint("non-existent-id")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws BadRequestError when restoring non-deleted point", async () => {
      mockGeocoder.geocode.mockResolvedValueOnce({
        latitude: -23.5505,
        longitude: -46.6333,
        displayName: "São Paulo, SP, Brasil",
      } as GeocodeResult);

      const created = await service.createPoint({
        name: "Ponto não deletado",
        address: "Av. Paulista, 1000",
      });

      await expect(service.restorePoint(created.id)).rejects.toThrow(
        BadRequestError,
      );
    });
  });
});
