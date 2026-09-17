import { beforeEach, describe, expect, it } from "vitest";

import { NotFoundError } from "@/server/api";
import { db } from "@/server/db";
import { ParametersRepository } from "@/server/modules/parameters/parameters.repository";
import { ParametersService } from "@/server/modules/parameters/parameters.service";

describe("ParametersService", () => {
  let repository: ParametersRepository;
  let service: ParametersService;

  beforeEach(() => {
    repository = new ParametersRepository(db);
    service = new ParametersService(repository);
  });

  describe("get", () => {
    it("throws NotFoundError when parameters do not exist", async () => {
      await expect(service.get()).rejects.toThrow(NotFoundError);
    });

    it("returns parameters when they exist", async () => {
      await repository.upsert({
        id: "system",
        fuelPricePerLiter: 600,
        standardWorkdayDuration: 480,
      });

      const result = await service.get();

      expect(result.fuelPricePerLiter).toBe(6.0);
      expect(result.standardWorkdayDuration).toBe(480);
    });
  });

  describe("update", () => {
    it("creates parameters when they do not exist", async () => {
      const result = await service.update({
        fuelPricePerLiter: 5.5,
        standardWorkdayDuration: 420,
      });

      expect(result.fuelPricePerLiter).toBe(5.5);
      expect(result.standardWorkdayDuration).toBe(420);
    });

    it("updates existing parameters", async () => {
      await repository.upsert({
        id: "system",
        fuelPricePerLiter: 600,
        standardWorkdayDuration: 480,
      });

      const result = await service.update({
        fuelPricePerLiter: 7.25,
        standardWorkdayDuration: 540,
      });

      expect(result.fuelPricePerLiter).toBe(7.25);
      expect(result.standardWorkdayDuration).toBe(540);
    });

    it("converts fuel price to cents in repository", async () => {
      await service.update({
        fuelPricePerLiter: 6.5,
        standardWorkdayDuration: 480,
      });

      const stored = await repository.find();
      expect(stored?.fuelPricePerLiter).toBe(650);
    });
  });

  describe("validation", () => {
    it("rejects negative fuel price", async () => {
      await expect(
        service.update({
          fuelPricePerLiter: -1,
          standardWorkdayDuration: 480,
        }),
      ).rejects.toThrow();
    });

    it("rejects zero fuel price", async () => {
      await expect(
        service.update({
          fuelPricePerLiter: 0,
          standardWorkdayDuration: 480,
        }),
      ).rejects.toThrow();
    });

    it("rejects negative workday duration", async () => {
      await expect(
        service.update({
          fuelPricePerLiter: 6.0,
          standardWorkdayDuration: -10,
        }),
      ).rejects.toThrow();
    });

    it("rejects zero workday duration", async () => {
      await expect(
        service.update({
          fuelPricePerLiter: 6.0,
          standardWorkdayDuration: 0,
        }),
      ).rejects.toThrow();
    });

    it("rejects non-integer workday duration", async () => {
      await expect(
        service.update({
          fuelPricePerLiter: 6.0,
          standardWorkdayDuration: 480.5,
        }),
      ).rejects.toThrow();
    });
  });
});
