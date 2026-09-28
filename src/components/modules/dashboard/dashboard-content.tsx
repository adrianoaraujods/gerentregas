"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as React from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import type { GetAggregationInput } from "@/server/modules/dashboard";
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

  const utils = api.useUtils();

  const isPeriodValid = () => {
    if (periodType === "day" && !date) return false;
    if (periodType === "custom" && (!dateRange.from || !dateRange.to)) return false;
    return true;
  };

  const buildInput = (): GetAggregationInput => {
    const input: GetAggregationInput = { periodType };
    if (periodType === "day" && date) {
      input.date = date.toISOString();
    } else if (periodType === "month") {
      input.year = month.year;
      input.month = month.month;
    } else if (periodType === "custom" && dateRange.from && dateRange.to) {
      input.dateFrom = dateRange.from.toISOString();
      input.dateTo = dateRange.to.toISOString();
    }
    return input;
  };

  const { 
    data: aggregationRaw, 
    isLoading: loadingAggregation,
    isFetching,
    isError,
    refetch 
  } = api.dashboard.getAggregation.useQuery(buildInput(), {
    enabled: isPeriodValid(),
    placeholderData: keepPreviousData,
  });
  const aggregation = aggregationRaw as DashboardData | undefined;

  const { data: workdayData } =
    api.dashboard.getStandardWorkdayDuration.useQuery(undefined, {
      staleTime: 5 * 60 * 1000,
    });

  React.useEffect(() => {
    if (workdayData) setWorkdayMinutes(workdayData.standardWorkdayDuration);
  }, [workdayData]);

  const handleDrilldown = async (periodKey: string) => {
    let drilldownInput: GetAggregationInput;

    if (periodType === "month" || periodType === "custom") {
      drilldownInput = {
        periodType: "day",
        date: new Date(periodKey).toISOString(),
      };
    } else {
      drilldownInput = { periodType: "day", date: date.toISOString() };
    }

    const promise = utils.dashboard.getDrilldown.fetch(drilldownInput);
    
    toast.promise(promise, {
      loading: "Buscando detalhes do dia...",
      success: "Detalhes carregados com sucesso.",
      error: "Erro ao buscar detalhes.",
    });

    try {
      const data = await promise;
      setDrilldownStops(data.stops);
      setDrilldownTotal(data.totalDwellMinutes);
      setDrilldownWorkdayPct(data.workdayPercentage);
      setDrilldownTitle(
        `Detalhes do dia ${format(
          new Date(drilldownInput.date ?? new Date().toISOString()),
          "dd/MM/yyyy",
          { locale: ptBR },
        )}`,
      );
      setDrilldownOpen(true);
    } catch (error) {
      console.error("Erro ao buscar drilldown:", error);
    }
  };

  const handleCsvExport = async () => {
    return utils.dashboard.exportCSV.fetch(buildInput());
  };

  const renderChart = () => {
    switch (periodType) {
      case "day":
        return (
          <DayTimelineChart
            stops={aggregation?.stops || []}
            onStopClick={(stop) => handleDrilldown(stop.stopId)}
          />
        );
      case "month":
        return (
          <MonthBarChart
            data={aggregation?.days || []}
            title={`Mês ${month.month}/${month.year}`}
            onBarClick={(day) => handleDrilldown(day.date)}
            workdayMinutes={workdayMinutes}
          />
        );
      case "custom":
        return (
          <CustomBarChart
            data={aggregation?.days || []}
            title={
              aggregation?.dateFrom && aggregation?.dateTo
                ? `${format(new Date(aggregation.dateFrom), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(aggregation.dateTo), "dd/MM/yyyy", { locale: ptBR })}`
                : "Período personalizado"
            }
            onBarClick={(day) => handleDrilldown(day.date)}
            workdayMinutes={workdayMinutes}
          />
        );
    }
  };

  const renderDataRegion = () => {
    if (!isPeriodValid()) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Selecione o início e o fim do período para visualizar os dados.
          </CardContent>
        </Card>
      );
    }

    if (isError) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="mb-4">Ocorreu um erro ao carregar os dados.</p>
            <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      );
    }

    if (loadingAggregation) {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!aggregation || (aggregation.stops?.length === 0 && aggregation.days?.length === 0)) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum dado disponível para o período selecionado.
          </CardContent>
        </Card>
      );
    }

    return (
      <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tempo Total Parado</CardTitle>
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
              <CardTitle className="text-sm font-medium">% da Jornada Padrão</CardTitle>
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
                  ? aggregation.stops?.filter((s) => s.dwellMinutes > 0).length || 0
                  : aggregation.days?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-0">{renderChart()}</CardContent>
        </Card>
      </div>
    );
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
          disabled={!isPeriodValid() || loadingAggregation || isError || !aggregation}
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

      {renderDataRegion()}

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
