"use client";

import {
  Cancel01Icon,
  FilterIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Updater } from "@tanstack/react-table";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import type { ColumnMetaOptions, ColumnVariant } from "./column-meta";
import {
  FilterValueEditor,
  getColumnVariant,
  getDefaultFilterValue,
  getEditorOptions,
  getTableColumnFilters,
  isEmptyOperator,
  reshapeValueOnOperatorChange,
} from "./filter-editors";
import type {
  ExtendedColumnFilter,
  FilterOperator,
  JoinOperator,
} from "./filter-logic";
import { getFilterOperators } from "./filter-logic";

type ColumnFiltersState = Array<ExtendedColumnFilter>;

type FilterListColumn = {
  id: string;
  columnDef: {
    meta?: { label?: string; variant?: ColumnVariant };
  };
  getCanFilter: () => boolean;
  getFacetedUniqueValues: () => Map<unknown, number>;
};

type FilterListTable = {
  state: unknown;
  getAllColumns: () => Array<unknown>;
  setColumnFilters: (updater: Updater<ColumnFiltersState>) => void;
  getPreFilteredRowModel: () => {
    flatRows: Array<{ getValue: (columnId: string) => unknown }>;
  };
};

let fallbackFilterSeq = 1;

function createFilterId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const id = `filter-${fallbackFilterSeq}`;
  fallbackFilterSeq += 1;
  return id;
}

function isBlankValue(value: unknown): boolean {
  return (
    value === "" || value == null || (Array.isArray(value) && !value.length)
  );
}

function isFilterActive(filter: ExtendedColumnFilter): boolean {
  return isEmptyOperator(filter.operator) || !isBlankValue(filter.value);
}

// Value stored for isEmpty/isNotEmpty filters so TanStack's blank-value
// auto-pruning keeps them; `dynamicFilterFn` ignores the value entirely.
const EMPTY_OPERATOR_SENTINEL = true;

function toStoredFilter(filter: ExtendedColumnFilter): ExtendedColumnFilter {
  if (isEmptyOperator(filter.operator) && isBlankValue(filter.value)) {
    return { ...filter, value: EMPTY_OPERATOR_SENTINEL };
  }
  return filter;
}

function normalizeItem(filter: ExtendedColumnFilter): ExtendedColumnFilter {
  return {
    joinOperator: "and",
    ...filter,
    filterId: filter.filterId ?? createFilterId(),
  };
}

function currentJoinOperator(items: ExtendedColumnFilter[]): JoinOperator {
  return (items[0]?.joinOperator as JoinOperator | undefined) ?? "and";
}

function serializeItems(items: ExtendedColumnFilter[]): string {
  return JSON.stringify(
    items.map(({ id, value, operator, joinOperator }) => ({
      id,
      value,
      operator,
      joinOperator,
    })),
  );
}

function getColumnLabel(column: FilterListColumn): string {
  return column.columnDef.meta?.label ?? column.id;
}

export interface DataTableFilterListProps extends React.ComponentProps<"div"> {
  table: FilterListTable;
}

export function DataTableFilterList({
  table,
  className,
  ...props
}: DataTableFilterListProps) {
  const filterableColumns = React.useMemo(
    () =>
      (table.getAllColumns() as unknown as Array<FilterListColumn>).filter(
        (column) => column.getCanFilter(),
      ),
    [table],
  );

  const [items, setItems] = React.useState<ExtendedColumnFilter[]>(() =>
    getTableColumnFilters(table).map(normalizeItem),
  );

  const columnFiltersState = getTableColumnFilters(table);

  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    setItems((current) => {
      if (
        serializeItems(current.filter(isFilterActive)) ===
        serializeItems(columnFiltersState)
      ) {
        return current;
      }
      return columnFiltersState.map(normalizeItem);
    });
  }, [columnFiltersState]);

  const commitItems = React.useCallback(
    (next: ExtendedColumnFilter[]) => {
      const stored = next.map(toStoredFilter);
      setItems(stored);
      table.setColumnFilters(stored.filter(isFilterActive));
    },
    [table],
  );

  const updateItem = React.useCallback(
    (filterId: string, patch: Partial<ExtendedColumnFilter>) => {
      commitItems(
        items.map((item) =>
          item.filterId === filterId ? { ...item, ...patch } : item,
        ),
      );
    },
    [commitItems, items],
  );

  const addFilter = () => {
    const usedIds = new Set(items.map((item) => item.id));
    const column =
      filterableColumns.find((candidate) => !usedIds.has(candidate.id)) ??
      filterableColumns[0];
    if (!column) return;

    const variant = getColumnVariant(column, table);
    const operator = getFilterOperators(variant)[0].value;

    commitItems([
      ...items,
      {
        id: column.id,
        filterId: createFilterId(),
        value: getDefaultFilterValue(variant),
        operator,
        joinOperator: currentJoinOperator(items),
      },
    ]);
  };

  const removeItem = (filterId: string) => {
    commitItems(items.filter((item) => item.filterId !== filterId));
  };

  const onColumnChange = (
    item: ExtendedColumnFilter,
    columnId: string | null,
  ) => {
    if (!columnId || item.id === columnId) return;

    const column = filterableColumns.find(
      (candidate) => candidate.id === columnId,
    );
    if (!column) return;

    const variant = getColumnVariant(column, table);
    updateItem(item.filterId as string, {
      id: columnId,
      operator: getFilterOperators(variant)[0].value,
      value: getDefaultFilterValue(variant),
    });
  };

  const onItemOperatorChange = (
    item: ExtendedColumnFilter,
    variant: ColumnVariant,
    rawOperator: string | null,
  ) => {
    if (!rawOperator) return;

    const operator = rawOperator as FilterOperator;
    updateItem(item.filterId as string, {
      operator,
      value: reshapeValueOnOperatorChange({
        operator,
        variant,
        value: item.value,
      }),
    });
  };

  const activeCount = items.filter(isFilterActive).length;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="[&_svg]:size-3"
            aria-label={
              activeCount > 0 ? `Filtros, ${activeCount} ativos` : "Filtros"
            }
          />
        }
      >
        <HugeiconsIcon icon={FilterIcon} />
        Filtros
        {activeCount > 0 && (
          <Badge className="h-[1.14rem] shadow-none rounded-full aspect-square font-mono font-normal text-[0.65rem]">
            {activeCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        align="start"
        className="flex w-136 max-w-[calc(100vw-2rem)] max-h-[70vh] flex-col gap-3 overflow-y-auto p-4"
      >
        <div className="flex flex-col gap-1">
          <h4 id={titleId} className="font-medium leading-none">
            {items.length > 0 ? "Filtrar por" : "Nenhuma filtro aplicado"}
          </h4>
          <p id={descriptionId} className="text-muted-foreground text-sm">
            {items.length > 0
              ? "Gerencie as condições para filtrar os resultados."
              : "Adicione uma condição para filtrar os resultados."}
          </p>
        </div>

        <div
          data-slot="data-table-filter-list"
          className={cn("flex flex-col items-start gap-3", className)}
          {...props}
        >
          {items.map((item, index) => {
            const column = filterableColumns.find(
              (candidate) => candidate.id === item.id,
            );
            const columnLabel = column ? getColumnLabel(column) : item.id;
            const variant = column
              ? getColumnVariant(column, table)
              : ("text" as ColumnVariant);
            const operators = getFilterOperators(variant);
            const options: ColumnMetaOptions[] = column
              ? getEditorOptions(column, variant)
              : [];

            return (
              <React.Fragment key={item.filterId}>
                {index > 0 ? (
                  <JoinToggle items={items} onChange={commitItems} />
                ) : null}
                <div className="flex w-full flex-wrap items-center gap-2 rounded bg-muted border-2 shadow-sm border-border p-2">
                  <Select
                    value={item.id}
                    onValueChange={(columnId) => onColumnChange(item, columnId)}
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={`Filtra coluna ${columnLabel}`}
                    >
                      <SelectValue>
                        {() => {
                          const column = filterableColumns.find(
                            (candidate) => candidate.id === item.id,
                          );
                          return !column ? null : getColumnLabel(column);
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {filterableColumns.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {getColumnLabel(candidate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={item.operator}
                    onValueChange={(operator) =>
                      onItemOperatorChange(item, variant, operator)
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={`Operador do filtro em ${columnLabel}`}
                    >
                      <SelectValue>
                        {item.operator &&
                          operators.find(
                            (operator) => operator.value === item.operator,
                          )?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((operator) => (
                        <SelectItem key={operator.value} value={operator.value}>
                          {operator.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="min-w-0 flex-1">
                    <FilterValueEditor
                      variant={variant}
                      operator={item.operator}
                      options={options}
                      columnLabel={columnLabel}
                      value={item.value}
                      onValueChange={(value) =>
                        updateItem(item.filterId as string, { value })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover filtro em ${columnLabel}`}
                    onClick={() => removeItem(item.filterId as string)}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                  </Button>
                </div>
              </React.Fragment>
            );
          })}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={addFilter}
              disabled={!filterableColumns.length}
            >
              <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
              Adicionar filtro
            </Button>
            {items.some(isFilterActive) ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Limpar filtros"
                onClick={() => commitItems([])}
              >
                Limpar
              </Button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function JoinToggle({
  items,
  onChange,
}: {
  items: ExtendedColumnFilter[];
  onChange: (next: ExtendedColumnFilter[]) => void;
}) {
  const joinOperator = currentJoinOperator(items);

  return (
    <Button
      variant="outline"
      size="xs"
      className="text-muted-foreground font-medium"
      aria-label="Alterar tipo de operador"
      onClick={() => {
        const next: JoinOperator = joinOperator === "and" ? "or" : "and";
        onChange(items.map((item) => ({ ...item, joinOperator: next })));
      }}
    >
      {joinOperator === "and" ? "E" : "Ou"}
    </Button>
  );
}
