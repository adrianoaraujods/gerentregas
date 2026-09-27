"use client";

import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type PaginationState = { pageIndex: number; pageSize: number };

export type PaginationTable = {
  state: { pagination: PaginationState };
  setPageSize: (pageSize: number) => void;
  firstPage: () => void;
  previousPage: () => void;
  nextPage: () => void;
  lastPage: () => void;
  getCanPreviousPage: () => boolean;
  getCanNextPage: () => boolean;
  getCanLastPage: () => boolean;
  getPageCount: () => number;
  getFilteredRowModel: () => { rows: Array<unknown> };
  getFilteredSelectedRowModel: () => { rows: Array<unknown> };
};

const DEFAULT_PAGE_SIZE_OPTIONS = [
  10,
  20,
  30,
  40,
  50,
  Number.POSITIVE_INFINITY,
];

function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "All";
  return value.toLocaleString();
}

export interface DataTablePaginationProps extends React.ComponentProps<"div"> {
  table: PaginationTable;
  pageSizeOptions?: Array<number>;
}

export function DataTablePagination({
  table,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
  ...props
}: DataTablePaginationProps) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const filteredCount = table.getFilteredRowModel().rows.length;
  // An empty filtered row model yields pageCount 0; page one still exists.
  const pageCount = Math.max(table.getPageCount(), 1);

  return (
    <div
      data-slot="data-table-pagination"
      className={cn(
        "flex flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8",
        className,
      )}
      {...props}
    >
      <div className="text-muted-foreground flex-1 text-sm whitespace-nowrap">
        {`${formatCount(selectedCount)} de ${formatCount(filteredCount)} linha(s) selecionada(s).`}
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm whitespace-nowrap">
            Resultados por página
          </p>
          <Select
            value={String(table.state.pagination.pageSize)}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger aria-label="Resultados por página">
              <SelectValue>
                {table.state.pagination.pageSize === Number.POSITIVE_INFINITY
                  ? "Todas"
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {Number.isFinite(pageSize) ? pageSize : "Todas"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center font-medium text-sm">
          {`Página ${formatCount(table.state.pagination.pageIndex + 1)} de ${formatCount(pageCount)}`}
        </div>
        <div className="flex items-center gap-2 [&_svg]:size-4">
          <Button
            aria-label="Ir para primeira página"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <HugeiconsIcon icon={ChevronFirstIcon} />
          </Button>
          <Button
            aria-label="Ir para página anterior"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <HugeiconsIcon icon={ChevronLeftIcon} />
          </Button>
          <Button
            aria-label="Ir para próxima página"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <HugeiconsIcon icon={ChevronRightIcon} />
          </Button>
          <Button
            aria-label="Ir para última página"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.lastPage()}
            disabled={!table.getCanLastPage()}
          >
            <HugeiconsIcon icon={ChevronLastIcon} />
          </Button>
        </div>
      </div>
    </div>
  );
}
