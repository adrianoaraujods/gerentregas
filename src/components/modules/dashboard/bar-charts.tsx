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
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { useIsMobile } from "@/components/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Nenhum dado para o período selecionado.</p>
      </div>
    );
  }

  const chartData = data.map((d) => {
    const dwellHoursNum = Number((d.totalDwellMinutes / 60).toFixed(2));
    return {
      ...d,
      label: formatShortDate(d.date),
      dwellHours: dwellHoursNum.toFixed(1),
      dwellHoursNum,
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
      <div className="bg-popover/80 backdrop-blur-md border border-border/50 dark:border-white/10 rounded-lg p-3 shadow-xl min-w-[220px]">
        <p className="font-medium">{date}</p>
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
          <span className="text-muted-foreground">Tempo parado:</span>
          <span className="font-medium">
            {item.totalDwellMinutes} min ({item.dwellHours}h)
          </span>
          <span className="text-muted-foreground">Paradas:</span>
          <span className="font-medium">{item.stopsCount}</span>
          <span className="text-muted-foreground">% Jornada (média):</span>
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
      {/* minWidth keeps a readable column per day, scrolling instead of squeezing on long ranges */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: chartData.length * 28 }}>
          <ResponsiveContainer width="100%" height={isMobile ? 240 : 320}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
            >
              <CartesianGrid
                horizontal
                strokeDasharray="4 4"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                type="category"
                dataKey="label"
                interval="preserveStartEnd"
                minTickGap={8}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                type="number"
                domain={[
                  0,
                  (dataMax: number) => Math.max(dataMax, workdayHours) + 1,
                ]}
                width={40}
                tickFormatter={(value) => `${value}h`}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={CustomTooltipWrapper} />
              {showWorkdayLine && workdayMinutes > 0 && (
                <ReferenceLine
                  y={workdayHours}
                  stroke="var(--destructive)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Jornada padrão (${workdayHours}h)`,
                    position: "insideTopRight",
                    fill: "var(--destructive)",
                    fontSize: 10,
                  }}
                />
              )}
              <BarWrapper
                dataKey="dwellHoursNum"
                name="Horas Parado"
                radius={[4, 4, 0, 0]}
                minPointSize={0}
                onClick={handleBarClick}
              >
                {chartData.map((day, index) => (
                  <Cell
                    key={day.date}
                    fill={`var(--chart-${(index % 5) + 1})`}
                  />
                ))}
              </BarWrapper>
            </BarChart>
          </ResponsiveContainer>
        </div>
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
