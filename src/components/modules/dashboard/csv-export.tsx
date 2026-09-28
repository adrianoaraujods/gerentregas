"use client";

import { DownloadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CsvExportButtonProps {
  onExport: () => Promise<{ csv: string; filename: string }>;
  disabled?: boolean;
  className?: string;
}

export function CsvExportButton({
  onExport,
  disabled = false,
  className,
}: CsvExportButtonProps) {
  const [isPending, setIsPending] = React.useState(false);

  const handleExport = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      const { csv, filename } = await onExport();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Exportação concluída", {
        description: `Arquivo ${filename} baixado com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast.error("Erro na exportação", {
        description: "Não foi possível gerar o arquivo CSV.",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || isPending}
      className={className}
    >
      {isPending ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <HugeiconsIcon icon={DownloadIcon} className="mr-2 h-4 w-4" />
      )}
      {isPending ? "Exportando..." : "Exportar CSV"}
    </Button>
  );
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

export function generateCSV(stops: DrilldownStop[], filename: string): void {
  const headers = [
    "Data",
    "Motorista",
    "Ordem da Parada",
    "Ponto",
    "Endereço",
    "Chegada",
    "Saída",
    "Tempo Parado (min)",
    "% Jornada Padrão",
  ];

  const rows = stops.map((stop) =>
    [
      stop.arrivalTime
        ? new Date(stop.arrivalTime).toISOString().split("T")[0]
        : "",
      `"${stop.driverName.replace(/"/g, '""')}"`,
      stop.order,
      `"${stop.pointName.replace(/"/g, '""')}"`,
      `"${stop.address.replace(/"/g, '""')}"`,
      stop.arrivalTime
        ? new Date(stop.arrivalTime)
            .toISOString()
            .replace("T", " ")
            .substring(0, 19)
        : "",
      stop.departureTime
        ? new Date(stop.departureTime)
            .toISOString()
            .replace("T", " ")
            .substring(0, 19)
        : "",
      stop.dwellMinutes.toString(),
      stop.workdayPercentage.toFixed(2),
    ].join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
