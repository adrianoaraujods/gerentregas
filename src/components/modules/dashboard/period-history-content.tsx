"use client";

import * as React from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { DataTable, useAppTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import type { GetAggregationInput } from "@/server/modules/dashboard";
import { CsvExportButton } from "./csv-export";
import { buildDrilldownColumns } from "./drilldown-columns";
import { PeriodSelector } from "./period-selector";

type PeriodType = "day" | "month" | "custom";

interface PeriodHistoryContentProps {
  defaultPeriodType?: PeriodType;
}

const historyColumns = buildDrilldownColumns(true);

export function PeriodHistoryContent({
  defaultPeriodType = "day",
}: PeriodHistoryContentProps) {
  const [periodType, setPeriodType] =
    React.useState<PeriodType>(defaultPeriodType);
  const [date, setDate] = React.useState(new Date());
  const [month, setMonth] = React.useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [dateRange, setDateRange] = React.useState({
    from: undefined as Date | undefined,
    to: undefined as Date | undefined,
  });

  const isPeriodValid = () => {
    if (periodType === "day" && !date) return false;
    if (periodType === "custom" && (!dateRange.from || !dateRange.to)) return false;
    return true;
  };

  const buildQueryParams = (): GetAggregationInput => {
    const params: GetAggregationInput = { periodType };
    if (periodType === "day" && date) {
      params.date = date.toISOString();
    } else if (periodType === "month") {
      params.year = month.year;
      params.month = month.month;
    } else if (periodType === "custom" && dateRange.from && dateRange.to) {
      params.dateFrom = dateRange.from.toISOString();
      params.dateTo = dateRange.to.toISOString();
    }
    return params;
  };

  const utils = api.useUtils();

  const { 
    data: drilldown, 
    isLoading: loadingDrilldown,
    isFetching,
    isError,
    refetch 
  } = api.dashboard.getDrilldown.useQuery(buildQueryParams(), {
    enabled: isPeriodValid(),
    placeholderData: keepPreviousData,
  });

  const handleCsvExport = async () => {
    return utils.dashboard.exportCSV.fetch(buildQueryParams());
  };

  const stops = drilldown?.stops ?? [];

  const table = useAppTable({
    data: stops,
    columns: historyColumns,
    getRowId: (row) => row.stopId,
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
  });

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

    if (loadingDrilldown) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!drilldown || stops.length === 0) {
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
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Paradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{stops.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tempo Total Parado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">
                {(drilldown.totalDwellMinutes / 60).toFixed(1)}h
              </div>
              <p className="text-sm text-muted-foreground">
                {drilldown.totalDwellMinutes} minutos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">% da Jornada Padrão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">
                {drilldown.workdayPercentage.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Paradas c/ Tempo Parado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">
                {stops.filter((s) => s.dwellMinutes > 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-0">
            <DataTable table={table} toolbarProps={{ searchPlaceholder: "Pesquisar paradas..." }} />
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Período</h1>
          <p className="text-muted-foreground">Lista detalhada de paradas com tempos de permanência</p>
        </div>
        <CsvExportButton onExport={handleCsvExport} disabled={!isPeriodValid() || loadingDrilldown || isError || !drilldown} />
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
    </div>
  );
}
