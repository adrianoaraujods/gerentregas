import { normalizePlate } from "@/lib/validators";

export function formatNumber(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export function formatCPF(value: string) {
  value = value.replace(/\D/g, "");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return value;
}

export function formatCNPJ(value: string) {
  value = value.replace(/\D/g, "");
  value = value.replace(/^(\d{2})(\d)/, "$1.$2");
  value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
  value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
  value = value.replace(/(\d{4})(\d)/, "$1-$2");
  return value;
}

export function formatDocument(value: string | null): string {
  if (!value) return "-";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return formatCPF(value);
  return formatCNPJ(value);
}

export function formatPhone(value: string) {
  value = value.replace(/\D/g, "");

  if (value.length <= 10) {
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
  }

  return value;
}

export function formatPlate(value: string) {
  const normalized = normalizePlate(value);
  if (!/^[A-Z]{3}(\d{4}|\d[A-Z]\d{2})$/.test(normalized)) return normalized;
  return normalized.replace(/^([A-Z]{3})([A-Z0-9]{4})$/, "$1-$2");
}

export function formatBRL(value: number) {
  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return formatter.format(value);
}

export function parseBRL(value: string): number {
  const cleaned = value
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : Number.NaN;
}

export function formatDate(date: Date | undefined, locale = "pt-BR") {
  if (!date) return "";

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatAvatarFallback(name: string) {
  const parts = name.split(" ");
  if (parts.length < 2) return parts[0].charAt(0);
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
}
