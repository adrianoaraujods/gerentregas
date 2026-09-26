"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar,
  BarChart,
  type BarProps,
  type BarRectangleItem,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

interface DailyAggregation {
  date: string;
  totalDwellMinutes: number;
  stopsCount: number;
  workdayPercentage: number;
}

interface BarChartProps {
  data: DailyAggregation[];
  title?: string;
  onBarClick?: (day: DailyAggregation) => void;
  showWorkdayLine?: boolean;
  workdayMinutes?: number;
}

const formatShortDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), "dd/MM", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const BarWrapper = (props: BarProps) => <Bar {...props} />;

export function MonthBarChart({
  data,
  title,
  onBarClick,
  showWorkdayLine = true,
  workdayMinutes = 480,
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Nenhum dado para o período selecionado.</p>
      </div>
    );
  }

  const chartData = data.map((d, index) => {
    const dwellHoursNum = Number((d.totalDwellMinutes / 60).toFixed(2));
    return {
      ...d,
      label: formatShortDate(d.date),
      dwellHours: dwellHoursNum.toFixed(1),
      dwellHoursNum,
      color: `var(--chart-${(index % 5) + 1})`,
      index,
    };
  });

  const workdayHours = workdayMinutes / 60;

  const handleBarClick = (data: BarRectangleItem) => {
    const payload = data.payload as
      | (DailyAggregation & { dwellHours: string })
      | undefined;
    if (payload) {
      onBarClick?.(payload);
    }
  };

  const CustomTooltip = ({
    active,
    payload,
  }: TooltipContentProps<number | string>) => {
    if (!active || !payload?.length) return null;

    const item = payload[0].payload as DailyAggregation & {
      dwellHours: string;
    };
    const date = format(new Date(item.date), "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    });

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[220px]">
        <p className="font-medium">{date}</p>
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
          <span className="text-muted-foreground">Tempo parado:</span>
          <span className="font-medium">
            {item.totalDwellMinutes} min ({item.dwellHours}h)
          </span>
          <span className="text-muted-foreground">Paradas:</span>
          <span className="font-medium">{item.stopsCount}</span>
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
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      )}
      <ResponsiveContainer
        width="100%"
        height={Math.max(data.length * 35 + 100, 300)}
      >
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 40, left: 80 }}
        >
          <CartesianGrid
            horizontal
            strokeDasharray="4 4"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            type="number"
            domain={[0, "dataMax + 1"]}
            tickFormatter={(value) => `${value}h`}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={80}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
          />
          <Tooltip content={CustomTooltipWrapper} />
          <Legend />
          {showWorkdayLine && workdayMinutes > 0 && (
            <ReferenceLine
              x={workdayHours}
              stroke="var(--destructive)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Jornada padrão (${workdayHours}h)`,
                position: "insideStart",
                fill: "var(--destructive)",
                fontSize: 10,
              }}
            />
          )}
          <BarWrapper
            dataKey="dwellHoursNum"
            radius={[0, 4, 4, 0]}
            minPointSize={0}
            onClick={handleBarClick}
          >
            {chartData.map((day) => (
              <Cell
                key={day.date}
                fill={`var(--chart-${(chartData.indexOf(day) % 5) + 1})`}
              />
            ))}
          </BarWrapper>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {chartData.map((day) => (
          <button
            key={day.date}
            type="button"
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded",
              "bg-background border",
              onBarClick && "cursor-pointer hover:bg-accent",
            )}
            onClick={() => onBarClick?.(day)}
            style={{
              borderColor: `var(--chart-${(chartData.indexOf(day) % 5) + 1})`,
            }}
          >
            <span
              className="w-2 h-2 rounded"
              style={{
                backgroundColor: `var(--chart-${(chartData.indexOf(day) % 5) + 1})`,
              }}
            />
            {day.label}: {day.dwellHours}h ({day.workdayPercentage.toFixed(0)}%)
          </button>
        ))}
      </div>
    </div>
  );
}

export function CustomBarChart({
  data,
  title,
  onBarClick,
  showWorkdayLine = true,
  workdayMinutes = 480,
}: BarChartProps) {
  return (
    <MonthBarChart
      data={data}
      title={title}
      onBarClick={onBarClick}
      showWorkdayLine={showWorkdayLine}
      workdayMinutes={workdayMinutes}
    />
  );
}
