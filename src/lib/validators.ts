import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(
    /^\d{10,11}$/,
    "Telefone deve conter apenas números com DDD (ex: 11999999999)",
  );

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (value.trim().startsWith("+") && digits.startsWith("55")) {
    return digits.slice(2);
  }

  return digits;
}

export function normalizePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const normalizedPlateSchema = z
  .string()
  .regex(
    /^[A-Z]{3}(\d{4}|\d[A-Z]\d{2})$/,
    "Placa inválida. Use o formato ABC-1234 ou ABC-1D23",
  );

export const plateSchema = z
  .string()
  .transform(normalizePlate)
  .pipe(normalizedPlateSchema);
