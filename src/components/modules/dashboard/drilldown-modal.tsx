"use client";
import { DataTable, useAppTable } from "@/components/data-table";
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
}

export function DrilldownModal({
  open,
  onOpenChange,
  title,
  stops,
  totalDwellMinutes,
  workdayPercentage,
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {stops.length} parada(s) • {totalDwellMinutes} min parado •{" "}
            {workdayPercentage.toFixed(1)}% da jornada
          </DialogDescription>
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
