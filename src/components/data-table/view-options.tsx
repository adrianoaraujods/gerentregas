"use client";

import {
  CheckIcon,
  GripVerticalIcon,
  Settings02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Updater } from "@tanstack/react-table";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@/components/ui/sortable";
import { cn } from "@/lib/utils";
import { getColumnLabel, releasePointerCapture } from "./utils";

type ColumnOrderState = Array<string>;

type ViewOptionsColumn = {
  id: string;
  accessorFn?: unknown;
  columnDef: {
    meta?: { label?: string };
  };
  getIsVisible: () => boolean;
  toggleVisibility: (visible?: boolean) => void;
};

type ViewOptionsTable = {
  state: { columnOrder: ColumnOrderState };
  getAllColumns: () => Array<ViewOptionsColumn>;
  getAllLeafColumns: () => Array<ViewOptionsColumn>;
  getColumn: (id: string) => ViewOptionsColumn | undefined;
  setColumnOrder: (updater: Updater<ColumnOrderState>) => void;
  toggleAllColumnsVisible: (visible?: boolean) => void;
};

export interface DataTableViewOptionsProps extends React.ComponentProps<"div"> {
  table: ViewOptionsTable;
}

export function DataTableViewOptions({
  table,
  className,
  ...props
}: DataTableViewOptionsProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter((column) => typeof column.accessorFn !== "undefined"),
    [table],
  );

  // Materialize the full display order: TanStack's columnOrder state only
  // holds explicit entries, so unlisted columns fall back to their natural
  // (definition) leaf order rather than being sorted alphabetically by id.
  const orderedColumns = React.useMemo(() => {
    const orderIndex = new Map<string, number>();
    table.state.columnOrder.forEach((id, index) => {
      if (!orderIndex.has(id)) {
        orderIndex.set(id, index);
      }
    });
    const naturalIndex = new Map<string, number>();
    table.getAllLeafColumns().forEach((column, index) => {
      if (!naturalIndex.has(column.id)) {
        naturalIndex.set(column.id, index);
      }
    });
    return [...columns].sort((a, b) => {
      const aIndex =
        orderIndex.get(a.id) ??
        naturalIndex.get(a.id) ??
        Number.MAX_SAFE_INTEGER;
      const bIndex =
        orderIndex.get(b.id) ??
        naturalIndex.get(b.id) ??
        Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex || a.id.localeCompare(b.id);
    });
  }, [columns, table]);

  // Write back a reordered accessor sequence while keeping non-accessor
  // columns (e.g. the row-selector display column) anchored in their existing
  // positions. Previously this dropped non-accessor ids from columnOrder, which
  // made TanStack append them at the end — pushing the selector to last.
  const reorderAccessorColumns = React.useCallback(
    (nextAccessors: Array<string>) => {
      const currentOrder = table.state.columnOrder;

      // Build a complete base order: keep any explicit entries (in their
      // positions) and append the remaining leaf ids in natural order. This
      // keeps non-accessor columns (e.g. the row-selector) anchored while
      // ensuring every column is represented, even when columnOrder is only
      // partially seeded (e.g. just ["select"]).
      const seen = new Set<string>();
      const baseOrder: Array<string> = [];
      for (const id of currentOrder) {
        baseOrder.push(id);
        seen.add(id);
      }
      for (const column of table.getAllLeafColumns()) {
        if (!seen.has(column.id)) {
          baseOrder.push(column.id);
          seen.add(column.id);
        }
      }

      // The Sortable value includes non-accessor ids (e.g. "select"); only the
      // accessor ids are eligible to be placed into accessor slots.
      const accessorIds = nextAccessors.filter((id) => {
        const column = table.getColumn(id);
        return column && typeof column.accessorFn !== "undefined";
      });
      const accessorIt = accessorIds[Symbol.iterator]();

      const nextOrder = baseOrder.map((id) => {
        const column = table.getColumn(id);
        if (column && typeof column.accessorFn !== "undefined") {
          const next = accessorIt.next();
          return next.done ? id : next.value;
        }
        return id;
      });

      table.setColumnOrder(nextOrder);
    },
    [table],
  );

  return (
    <div
      data-slot="data-table-view-options"
      className={cn("flex flex-col items-start gap-2", className)}
      {...props}
    >
      <Sortable
        value={orderedColumns.map((column) => column.id)}
        onValueChange={reorderAccessorColumns}
      >
        <Popover>
          <PopoverTrigger
            render={
              <Button
                ref={triggerRef}
                aria-label="Alterar colunas"
                role="combobox"
                variant="outline"
                size="sm"
                className="gap-2 [&_svg]:size-3"
                onPointerDown={releasePointerCapture}
              />
            }
          >
            <HugeiconsIcon icon={Settings02Icon} />
            Exibir
            <HugeiconsIcon icon={UnfoldMoreIcon} className="opacity-50" />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            finalFocus={triggerRef}
            className="max-w-[calc(100vw-2rem)] border-0 p-0"
          >
            <Command>
              <CommandInput placeholder="Pesquisar colunas..." />
              <SortableContent asChild>
                <CommandList className="max-h-none">
                  <CommandEmpty>Nenhuma coluna encontrada.</CommandEmpty>
                  <CommandGroup>
                    {orderedColumns.map((column) => {
                      const label = getColumnLabel(column);
                      const isVisible = column.getIsVisible();

                      return (
                        <SortableItem key={column.id} value={column.id} asChild>
                          <CommandItem
                            value={label}
                            onSelect={() => column.toggleVisibility(!isVisible)}
                            className="[&>svg:last-child]:hidden"
                          >
                            <HugeiconsIcon
                              icon={CheckIcon}
                              aria-hidden="true"
                              className={cn(
                                "size-4 shrink-0",
                                isVisible ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span className="truncate">{label}</span>
                            {/* The row renders its own check icon above;
                                CommandItem's trailing one stays hidden. */}
                            <SortableItemHandle asChild>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Drag to reorder ${label} column`}
                                className="ml-auto [&_svg]:size-3.5"
                              >
                                <HugeiconsIcon icon={GripVerticalIcon} />
                              </Button>
                            </SortableItemHandle>
                          </CommandItem>
                        </SortableItem>
                      );
                    })}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup>
                    <div className="flex items-center gap-1">
                      <CommandItem
                        onSelect={() => table.toggleAllColumnsVisible(false)}
                        className="w-full justify-center border-2 rounded shadow-sm"
                      >
                        Esconder todas
                      </CommandItem>
                      <CommandItem
                        onSelect={() => table.toggleAllColumnsVisible(true)}
                        className="w-full justify-center border-2 rounded shadow-sm"
                      >
                        Mostrar todas
                      </CommandItem>
                    </div>
                  </CommandGroup>
                </CommandList>
              </SortableContent>
            </Command>
          </PopoverContent>
        </Popover>
        <SortableOverlay>
          {/* Measurable first child: dnd-kit sizes the drag overlay from it. */}
          <div
            data-slot="sortable-overlay"
            className="bg-accent/20 size-full"
          />
        </SortableOverlay>
      </Sortable>
    </div>
  );
}
