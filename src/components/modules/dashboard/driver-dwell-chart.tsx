"use client";

import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  buildDriverBars,
  type DriverBar,
  type DriverBarStop,
} from "./driver-bars";

const MIN_SEGMENT = 8;
const MAX_TICK_CHARS = 14;

interface DriverDwellChartProps {
  drivers: Array<{ driverId: string; driverName: string }>;
  stops: Array<DriverBarStop & { driverId: string }>;
  onDriverClick?: (driver: { driverId: string; driverName: string }) => void;
}

function hasDwell(stop: DriverBarStop) {
  return stop.arrivalTime !== null && stop.departureTime !== null;
}

function formatMinutes(value: number) {
  if (value <= 60) return `${value}min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0
    ? `${hours}h`
    : `${hours}h${String(minutes).padStart(2, "0")}`;
}

function formatTime(value: string | null) {
  return value ? format(new Date(value), "HH:mm") : "—";
}

function truncateName(name: string) {
  return name.length > MAX_TICK_CHARS
    ? `${name.slice(0, MAX_TICK_CHARS - 1)}…`
    : name;
}

export function DriverDwellChart({
  drivers,
  stops,
  onDriverClick,
}: DriverDwellChartProps) {
  const bars = buildDriverBars(drivers, stops);

  if (bars.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Nenhum motorista com roteiro neste dia.</p>
      </div>
    );
  }

  const slotCount = Math.max(...bars.map((bar) => bar.stops.length));
  const rows = bars.map((bar) => {
    const row: DriverBar & Record<string, unknown> = {
      ...bar,
      stops: bar.stops,
    };
    for (let slot = 0; slot < slotCount; slot++) {
      row[`slot${slot}`] = bar.stops[slot]?.dwellMinutes ?? 0;
    }
    return row;
  });

  const maxMinutes = Math.max(30, ...bars.map((bar) => bar.totalMinutes));
  const step = maxMinutes <= 120 ? 30 : maxMinutes <= 240 ? 60 : 120;
  const axisMax = Math.ceil(maxMinutes / step) * step;
  const ticks = Array.from(
    { length: axisMax / step + 1 },
    (_, index) => index * step,
  );

  const DriverTooltip = ({
    active,
    payload,
  }: TooltipContentProps<number | string>) => {
    if (!active || !payload?.length) return null;

    const bar = payload[0].payload as DriverBar;

    return (
      <div className="bg-popover/80 backdrop-blur-md border border-border/50 dark:border-white/10 rounded-lg p-3 shadow-xl min-w-[220px] max-w-[320px]">
        <p className="font-medium">{bar.driverName}</p>
        <p className="text-xs text-muted-foreground">
          Tempo parado: {bar.totalMinutes} min
        </p>
        {bar.stops.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Nenhuma parada registrada.
          </p>
        ) : (
          <div className="mt-2 space-y-1.5 text-xs">
            {bar.stops.map((stop) => (
              <div key={stop.stopId}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {stop.order}. {stop.pointName}
                  </span>
                  <span className="tabular-nums whitespace-nowrap">
                    {hasDwell(stop)
                      ? `${stop.dwellMinutes} min (${stop.workdayPercentage.toFixed(1)}%)`
                      : "sem tempo parado"}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {formatTime(stop.arrivalTime)} –{" "}
                  {formatTime(stop.departureTime)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // biome-ignore lint/suspicious/noExplicitAny: Recharts tooltip content props have complex generic types that are difficult to type precisely
  const DriverTooltipWrapper = (props: any) => <DriverTooltip {...props} />;

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={rows}
          margin={{ top: 24, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid
            horizontal
            vertical={false}
            strokeDasharray="4 4"
            stroke="var(--border)"
          />
          <XAxis
            type="category"
            dataKey="driverName"
            interval={0}
            tickFormatter={truncateName}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            type="number"
            domain={[0, axisMax]}
            ticks={ticks}
            width={56}
            tickFormatter={formatMinutes}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={DriverTooltipWrapper}
            cursor={{ fill: "var(--muted)" }}
          />
          {Array.from({ length: slotCount }, (_, slot) => (
            <Bar
              // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
              key={slot}
              dataKey={`slot${slot}`}
              stackId="dwell"
              minPointSize={MIN_SEGMENT}
              maxBarSize={96}
              radius={slot === slotCount - 1 ? [4, 4, 0, 0] : undefined}
            >
              {rows.map((row) => {
                const stop = row.stops[slot];
                const known = stop ? hasDwell(stop) : false;
                return (
                  <Cell
                    key={row.driverId}
                    fill={
                      stop === undefined
                        ? "transparent"
                        : known
                          ? `var(--chart-${(slot % 5) + 1})`
                          : "var(--muted)"
                    }
                    stroke={stop && !known ? "var(--border)" : undefined}
                    pointerEvents={stop ? undefined : "none"}
                    className={stop ? "cursor-pointer" : undefined}
                    onClick={
                      stop && onDriverClick
                        ? () => onDriverClick(row)
                        : undefined
                    }
                  />
                );
              })}
              {slot === slotCount - 1 && slotCount > 0 && (
                <LabelList
                  dataKey="totalMinutes"
                  position="top"
                  formatter={(value) => `${value} min`}
                  fontSize={10}
                  fill="var(--muted-foreground)"
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-2 text-xs">
        {bars.map((bar) => (
          <button
            key={bar.driverId}
            type="button"
            className={cn(
              "inline-flex items-center gap-2 px-2 py-1 rounded bg-background border",
              onDriverClick && "cursor-pointer hover:bg-muted",
            )}
            onClick={() => onDriverClick?.(bar)}
          >
            <span
              className="w-2 h-2 rounded"
              style={{
                backgroundColor:
                  bar.stops.length > 0
                    ? "var(--chart-1)"
                    : "var(--muted-foreground)",
              }}
            />
            <span className="font-medium">{bar.driverName}</span>
            <span className="tabular-nums text-muted-foreground">
              {bar.totalMinutes} min
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
