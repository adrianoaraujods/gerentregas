export type DwellStop = {
  order: string;
  arrivalAt: Date | string | null | undefined;
  departureAt: Date | string | null | undefined;
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function stopDwellSeconds(stop: DwellStop): number | undefined {
  if (stop.order === "1") return undefined;
  const { arrivalAt, departureAt } = stop;
  if (!arrivalAt || !departureAt) return undefined;
  return Math.floor(
    (toDate(departureAt).getTime() - toDate(arrivalAt).getTime()) / 1000,
  );
}

export function totalDwellSeconds(stops: DwellStop[]): number {
  let total = 0;
  for (const stop of stops) {
    total += stopDwellSeconds(stop) ?? 0;
  }
  return total;
}

export function workdayPercentage(
  dwell: number,
  standardWorkday: number,
): number {
  if (standardWorkday <= 0) return 0;
  return (dwell / standardWorkday) * 100;
}

export function formatDwellSeconds(
  seconds: number | null | undefined,
): string | null {
  if (seconds === null || seconds === undefined || seconds < 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0)
    return secs > 0 ? `${minutes} min ${secs} s` : `${minutes} min`;
  return `${secs} s`;
}
