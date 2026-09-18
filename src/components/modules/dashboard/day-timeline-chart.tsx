"use client";

import { format } from "date-fns";
import * as React from "react";
import {
  Bar,
  type BarProps,
  type BarShapeProps,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

interface DayTimelineStop {
  stopId: string;
  order: string;
  pointId: string;
  pointName: string;
  address: string;
  arrivalTime: string | null;
  departureTime: string | null;
  dwellMinutes: number;
  startHour: number;
  dwellHours: number;
  workdayPercentage: number;
}

interface DayTimelineChartProps {
  stops: DayTimelineStop[];
  onStopClick?: (stop: DayTimelineStop) => void;
}

const HOURS_IN_DAY = 24;
const BAR_HEIGHT = 32;
const BAR_GAP = 4;

const BarWrapper = (props: BarProps) => <Bar {...props} />;

export function DayTimelineChart({
  stops,
  onStopClick,
}: DayTimelineChartProps) {
  if (!stops || stops.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Nenhuma parada com tempo parado neste dia.</p>
      </div>
    );
  }

  const chartData = stops
    .filter((s) => s.dwellMinutes > 0)
    .map((stop, index) => ({
      ...stop,
      index,
      x: stop.startHour,
      width: Math.max(stop.dwellHours, 0.25),
      name: stop.pointName,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));

  const totalDwellMinutes = stops.reduce((sum, s) => sum + s.dwellMinutes, 0);
  const totalDwellHours = totalDwellMinutes / 60;

  const CustomTooltip = ({
    active,
    payload,
  }: TooltipContentProps<number | string>) => {
    if (!active || !payload?.length) return null;

    const item = payload[0].payload as DayTimelineStop;
    const arrival = item.arrivalTime
      ? format(new Date(item.arrivalTime), "HH:mm")
      : "—";
    const departure = item.departureTime
      ? format(new Date(item.departureTime), "HH:mm")
      : "—";

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
        <p className="font-medium">{item.pointName}</p>
        <p className="text-sm text-muted-foreground">{item.address}</p>
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
          <span className="text-muted-foreground">Chegada:</span>
          <span>{arrival}</span>
          <span className="text-muted-foreground">Saída:</span>
          <span>{departure}</span>
          <span className="text-muted-foreground">Tempo parado:</span>
          <span className="font-medium">{item.dwellMinutes} min</span>
          <span className="text-muted-foreground">% Jornada:</span>
          <span className="font-medium">
            {item.workdayPercentage.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  // biome-ignore lint/suspicious/noExplicitAny: Recharts tooltip content props have complex generic types that are difficult to type precisely
  const CustomTooltipWrapper = (props: any) => <CustomTooltip {...props} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">00:00</span>
        <span className="text-muted-foreground">
          Total: {totalDwellHours.toFixed(1)}h ({totalDwellMinutes} min)
        </span>
        <span className="text-muted-foreground">23:59</span>
      </div>

      <ResponsiveContainer
        width="100%"
        height={Math.max(chartData.length * (BAR_HEIGHT + BAR_GAP) + 60, 200)}
      >
        <ComposedChart
          data={chartData}
          layout="horizontal"
          margin={{ top: 20, right: 20, bottom: 40, left: 120 }}
        >
          <CartesianGrid
            horizontal={false}
            vertical
            strokeDasharray="4 4"
            stroke="hsl(var(--border))"
          />
          <XAxis
            type="number"
            domain={[0, HOURS_IN_DAY]}
            tickCount={HOURS_IN_DAY + 1}
            tickFormatter={(value) => `${String(value).padStart(2, "0")}:00`}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
            width={80}
          />
          <YAxis
            type="category"
            dataKey="index"
            width={120}
            tick={{ fontSize: 11 }}
            tickFormatter={(_, index) => {
              const stop = chartData[index];
              return stop ? `${stop.order}. ${stop.pointName}` : "";
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={CustomTooltipWrapper} />
          <Legend />
          <BarWrapper
            dataKey="width"
            radius={[0, 4, 4, 0]}
            minPointSize={0}
            shape={(
              props: BarShapeProps & {
                payload?: { payload: DayTimelineStop };
              },
            ) => {
              const { x, y, width, height, radius, fill, payload } = props;
              const stop = payload?.payload;
              const isClickable = onStopClick && stop;

              if (!isClickable) {
                return React.createElement("rect", {
                  x: Number(x),
                  y: Number(y),
                  width: Math.max(Number(width), 4),
                  height: Number(height),
                  rx: Array.isArray(radius) ? radius[1] : radius,
                  ry: Array.isArray(radius) ? radius[1] : radius,
                  fill,
                });
              }

              return React.createElement("rect", {
                x: Number(x),
                y: Number(y),
                width: Math.max(Number(width), 4),
                height: Number(height),
                rx: Array.isArray(radius) ? radius[1] : radius,
                ry: Array.isArray(radius) ? radius[1] : radius,
                fill,
                className: cn(
                  "cursor-pointer transition-opacity hover:opacity-80",
                ),
                onClick: () => onStopClick?.(stop),
                role: "button",
                tabIndex: 0,
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onStopClick?.(stop);
                  }
                },
              });
            }}
          >
            {chartData.map((stop) => (
              <Cell
                key={stop.stopId}
                fill={`hsl(var(--chart-${(chartData.indexOf(stop) % 5) + 1}))`}
              />
            ))}
          </BarWrapper>
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {chartData.map((stop, index) => (
          <button
            key={stop.stopId}
            type="button"
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded",
              "bg-background border",
              onStopClick && "cursor-pointer hover:bg-accent",
            )}
            onClick={() => onStopClick?.(stop)}
            style={{ borderColor: `hsl(var(--chart-${(index % 5) + 1}))` }}
          >
            <span
              className="w-2 h-2 rounded"
              style={{
                backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
              }}
            />
            {stop.pointName} ({stop.dwellMinutes} min)
          </button>
        ))}
      </div>
    </div>
  );
}
