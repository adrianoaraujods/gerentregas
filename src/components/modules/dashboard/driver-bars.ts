export interface DriverBarStop {
  stopId: string;
  order: string;
  pointName: string;
  arrivalTime: string | null;
  departureTime: string | null;
  dwellMinutes: number;
  workdayPercentage: number;
}

export interface DriverBar {
  driverId: string;
  driverName: string;
  totalMinutes: number;
  stops: DriverBarStop[];
}

export function buildDriverBars(
  drivers: Array<{ driverId: string; driverName: string }>,
  stops: Array<DriverBarStop & { driverId: string }>,
): DriverBar[] {
  const stopsByDriver = new Map<string, DriverBarStop[]>();
  for (const stop of stops) {
    if (stop.order === "1") continue; // RN01: Origin never accumulates dwell
    const list = stopsByDriver.get(stop.driverId);
    if (list) list.push(stop);
    else stopsByDriver.set(stop.driverId, [stop]);
  }

  return drivers
    .map(({ driverId, driverName }) => {
      const driverStops = (stopsByDriver.get(driverId) ?? []).sort((a, b) =>
        a.order.localeCompare(b.order, undefined, { numeric: true }),
      );
      return {
        driverId,
        driverName,
        stops: driverStops,
        totalMinutes: driverStops.reduce((sum, s) => sum + s.dwellMinutes, 0),
      };
    })
    .sort(
      (a, b) =>
        b.totalMinutes - a.totalMinutes ||
        a.driverName.localeCompare(b.driverName, "pt-BR"),
    );
}
