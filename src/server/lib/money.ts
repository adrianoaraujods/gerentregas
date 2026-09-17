export function centsToInteger(cents: number): number {
  return Math.round(cents * 100);
}

export function integerToCents(integer: number): number {
  return Number((integer / 100).toFixed(2));
}
