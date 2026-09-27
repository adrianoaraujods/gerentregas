"use client";

import { XIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DataTable, useAppTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildDrilldownColumns, type DrilldownStop } from "./drilldown-columns";

const modalColumns = buildDrilldownColumns(false);

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
  const table = useAppTable({
    data: stops,
    columns: modalColumns,
    getRowId: (row) => row.stopId,
  });

  if (!open) return null;

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

        <div className="mt-4 max-h-[calc(80vh-220px)] overflow-y-auto">
          <DataTable
            table={table}
            showPagination={false}
            toolbarProps={{ searchPlaceholder: "Pesquisar paradas..." }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
