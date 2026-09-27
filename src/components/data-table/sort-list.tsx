"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  CheckIcon,
  Delete02Icon,
  GripVerticalIcon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ColumnSort, Updater } from "@tanstack/react-table";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@/components/ui/sortable";
import { cn } from "@/lib/utils";
import type { ColumnVariant } from "./column-meta";
import { getColumnLabel, releasePointerCapture } from "./utils";

type SortingState = Array<ColumnSort>;

type SortListColumn = {
  id: string;
  getCanSort: () => boolean;
  columnDef: {
    meta?: { label?: string; variant?: ColumnVariant };
  };
};

type SortListTable = {
  state: { sorting: SortingState };
  getAllColumns: () => Array<SortListColumn>;
  setSorting: (updater: Updater<SortingState>) => void;
  resetSorting: (defaultState?: boolean) => void;
};

export interface DataTableSortListProps extends React.ComponentProps<"div"> {
  table: SortListTable;
}

export function DataTableSortList({
  table,
  className,
  ...props
}: DataTableSortListProps) {
  const sorting = table.state.sorting;

  const titleId = React.useId();
  const descriptionId = React.useId();
  const listId = React.useId();
  const [open, setOpen] = React.useState(false);

  const sortableColumns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanSort()),
    [table],
  );

  const onColumnSelect = React.useCallback(
    (currentSortId: string, newColumnId: string) => {
      const newSorting = sorting.map((sort) =>
        sort.id === currentSortId ? { ...sort, id: newColumnId } : sort,
      );
      table.setSorting(newSorting);
    },
    [sorting, table],
  );

  const onSortAdd = React.useCallback(() => {
    const firstAvailableColumn = sortableColumns.find(
      (column) => !sorting.some((sort) => sort.id === column.id),
    );
    if (firstAvailableColumn) {
      table.setSorting([
        ...sorting,
        { id: firstAvailableColumn.id, desc: false },
      ]);
    }
  }, [sorting, sortableColumns, table]);

  const onSortUpdate = React.useCallback(
    (sortId: string, updates: Partial<Omit<ColumnSort, "id">>) => {
      const newSorting = sorting.map((sort) =>
        sort.id === sortId ? { ...sort, ...updates } : sort,
      );
      table.setSorting(newSorting);
    },
    [sorting, table],
  );

  const onSortRemove = React.useCallback(
    (sortId: string) => {
      const newSorting = sorting.filter((sort) => sort.id !== sortId);
      table.setSorting(newSorting);
    },
    [sorting, table],
  );

  return (
    <div
      data-slot="data-table-sort-list"
      className={cn("flex flex-col items-start gap-2", className)}
      {...props}
    >
      <Sortable
        value={sorting}
        onValueChange={(value) => table.setSorting(value)}
        getItemValue={(item) => item.id}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="[&_svg]:size-3"
                onClick={(event) => event.currentTarget.focus()}
                onPointerDown={releasePointerCapture}
              />
            }
          >
            <HugeiconsIcon icon={ArrowUpDownIcon} />
            Ordenar
            {sorting.length > 0 && (
              <Badge className="h-[1.14rem] aspect-square shadow-none rounded-full font-mono font-normal text-[0.65rem]">
                {sorting.length}
              </Badge>
            )}
          </PopoverTrigger>
          <PopoverContent
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            align="start"
            className="flex w-full max-w-[calc(100vw-2rem)] flex-col gap-3 p-4"
          >
            <div className="flex flex-col gap-1">
              <h4 id={titleId} className="font-medium leading-none">
                {sorting.length > 0
                  ? "Ordenar por"
                  : "Nenhuma ordenação aplicada"}
              </h4>
              <p id={descriptionId} className="text-muted-foreground text-sm">
                {sorting.length > 0
                  ? "Organize as ordenações para mudar a prioridade."
                  : "Adicione uma ordenação para ordenar os resultados."}
              </p>
            </div>
            {sorting.length > 0 ? (
              <SortableContent asChild>
                <ul
                  id={listId}
                  aria-labelledby={titleId}
                  aria-describedby={descriptionId}
                  className="flex max-h-75 flex-col gap-2 overflow-auto p-1"
                >
                  {sorting.map((sort) => {
                    const currentColumn = sortableColumns.find(
                      (column) => column.id === sort.id,
                    );
                    // This level's own column stays selectable; every other
                    // level's column is already taken.
                    const selectableColumns = sortableColumns.filter(
                      (column) =>
                        column.id === sort.id ||
                        !sorting.some(
                          (candidate) => candidate.id === column.id,
                        ),
                    );
                    const columnTitle = getColumnLabel(
                      currentColumn ?? { id: sort.id, columnDef: {} },
                    );
                    const sortItemId = `${listId}-${sort.id}`;

                    return (
                      <SortableItem key={sort.id} value={sort.id} asChild>
                        <li
                          tabIndex={-1}
                          aria-labelledby={`${sortItemId}-field-trigger`}
                          className={
                            "grid grid-cols-[1fr_12rem_2rem_2rem] items-center gap-2"
                          }
                        >
                          <Popover>
                            <PopoverTrigger
                              render={
                                <Button
                                  role="combobox"
                                  id={`${sortItemId}-field-trigger`}
                                  aria-label={`Selecione uma coluna para ordenar por. Atual: ${columnTitle}`}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 justify-between gap-2 font-normal focus:outline-none focus:ring-1 focus:ring-ring"
                                  onPointerDown={releasePointerCapture}
                                />
                              }
                            >
                              <span className="whitespace-nowrap">
                                {columnTitle}
                              </span>
                              <HugeiconsIcon
                                icon={UnfoldMoreIcon}
                                className="opacity-50"
                              />
                            </PopoverTrigger>
                            <PopoverContent
                              id={`${sortItemId}-field-listbox`}
                              align="start"
                              className="w-(--anchor-width) p-0"
                            >
                              <Command>
                                <CommandInput
                                  placeholder="Pesquisar colunas..."
                                  aria-label="Pesquisar colunas ordenáveis"
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    Nenhuma coluna encontrada.
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {selectableColumns.map((column) => (
                                      <CommandItem
                                        key={column.id}
                                        value={column.id}
                                        onSelect={() =>
                                          onColumnSelect(sort.id, column.id)
                                        }
                                      >
                                        <span className="truncate">
                                          {getColumnLabel(column)}
                                        </span>
                                        <HugeiconsIcon
                                          icon={CheckIcon}
                                          className={cn(
                                            "ml-auto size-4",
                                            column.id === sort.id
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                          aria-hidden="true"
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <Select
                            value={
                              sort.desc
                                ? "Ordem decrescente"
                                : "Ordem crescente"
                            }
                            onValueChange={(value) => {
                              if (!value) return;
                              onSortUpdate(sort.id, { desc: value === "desc" });
                            }}
                          >
                            <SelectTrigger
                              aria-controls={`${sortItemId}-direction-listbox`}
                              aria-label={`Direção da ordenação em ${columnTitle}`}
                              className="h-8 shadow-md w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              id={`${sortItemId}-direction-listbox`}
                              className="min-w-(--anchor-width) w-full"
                            >
                              <SelectItem value="asc">
                                <HugeiconsIcon
                                  className="size-4 pt-1"
                                  icon={ArrowUp01Icon}
                                />
                                Ordem crescente
                              </SelectItem>
                              <SelectItem value="desc">
                                <HugeiconsIcon
                                  className="size-4 pt-1"
                                  icon={ArrowDown01Icon}
                                />
                                Ordem decrescente
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            aria-label={`Remover ordenação em ${columnTitle}`}
                            variant="outline"
                            size="icon-sm"
                            onClick={() => onSortRemove(sort.id)}
                          >
                            <HugeiconsIcon icon={Delete02Icon} />
                          </Button>

                          <SortableItemHandle asChild>
                            <Button
                              aria-label={`Arraste para mudar a prioridade da ordenação na coluna ${columnTitle}`}
                              variant="outline"
                              size="icon-sm"
                            >
                              <HugeiconsIcon icon={GripVerticalIcon} />
                            </Button>
                          </SortableItemHandle>
                        </li>
                      </SortableItem>
                    );
                  })}
                </ul>
              </SortableContent>
            ) : null}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onSortAdd}
                disabled={sorting.length >= sortableColumns.length}
              >
                Adicionar ordenação
              </Button>
              {sorting.length > 0 && (
                <Button
                  aria-label="Limpar todas as ordenações"
                  size="sm"
                  variant="outline"
                  onClick={() => table.resetSorting()}
                >
                  Limpar
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <SortableOverlay>
          <div data-slot="sortable-overlay">
            <div className="h-8 rounded-md bg-accent/50" />
          </div>
        </SortableOverlay>
      </Sortable>
    </div>
  );
}
