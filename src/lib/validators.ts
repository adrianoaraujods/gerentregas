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
