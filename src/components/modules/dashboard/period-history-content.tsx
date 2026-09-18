"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CsvExportButton } from "./csv-export";
import { PeriodSelector } from "./period-selector";

type PeriodType = "day" | "month" | "custom";

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

interface DrilldownOutput {
  stops: DrilldownStop[];
  totalDwellMinutes: number;
  workdayPercentage: number;
}

interface PeriodHistoryContentProps {
  defaultPeriodType?: PeriodType;
}

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

  const { data: drilldown, isLoading: loadingDrilldown } = useQuery({
    queryKey: ["dashboard", "drilldown", buildQueryParams()],
    queryFn: async () => {
      const params = new URLSearchParams(buildQueryParams());
      const res = await fetch(`/api/trpc/dashboard.getDrilldown?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar histórico");
      const json = await res.json();
      return json.result.data as DrilldownOutput;
    },
    enabled: true,
  });

  const handleCsvExport = async () => {
    const params = new URLSearchParams(buildQueryParams());
    const res = await fetch(`/api/trpc/dashboard.exportCSV?${params}`);
    if (!res.ok) throw new Error("Erro ao exportar CSV");
    const json = await res.json();
    return json.result.data;
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "—";
    try {
      return format(new Date(timeStr), "HH:mm:ss", { locale: ptBR });
    } catch {
      return timeStr;
    }
  };

  const formatDate = (timeStr: string | null) => {
    if (!timeStr) return "—";
    try {
      return format(new Date(timeStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return timeStr;
    }
  };

  if (loadingDrilldown) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Histórico de Período
            </h1>
            <p className="text-muted-foreground">
              Lista detalhada de paradas com tempos de permanência
            </p>
          </div>
          <CsvExportButton onExport={handleCsvExport} disabled={true} />
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

        <Card>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Ordem</TableHead>
                    <TableHead>Ponto</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="w-36 text-center">Data</TableHead>
                    <TableHead className="w-32 text-center">Chegada</TableHead>
                    <TableHead className="w-32 text-center">Saída</TableHead>
                    <TableHead className="w-32 text-center">
                      Tempo Parado
                    </TableHead>
                    <TableHead className="w-32 text-center">
                      % Jornada
                    </TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Roteiro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton component, no state updates
                    <TableRow key={i}>
                      <TableCell className="text-center font-mono">
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <Skeleton className="h-4 w-60" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-sm">
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="text-sm">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!drilldown) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Histórico de Período
            </h1>
            <p className="text-muted-foreground">
              Lista detalhada de paradas com tempos de permanência
            </p>
          </div>
          <CsvExportButton onExport={handleCsvExport} disabled={true} />
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

        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum dado disponível para o período selecionado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const stops = drilldown.stops || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Histórico de Período
          </h1>
          <p className="text-muted-foreground">
            Lista detalhada de paradas com tempos de permanência
          </p>
        </div>
        <CsvExportButton
          onExport={handleCsvExport}
          disabled={loadingDrilldown}
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Paradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">
              {stops.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tempo Total Parado
            </CardTitle>
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
            <CardTitle className="text-sm font-medium">
              % da Jornada Padrão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">
              {drilldown.workdayPercentage.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Paradas c/ Tempo Parado
            </CardTitle>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Ordem</TableHead>
                  <TableHead>Ponto</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead className="w-36 text-center">Data</TableHead>
                  <TableHead className="w-32 text-center">Chegada</TableHead>
                  <TableHead className="w-32 text-center">Saída</TableHead>
                  <TableHead className="w-32 text-center">
                    Tempo Parado
                  </TableHead>
                  <TableHead className="w-32 text-center">% Jornada</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Roteiro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stops.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Nenhuma parada com tempo parado neste período.
                    </TableCell>
                  </TableRow>
                ) : (
                  stops.map((stop) => (
                    <TableRow key={stop.stopId}>
                      <TableCell className="text-center font-mono">
                        {stop.order}
                      </TableCell>
                      <TableCell className="font-medium">
                        {stop.pointName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {stop.address}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatDate(stop.arrivalTime || stop.departureTime)}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {formatTime(stop.arrivalTime)}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {formatTime(stop.departureTime)}
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums">
                        {stop.dwellMinutes} min
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            stop.workdayPercentage > 100
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {stop.workdayPercentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {stop.driverName}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {stop.routeId.substring(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
