"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomBarChart, MonthBarChart } from "./bar-charts";
import { CsvExportButton } from "./csv-export";
import { DayTimelineChart } from "./day-timeline-chart";
import { DrilldownModal } from "./drilldown-modal";
import { PeriodSelector } from "./period-selector";

type PeriodType = "day" | "month" | "custom";

interface DashboardStop {
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

interface DrilldownStop {
  routeId: string;
  driverId: string;
  driverName: string;
  stopId: string;
  order: string;
  pointId: string;
  pointName: string;
  address: string;
  arrivalTime: string | null;
  departureTime: string | null;
  dwellMinutes: number;
  workdayPercentage: number;
}

interface DashboardDay {
  date: string;
  totalDwellMinutes: number;
  stopsCount: number;
  workdayPercentage: number;
  [key: string]: unknown;
}

interface DashboardData {
  periodType: PeriodType;
  date?: string;
  year?: number;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
  stops?: DashboardStop[];
  days?: DashboardDay[];
  totalDwellMinutes: number;
  workdayPercentage: number;
}

export function DashboardContent() {
  const [periodType, setPeriodType] = React.useState<PeriodType>("day");
  const [date, setDate] = React.useState(new Date());
  const [month, setMonth] = React.useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [dateRange, setDateRange] = React.useState({
    from: undefined as Date | undefined,
    to: undefined as Date | undefined,
  });
  const [drilldownOpen, setDrilldownOpen] = React.useState(false);
  const [drilldownTitle, setDrilldownTitle] = React.useState("");
  const [drilldownStops, setDrilldownStops] = React.useState<DrilldownStop[]>(
    [],
  );
  const [drilldownTotal, setDrilldownTotal] = React.useState(0);
  const [drilldownWorkdayPct, setDrilldownWorkdayPct] = React.useState(0);
  const [workdayMinutes, setWorkdayMinutes] = React.useState(480);

  const buildQueryParams = () => {
    const params: Record<string, string> = { periodType };
    if (periodType === "day" && date) {
      params.date = date.toISOString();
    } else if (periodType === "month") {
      params.year = month.year.toString();
      params.month = month.month.toString();
    } else if (periodType === "custom" && dateRange.from && dateRange.to) {
      params.dateFrom = dateRange.from.toISOString();
      params.dateTo = dateRange.to.toISOString();
    }
    return params;
  };

  const { data: aggregation, isLoading: loadingAggregation } = useQuery({
    queryKey: ["dashboard", "aggregation", buildQueryParams()],
    queryFn: async () => {
      const params = new URLSearchParams(buildQueryParams());
      const res = await fetch(`/api/trpc/dashboard.getAggregation?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar agregação");
      const json = await res.json();
      return json.result.data as DashboardData;
    },
    enabled: true,
  });

  const { data: workdayData } = useQuery({
    queryKey: ["dashboard", "workday"],
    queryFn: async () => {
      const res = await fetch("/api/trpc/dashboard.getStandardWorkdayDuration");
      if (!res.ok) return 480;
      const json = await res.json();
      return json.result.data.standardWorkdayDuration;
    },
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (workdayData) setWorkdayMinutes(workdayData);
  }, [workdayData]);

  const handleDrilldown = async (periodKey: string) => {
    const params = new URLSearchParams(buildQueryParams());
    if (periodType === "day") {
      params.set("date", periodKey);
    } else if (periodType === "month") {
      params.set("year", month.year.toString());
      params.set("month", month.month.toString());
    } else if (periodType === "custom") {
      params.set("dateFrom", periodKey);
    }

    try {
      const res = await fetch(`/api/trpc/dashboard.getDrilldown?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar detalhes");
      const json = await res.json();
      const data = json.result.data;

      setDrilldownStops(data.stops);
      setDrilldownTotal(data.totalDwellMinutes);
      setDrilldownWorkdayPct(data.workdayPercentage);
      setDrilldownTitle(
        periodType === "day"
          ? `Detalhes do dia ${format(new Date(periodKey), "dd/MM/yyyy", { locale: ptBR })}`
          : periodType === "month"
            ? `Detalhes de ${format(new Date(`${month.year}-${String(month.month).padStart(2, "0")}-01`), "MMMM 'de' yyyy", { locale: ptBR })}`
            : `Detalhes de ${format(new Date(periodKey), "dd/MM/yyyy", { locale: ptBR })}`,
      );
      setDrilldownOpen(true);
    } catch (error) {
      console.error("Erro ao buscar drilldown:", error);
    }
  };

  const handleCsvExport = async () => {
    const params = new URLSearchParams(buildQueryParams());
    const res = await fetch(`/api/trpc/dashboard.exportCSV?${params}`);
    if (!res.ok) throw new Error("Erro ao exportar CSV");
    const json = await res.json();
    return json.result.data;
  };

  if (loadingAggregation) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-12 w-1/3" />
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!aggregation) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhum dado disponível para o período selecionado.
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    switch (periodType) {
      case "day":
        return (
          <DayTimelineChart
            stops={aggregation.stops || []}
            onStopClick={(stop) => handleDrilldown(stop.stopId)}
          />
        );
      case "month":
        return (
          <MonthBarChart
            data={aggregation.days || []}
            title={`Mês ${month.month}/${month.year}`}
            onBarClick={(day) => handleDrilldown(day.date)}
            workdayMinutes={workdayMinutes}
          />
        );
      case "custom":
        return (
          <CustomBarChart
            data={aggregation.days || []}
            title={
              aggregation.dateFrom && aggregation.dateTo
                ? `${format(new Date(aggregation.dateFrom), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(aggregation.dateTo), "dd/MM/yyyy", { locale: ptBR })}`
                : "Período personalizado"
            }
            onBarClick={(day) => handleDrilldown(day.date)}
            workdayMinutes={workdayMinutes}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visualização de tempo parado por período
          </p>
        </div>
        <CsvExportButton
          onExport={handleCsvExport}
          disabled={loadingAggregation}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <PeriodSelector
            periodType={periodType}
            onPeriodTypeChange={setPeriodType}
            date={date}
            onDateChange={setDate}
            month={month}
            onMonthChange={setMonth}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tempo Total Parado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">
              {(aggregation.totalDwellMinutes / 60).toFixed(1)}h
            </div>
            <p className="text-sm text-muted-foreground">
              {aggregation.totalDwellMinutes} minutos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              % da Jornada Padrão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">
              {aggregation.workdayPercentage.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              Jornada padrão: {workdayMinutes / 60}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {periodType === "day"
                ? "Paradas com Tempo Parado"
                : periodType === "month"
                  ? "Dias com Dados"
                  : "Dias no Período"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">
              {periodType === "day"
                ? aggregation.stops?.filter(
                    (s: DashboardStop) => s.dwellMinutes > 0,
                  ).length || 0
                : aggregation.days?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-0">{renderChart()}</CardContent>
      </Card>

      <DrilldownModal
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        title={drilldownTitle}
        stops={drilldownStops}
        totalDwellMinutes={drilldownTotal}
        workdayPercentage={drilldownWorkdayPct}
        onExportCSV={handleCsvExport}
      />
    </div>
  );
}
