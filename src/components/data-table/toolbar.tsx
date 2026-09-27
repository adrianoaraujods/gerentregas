"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDebouncer } from "@tanstack/react-pacer";
import type { Updater } from "@tanstack/react-table";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DataTableFilterList } from "./filter-list";
import { DataTableSortList } from "./sort-list";
import { DataTableViewOptions } from "./view-options";

type ToolbarTable = {
  state: { globalFilter?: unknown };
  setGlobalFilter: (updater: Updater<string>) => void;
} & React.ComponentProps<typeof DataTableFilterList>["table"] &
  React.ComponentProps<typeof DataTableSortList>["table"] &
  React.ComponentProps<typeof DataTableViewOptions>["table"];

export interface DataTableToolbarProps extends React.ComponentProps<"div"> {
  table: ToolbarTable;
  searchPlaceholder?: string;
  debounceMs?: number;
}

export function DataTableToolbar({
  table,
  searchPlaceholder = "Pesquisar em todas as colunas...",
  debounceMs = 300,
  className,
  children,
  ...props
}: DataTableToolbarProps) {
  const globalFilter = String(table.state.globalFilter ?? "");
  const [value, setValue] = React.useState(globalFilter);

  const { maybeExecute: executeSearch, cancel: cancelPendingSearch } =
    useDebouncer((nextValue: string) => table.setGlobalFilter(nextValue), {
      wait: debounceMs,
    });

  React.useEffect(() => {
    // External writes win over pending local ones (e.g. a controlled reset).
    cancelPendingSearch();
    setValue(globalFilter);
  }, [cancelPendingSearch, globalFilter]);

  return (
    <div
      data-slot="data-table-toolbar"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    >
      <div className="relative w-full max-w-72 min-w-48">
        <HugeiconsIcon
          icon={Search01Icon}
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        />
        <Input
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            setValue(nextValue);
            executeSearch(nextValue);
          }}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="pl-8"
        />
      </div>
      <DataTableFilterList table={table} />
      <DataTableSortList table={table} />
      <DataTableViewOptions table={table} />
      {children}
    </div>
  );
}
