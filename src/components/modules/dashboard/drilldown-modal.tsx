"use client";
import { DataTable, useAppTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[90vw] sm:max-w-xl md:max-w-2xl bg-zinc-950/90 backdrop-blur-xl border-l-white/10 flex flex-col gap-0 p-6">
        <SheetHeader className="pb-4 border-b border-white/10 shrink-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-left">
              <SheetTitle className="text-xl">{title}</SheetTitle>
              <SheetDescription className="mt-1.5">
                {stops.length} parada(s) • {totalDwellMinutes} min total •{" "}
                {workdayPercentage.toFixed(1)}% da jornada
              </SheetDescription>
            </div>
            {onExportCSV && (
              <Button variant="outline" size="sm" onClick={onExportCSV} className="w-full sm:w-auto shrink-0 bg-white/5 border-white/10 hover:bg-white/10">
                Exportar CSV
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-4 pb-12 -mx-6 px-6">
          {stops.length > 0 && (
            <DataTable
              table={table}
              showPagination={false}
              toolbarProps={{ searchPlaceholder: "Pesquisar paradas..." }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
