import { integerToCents } from "@/server/lib/money";

export function computeRouteCostCents(args: {
  distanceHundredths: number;
  fuelPricePerLiter: number;
  kmPerLiterHundredths: number;
}): number {
  return Math.round(
    (args.distanceHundredths * args.fuelPricePerLiter) /
      args.kmPerLiterHundredths,
  );
}

export function routeCostCents(args: {
  distanceHundredths: number | null;
  fuelPricePerLiter: number | null;
  kmPerLiterHundredths: number | null;
}): number | null {
  if (
    args.distanceHundredths === null ||
    args.fuelPricePerLiter === null ||
    args.kmPerLiterHundredths === null
  ) {
    return null;
  }
  return computeRouteCostCents({
    distanceHundredths: args.distanceHundredths,
    fuelPricePerLiter: args.fuelPricePerLiter,
    kmPerLiterHundredths: args.kmPerLiterHundredths,
  });
}

export function hundredthsToKm(hundredths: number | null): number | null {
  if (hundredths === null) {
    return null;
  }
  return Number((hundredths / 100).toFixed(2));
}

export function toKmHundredths(km: number): number {
  return Math.round(km * 100);
}

export function costCentsToBRL(costCents: number | null): number | null {
  return costCents === null ? null : integerToCents(costCents);
}
