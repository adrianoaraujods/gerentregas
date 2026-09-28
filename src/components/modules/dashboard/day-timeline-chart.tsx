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
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { useIsMobile } from "@/components/hooks/use-mobile";
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

const _HOURS_IN_DAY = 24;
const BAR_HEIGHT = 32;
const BAR_GAP = 4;

const BarWrapper = (props: BarProps) => <Bar {...props} />;

export function DayTimelineChart({
  stops,
  onStopClick,
}: DayTimelineChartProps) {
  const isMobile = useIsMobile();

  if (!stops || stops.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Nenhuma parada com tempo parado neste dia.</p>
      </div>
    );
  }

  const chartData = stops
    .filter((s) => s.dwellMinutes > 0)
    .map((stop, index) => {
      const minDuration = 0.25; // min 15 minutes for visibility
      const endHour = stop.startHour + Math.max(stop.dwellHours, minDuration);

      return {
        ...stop,
        index,
        timeRange: [stop.startHour, Math.min(endHour, 24)], // cap at 24:00
        name: stop.pointName,
        color: `var(--chart-${(index % 5) + 1})`,
      };
    });

  const totalDwellMinutes = stops.reduce((sum, s) => sum + s.dwellMinutes, 0);
  const totalDwellHours = totalDwellMinutes / 60;
  const domainMin =
    chartData.length > 0
      ? Math.max(
          0,
          Math.floor(Math.min(...chartData.map((d) => d.startHour))) - 1,
        )
      : 0;
  const domainMax =
    chartData.length > 0
      ? Math.min(
          24,
          Math.ceil(Math.max(...chartData.map((d) => d.timeRange[1]))) + 1,
        )
      : 24;
  const hourSpan = domainMax - domainMin;
  const ticks = Array.from(
    { length: Math.ceil(hourSpan / (isMobile && hourSpan > 8 ? 2 : 1)) + 1 },
    (_, i) => domainMin + i * (isMobile && hourSpan > 8 ? 2 : 1),
  ).filter((t) => t <= 24);

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
      <div className="bg-popover/80 backdrop-blur-md border border-border/50 dark:border-white/10 rounded-lg p-3 shadow-xl min-w-[200px]">
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
      <div className="flex items-center justify-center text-sm mb-2">
        <span className="text-muted-foreground font-medium">
          Tempo Total Parado: {totalDwellHours.toFixed(1)}h ({totalDwellMinutes}{" "}
          min)
        </span>
      </div>

      <ResponsiveContainer
        width="100%"
        height={Math.max(chartData.length * (BAR_HEIGHT + BAR_GAP) + 60, 200)}
      >
        <ComposedChart
          data={chartData}
          layout="horizontal"
          margin={{ top: 20, right: 20, bottom: 40, left: isMobile ? 0 : 120 }}
        >
          <CartesianGrid
            horizontal={false}
            vertical
            strokeDasharray="4 4"
            stroke="var(--border)"
          />
          <XAxis
            type="number"
            domain={[domainMin, domainMax]}
            ticks={ticks}
            tickFormatter={(value) => `${String(value).padStart(2, "0")}:00`}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
            width={80}
          />
          <YAxis
            type="category"
            dataKey="index"
            width={isMobile ? 50 : 120}
            tick={{ fontSize: 11 }}
            tickFormatter={(_, index) => {
              const stop = chartData[index];
              if (!stop) return "";
              if (isMobile)
                return `${stop.order}. ${stop.pointName.substring(0, 5)}...`;
              return `${stop.order}. ${stop.pointName}`;
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={CustomTooltipWrapper} />
          <BarWrapper
            dataKey="timeRange"
            name="Horas Parado"
            radius={[4, 4, 4, 4]}
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
                fill={`var(--chart-${(chartData.indexOf(stop) % 5) + 1})`}
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
              onStopClick && "cursor-pointer hover:bg-muted",
            )}
            onClick={() => onStopClick?.(stop)}
            style={{ borderColor: `var(--chart-${(index % 5) + 1})` }}
          >
            <span
              className="w-2 h-2 rounded"
              style={{
                backgroundColor: `var(--chart-${(index % 5) + 1})`,
              }}
            />
            {stop.pointName} ({stop.dwellMinutes} min)
          </button>
        ))}
      </div>
    </div>
  );
}
