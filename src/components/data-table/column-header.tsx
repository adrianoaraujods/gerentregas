"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  EyeOffIcon,
  FilterIcon,
  GroupIcon,
  UngroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Subscribe } from "@tanstack/react-table";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  FilterValueEditor,
  getColumnVariant,
  getEditorOptions,
  getTableColumnFilters,
  isEmptyOperator,
  reshapeValueOnOperatorChange,
  toEditorValue,
} from "./filter-editors";
import {
  type ExtendedColumnFilter,
  type FilterOperator,
  getFilterOperators,
} from "./filter-logic";
import { useHeaderContext, useTableContext } from "./table-context";

type TableColumn = ReturnType<typeof useHeaderContext>["column"];
type TableInstance = ReturnType<typeof useTableContext>;

function ColumnFilterEditor({
  column,
  table,
  onClose,
}: {
  column: TableColumn;
  table: TableInstance;
  onClose: () => void;
}) {
  const columnLabel = column.columnDef.meta?.label ?? column.id;
  const variant = getColumnVariant(column, table);
  const operators = getFilterOperators(variant);
  const options = getEditorOptions(column, variant);

  const existing = getTableColumnFilters(table)?.find(
    (filter) => filter.id === column.id,
  );

  const [filter, setFilter] = React.useState<ExtendedColumnFilter>(() => ({
    id: column.id,
    value:
      variant === "multi-select"
        ? Array.isArray(existing?.value)
          ? existing.value
          : []
        : ((toEditorValue(variant, existing?.value) ?? "") as
            | string
            | string[]),
    operator: (existing?.operator ?? operators[0].value) as FilterOperator,
  }));

  const commit = React.useCallback(
    (next: ExtendedColumnFilter) => {
      const rest = getTableColumnFilters(table).filter(
        (filter) => filter.id !== column.id,
      );

      const isEmptyOp = isEmptyOperator(next.operator);
      const isBlank =
        next.value === "" ||
        (Array.isArray(next.value) && next.value.length === 0);

      if (isEmptyOp || !isBlank) {
        table.setColumnFilters([...rest, next]);
      } else {
        table.setColumnFilters(rest);
      }
    },
    [column.id, table],
  );

  const onOperatorChange = (operator: string | null) => {
    if (!operator) return;
    const op = operator as FilterOperator;
    setFilter({
      ...filter,
      operator: op,
      value: reshapeValueOnOperatorChange({
        operator: op,
        variant,
        value: filter.value,
      }),
    });
  };

  const onValueChange = (value: unknown) => {
    setFilter({ ...filter, value });
  };

  const onConfirm = () => {
    commit(filter);
    onClose();
  };

  return (
    <div className="flex w-64 flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Filtrar por {columnLabel}</span>
        {existing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-muted-foreground text-xs"
            aria-label={`Limpar filtro em ${columnLabel}`}
            onClick={() => {
              table.setColumnFilters(
                getTableColumnFilters(table).filter((f) => f.id !== column.id),
              );
              onClose();
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      <FilterValueEditor
        variant={variant}
        operator={filter.operator}
        options={options}
        columnLabel={columnLabel}
        value={filter.value}
        onValueChange={onValueChange}
      />

      <Select value={filter.operator} onValueChange={onOperatorChange}>
        <SelectTrigger size="sm" aria-label="Selecionar operador do filtro">
          <SelectValue>
            {operators.find((op) => op.value === filter.operator)?.label}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={`Cancelar filtro por ${columnLabel}`}
        >
          Cancelar
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={onConfirm}
          aria-label={`Aplicar filtro por ${columnLabel} filter`}
        >
          Filtrar
        </Button>
      </div>
    </div>
  );
}

export function ColumnHeader({
  title,
  className,
}: {
  title?: string;
  className?: string;
}): React.ReactNode {
  const header = useHeaderContext();
  const table = useTableContext();
  const column = header.column;

  const displayTitle = column.columnDef.meta?.label ?? title ?? column.id;

  const canSort = column.getCanSort();
  const canHide = column.getCanHide();
  const canGroup = column.getCanGroup();
  const canFilter = column.getCanFilter();

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);

  if (!canSort && !canHide && !canGroup && !canFilter) {
    return <div className={cn(className)}>{displayTitle}</div>;
  }

  const openFilter = () => {
    setMenuOpen(false);
    setFilterOpen(true);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Subscribe
        source={table.store}
        selector={(s) => ({
          sorting: s.sorting,
          grouping: s.grouping,
        })}
      >
        {() => {
          const sorted = canSort ? column.getIsSorted() : false;
          const grouped = canGroup ? column.getIsGrouped() : false;

          return (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger
                render={
                  <Button
                    ref={triggerRef}
                    variant="ghost"
                    size="sm"
                    className="group w-full p-0"
                  />
                }
              >
                <span>{displayTitle}</span>
                {sorted === "desc" ? (
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className="ml-2 size-4"
                  />
                ) : sorted === "asc" ? (
                  <HugeiconsIcon icon={ArrowUp01Icon} className="ml-2 size-4" />
                ) : canSort ? (
                  <HugeiconsIcon
                    icon={ArrowUpDownIcon}
                    className="ml-2 size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[state=open]:opacity-100"
                  />
                ) : null}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {canSort && (
                  <>
                    <DropdownMenuItem
                      onClick={() => column.toggleSorting(false)}
                    >
                      <HugeiconsIcon
                        icon={ArrowUp01Icon}
                        className="mr-2 size-3.5 text-muted-foreground/70"
                      />
                      Ordem crescente
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => column.toggleSorting(true)}
                    >
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        className="mr-2 size-3.5 text-muted-foreground/70"
                      />
                      Ordem decrescente
                    </DropdownMenuItem>
                  </>
                )}
                {canGroup && (
                  <>
                    {canSort ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem
                      onClick={column.getToggleGroupingHandler()}
                    >
                      {grouped ? (
                        <>
                          <HugeiconsIcon
                            icon={UngroupIcon}
                            className="mr-2 size-3.5 text-muted-foreground/70"
                          />
                          Desagrupar
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon
                            icon={GroupIcon}
                            className="mr-2 size-3.5 text-muted-foreground/70"
                          />
                          Agrupar
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
                {canHide && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => column.toggleVisibility(false)}
                    >
                      <HugeiconsIcon
                        icon={EyeOffIcon}
                        className="mr-2 size-3.5 text-muted-foreground/70"
                      />
                      Esconder coluna
                    </DropdownMenuItem>
                  </>
                )}
                {canFilter && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={openFilter}>
                      <HugeiconsIcon
                        icon={FilterIcon}
                        className="mr-2 size-3.5 text-muted-foreground/70"
                      />
                      Filtrar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }}
      </Subscribe>
      {filterOpen ? (
        <FilterPopoverBridge
          column={column}
          table={table}
          triggerRef={triggerRef}
          open={filterOpen}
          onOpenChange={setFilterOpen}
        />
      ) : null}
    </div>
  );
}

// Bridges the controlled Popover anchored to the header trigger so the Filter
// entry can open the editor after the dropdown closes.
function FilterPopoverBridge({
  column,
  table,
  triggerRef,
  open,
  onOpenChange,
}: {
  column: TableColumn;
  table: TableInstance;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent anchor={triggerRef} align="start" className="w-auto p-3">
        <ColumnFilterEditor
          column={column}
          table={table}
          onClose={() => onOpenChange(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
