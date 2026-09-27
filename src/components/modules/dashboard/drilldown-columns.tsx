"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createAppColumnHelper } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { RouterOutputs } from "@/server/api/router";

export type DrilldownStop =
  RouterOutputs["dashboard"]["getDrilldown"]["stops"][number];

export function formatStopTime(timeStr: string | null) {
  if (!timeStr) return "—";
  try {
    return format(new Date(timeStr), "HH:mm:ss", { locale: ptBR });
  } catch {
    return timeStr;
  }
}

export function formatStopDate(timeStr: string | null) {
  if (!timeStr) return "—";
  try {
    return format(new Date(timeStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return timeStr;
  }
}

const columnHelper = createAppColumnHelper<DrilldownStop>();

export function buildDrilldownColumns(includeRoute: boolean) {
  return columnHelper.columns([
    columnHelper.accessor("order", {
      meta: { variant: "text", label: "Ordem" },
      cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
    }),
    columnHelper.accessor("pointName", {
      meta: { variant: "text", label: "Ponto" },
      cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    }),
    columnHelper.accessor("address", {
      meta: { variant: "text", label: "Endereço" },
      cell: ({ getValue }) => (
        <span
          className="block max-w-[200px] truncate text-sm text-muted-foreground"
          title={getValue()}
        >
          {getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.arrivalTime || row.departureTime, {
      id: "data",
      meta: { variant: "text", label: "Data" },
      cell: ({ getValue }) => formatStopDate(getValue()),
    }),
    columnHelper.accessor("arrivalTime", {
      meta: { variant: "text", label: "Chegada" },
      cell: ({ getValue }) => (
        <span className="font-mono">{formatStopTime(getValue())}</span>
      ),
    }),
    columnHelper.accessor("departureTime", {
      meta: { variant: "text", label: "Saída" },
      cell: ({ getValue }) => (
        <span className="font-mono">{formatStopTime(getValue())}</span>
      ),
    }),
    columnHelper.accessor("dwellMinutes", {
      meta: { variant: "number", label: "Tempo Parado" },
      cell: ({ getValue }) => (
        <span className="font-mono tabular-nums">{getValue()} min</span>
      ),
    }),
    columnHelper.accessor("workdayPercentage", {
      meta: { variant: "number", label: "% Jornada" },
      cell: ({ getValue }) => (
        <Badge variant={getValue() > 100 ? "destructive" : "secondary"}>
          {getValue().toFixed(1)}%
        </Badge>
      ),
    }),
    columnHelper.accessor("driverName", {
      meta: { variant: "text", label: "Motorista" },
      cell: ({ getValue }) => <span className="text-sm">{getValue()}</span>,
    }),
    ...(includeRoute
      ? [
          columnHelper.accessor("routeId", {
            meta: { variant: "text", label: "Roteiro" },
            cell: ({ getValue }) => (
              <span className="font-mono text-sm text-muted-foreground">
                {getValue().substring(0, 8)}...
              </span>
            ),
          }),
        ]
      : []),
  ]);
}
