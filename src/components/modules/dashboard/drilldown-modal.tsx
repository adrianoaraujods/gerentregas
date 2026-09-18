"use client";

import { XIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface DrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  stops: DrilldownStop[];
  totalDwellMinutes: number;
  workdayPercentage: number;
  onExportCSV?: () => void;
}

export function DrilldownModal({
  open,
  onOpenChange,
  title,
  stops,
  totalDwellMinutes,
  workdayPercentage,
  onExportCSV,
}: DrilldownModalProps) {
  if (!open) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {stops.length} parada(s) • {totalDwellMinutes} min total •{" "}
              {workdayPercentage.toFixed(1)}% da jornada
            </DialogDescription>
          </div>
          <div className="flex gap-2">
            {onExportCSV && (
              <Button variant="outline" size="sm" onClick={onExportCSV}>
                Exportar CSV
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
            >
              <HugeiconsIcon icon={XIcon} className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4 overflow-x-auto max-h-[calc(80vh-200px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">Ordem</TableHead>
                <TableHead>Ponto</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="w-36 text-center">Data</TableHead>
                <TableHead className="w-32 text-center">Chegada</TableHead>
                <TableHead className="w-32 text-center">Saída</TableHead>
                <TableHead className="w-32 text-center">Tempo Parado</TableHead>
                <TableHead className="w-32 text-center">% Jornada</TableHead>
                <TableHead>Motorista</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stops.map((stop) => (
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
                  <TableCell className="text-sm">{stop.driverName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {stops.length === 0 && (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>Nenhuma parada com tempo parado neste período.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
