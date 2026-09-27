"use client";

import { ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { flexRender, Subscribe } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { parseISODate } from "@/lib/dates";
import { formatDate } from "@/lib/formatter";
import type { ColumnMetaOptions } from "./column-meta";
import { useCellContext, useTableContext } from "./table-context";

function toDateValue(value: string | Date | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return parseISODate(value) ?? undefined;
}

function resolveOptionLabel(
  options: ColumnMetaOptions[] | undefined,
  value: string,
): string {
  return options?.find((option) => option.value === value)?.label ?? value;
}

export function TextCell(): React.ReactNode {
  const cell = useCellContext<string | undefined>();
  const value = cell.getValue();
  return value == null ? null : String(value);
}

export function NumberCell(): React.ReactNode {
  const cell = useCellContext<number | undefined>();
  const value = cell.getValue();
  if (value == null || Number.isNaN(value)) return null;
  return <span>{new Intl.NumberFormat().format(value)}</span>;
}

export function DateCell(): React.ReactNode {
  const cell = useCellContext<string | Date | undefined>();
  const value = cell.getValue();
  const formatted = formatDate(toDateValue(value));
  return formatted ? formatted : null;
}

export function BooleanCell(): React.ReactNode {
  const cell = useCellContext<boolean | undefined>();
  const value = cell.getValue();
  return <Checkbox checked={!!value} disabled aria-label="Boolean value" />;
}

export function SelectCell(): React.ReactNode {
  const cell = useCellContext<string | undefined>();
  const value = cell.getValue();
  if (value == null || value === "") return null;
  const options = cell.column.columnDef.meta?.options;
  const label = resolveOptionLabel(options, String(value));
  return <Badge variant="secondary">{label}</Badge>;
}

export function MultiSelectCell(): React.ReactNode {
  const cell = useCellContext<string[] | undefined>();
  const value = cell.getValue();
  if (!Array.isArray(value) || value.length === 0) return null;
  const options = cell.column.columnDef.meta?.options;
  return (
    <div className="flex flex-wrap gap-1">
      {value.map((item) => (
        <Badge key={item} variant="secondary">
          {resolveOptionLabel(options, String(item))}
        </Badge>
      ))}
    </div>
  );
}

export function GroupedCell(): React.ReactNode {
  const cell = useCellContext();
  const table = useTableContext();
  const row = cell.row;

  return (
    <Subscribe source={table.atoms.expanded}>
      {() => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-7 gap-1 px-2"
          onClick={row.getToggleExpandedHandler()}
          disabled={!row.getCanExpand()}
          style={{
            paddingLeft: `calc(${row.depth} * 1.5rem + 0.5rem)`,
          }}
        >
          {row.getIsExpanded() ? (
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
          ) : (
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          )}
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
          <span className="text-muted-foreground">({row.subRows.length})</span>
        </Button>
      )}
    </Subscribe>
  );
}

export function AggregatedCell(): React.ReactNode {
  const cell = useCellContext();
  const value = cell.getValue();
  const rowCount = cell.row.getLeafRows().length;
  return (
    <span className="text-muted-foreground">
      {value == null ? "" : String(value)} ({rowCount})
    </span>
  );
}
