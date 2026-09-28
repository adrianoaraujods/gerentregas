"use client";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader className="pr-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {stops.length} parada(s) • {totalDwellMinutes} min total •{" "}
                {workdayPercentage.toFixed(1)}% da jornada
              </DialogDescription>
            </div>
            {onExportCSV && (
              <Button variant="outline" size="sm" onClick={onExportCSV}>
                Exportar CSV
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="mt-4 min-h-0 overflow-y-auto">
          {stops.length > 0 && (
            <DataTable
              table={table}
              showPagination={false}
              toolbarProps={{ searchPlaceholder: "Pesquisar paradas..." }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
