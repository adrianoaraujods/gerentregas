"use client";

import {
  Faceted,
  FacetedBadgeList,
  FacetedContent,
  FacetedGroup,
  FacetedInput,
  FacetedItem,
  FacetedList,
  FacetedTrigger,
} from "@/components/ui/faceted";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ColumnMetaOptions, ColumnVariant } from "./column-meta";
import type { ExtendedColumnFilter, FilterOperator } from "./filter-logic";

type EditorColumn = {
  id: string;
  columnDef: {
    meta?: { variant?: ColumnVariant; options?: ColumnMetaOptions[] };
  };
  getFacetedUniqueValues: () => Map<unknown, number>;
};

type EditorTable = {
  getPreFilteredRowModel: () => {
    flatRows: Array<{ getValue: (columnId: string) => unknown }>;
  };
};

export function getColumnVariant(
  column: EditorColumn,
  table: EditorTable,
): ColumnVariant {
  const metaVariant = column.columnDef.meta?.variant;
  if (metaVariant) return metaVariant;

  const firstValue = table
    .getPreFilteredRowModel()
    .flatRows[0]?.getValue(column.id);
  if (Array.isArray(firstValue)) return "multi-select";
  if (typeof firstValue === "number") return "number";
  if (firstValue instanceof Date) return "date";
  if (typeof firstValue === "boolean") return "boolean";
  return "text";
}

export function getColumnOptions(column: EditorColumn): ColumnMetaOptions[] {
  const customOptions = column.columnDef.meta?.options;
  if (customOptions) return customOptions;

  const uniqueValues = column.getFacetedUniqueValues();
  return Array.from(uniqueValues.entries()).map((entry) => {
    const [value, count] = entry as [unknown, number];
    return {
      label: String(value),
      value: String(value),
      count,
    };
  });
}

export const booleanOptions: ColumnMetaOptions[] = [
  { label: "True", value: "true" },
  { label: "False", value: "false" },
];

export function toStoredValue(variant: ColumnVariant, raw: unknown): unknown {
  if (variant === "boolean") return raw === "true";
  return raw;
}

export function toEditorValue(
  variant: ColumnVariant,
  stored: unknown,
): unknown {
  if (variant === "boolean") {
    if (stored === true) return "true";
    if (stored === false) return "false";
    return "";
  }
  return stored;
}

export function getDefaultFilterValue(variant: ColumnVariant): unknown {
  if (variant === "multi-select") return [];
  return "";
}

export function isRangeOperator(operator: FilterOperator | undefined): boolean {
  return operator === "inRange";
}

export function isEmptyOperator(operator: FilterOperator | undefined): boolean {
  return operator === "isEmpty" || operator === "isNotEmpty";
}

export function getTableColumnFilters(table: {
  state: unknown;
}): ExtendedColumnFilter[] {
  const state = table.state as {
    columnFilters?: ExtendedColumnFilter[];
  } | null;
  return state?.columnFilters ?? [];
}

export function getEditorOptions(
  column: EditorColumn,
  variant: ColumnVariant,
): ColumnMetaOptions[] {
  if (variant === "boolean") return booleanOptions;
  return getColumnOptions(column);
}

// Adapts the stored value when the operator changes: range operators need a
// [min, max] pair, scalar operators take the pair's lower bound back.
export function reshapeValueOnOperatorChange({
  operator,
  variant,
  value,
}: {
  operator: FilterOperator;
  variant: ColumnVariant;
  value: unknown;
}): unknown {
  if (isRangeOperator(operator) && !Array.isArray(value)) {
    return [value ?? "", ""];
  }
  if (!isRangeOperator(operator) && Array.isArray(value)) {
    if (variant !== "multi-select") {
      return value[0] ?? "";
    }
  }
  return value;
}

function renderFacetedItems(options: ColumnMetaOptions[]) {
  return (
    <FacetedGroup>
      {options.map((option) => (
        <FacetedItem key={option.value} value={option.value}>
          <span>{option.label}</span>
          {option.count != null && (
            <span className="ml-auto flex size-4 items-center justify-center font-mono text-xs">
              {option.count}
            </span>
          )}
        </FacetedItem>
      ))}
    </FacetedGroup>
  );
}

interface RangeEditorProps {
  type: "number" | "date";
  columnLabel: string;
  value: unknown;
  onValueChange: (value: unknown) => void;
}

function RangeEditor({
  type,
  columnLabel,
  value,
  onValueChange,
}: RangeEditorProps) {
  const range = Array.isArray(value) ? value : [value ?? "", ""];
  const [min, max] = range as [string | number, string | number];

  const labels =
    type === "number"
      ? ({
          min: `Valor mínimo de ${columnLabel}`,
          max: `Valor máximo de ${columnLabel}`,
          minPlaceholder: "Min",
          maxPlaceholder: "Max",
        } as const)
      : ({
          min: `Data inicial de ${columnLabel}`,
          max: `Data final de ${columnLabel}`,
          minPlaceholder: "",
          maxPlaceholder: "",
        } as const);

  const parse = (raw: string) => {
    if (type === "number") return raw === "" ? "" : Number(raw);
    return raw;
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type={type}
        aria-label={labels.min}
        placeholder={labels.minPlaceholder}
        className="h-8"
        value={min ?? ""}
        onChange={(event) =>
          onValueChange([parse(event.target.value), max ?? ""])
        }
      />
      <Input
        type={type}
        aria-label={labels.max}
        placeholder={labels.maxPlaceholder}
        className="h-8"
        value={max ?? ""}
        onChange={(event) =>
          onValueChange([min ?? "", parse(event.target.value)])
        }
      />
    </div>
  );
}

interface FilterValueEditorProps {
  variant: ColumnVariant;
  operator: FilterOperator | undefined;
  options: ColumnMetaOptions[];
  columnLabel: string;
  value: unknown;
  onValueChange: (value: unknown) => void;
}

export function FilterValueEditor({
  variant,
  operator,
  options,
  columnLabel,
  value,
  onValueChange,
}: FilterValueEditorProps) {
  if (isEmptyOperator(operator)) {
    return (
      <div
        role="status"
        aria-label={`${columnLabel} filter is ${
          operator === "isEmpty" ? "vázio" : "não vázio"
        }`}
        className="h-8 w-full rounded-md border border-dashed"
      />
    );
  }

  const isRange = isRangeOperator(operator);

  switch (variant) {
    case "select":
      return (
        <Faceted
          value={typeof value === "string" ? value : undefined}
          onValueChange={onValueChange}
        >
          <FacetedTrigger>
            <FacetedBadgeList
              options={options}
              placeholder={`Selecionar ${columnLabel}...`}
            />
          </FacetedTrigger>
          <FacetedContent>
            <FacetedInput placeholder={`Pesquisar ${columnLabel}...`} />
            <FacetedList>{renderFacetedItems(options)}</FacetedList>
          </FacetedContent>
        </Faceted>
      );
    case "multi-select":
      return (
        <Faceted
          multiple
          value={Array.isArray(value) ? value : []}
          onValueChange={onValueChange}
        >
          <FacetedTrigger>
            <FacetedBadgeList
              options={options}
              placeholder={`Selecionar ${columnLabel}...`}
            />
          </FacetedTrigger>
          <FacetedContent>
            <FacetedInput placeholder={`Pesquisar ${columnLabel}...`} />
            <FacetedList>{renderFacetedItems(options)}</FacetedList>
          </FacetedContent>
        </Faceted>
      );
    case "boolean":
      return (
        <Select
          value={(toEditorValue("boolean", value) as string) ?? ""}
          onValueChange={(raw) => onValueChange(toStoredValue("boolean", raw))}
        >
          <SelectTrigger
            size="sm"
            aria-label={`Valor do filtro de ${columnLabel}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {booleanOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "number":
      if (isRange) {
        return (
          <RangeEditor
            type="number"
            columnLabel={columnLabel}
            value={value}
            onValueChange={onValueChange}
          />
        );
      }
      return (
        <Input
          type="number"
          aria-label={`Valor do filtro de ${columnLabel}`}
          value={(value as string) ?? ""}
          placeholder="Digite um número..."
          className="h-8"
          onChange={(event) =>
            onValueChange(
              event.target.value === "" ? "" : Number(event.target.value),
            )
          }
        />
      );
    case "date":
      if (operator === "isRelativeToToday") {
        return (
          <Input
            type="number"
            aria-label={`Intervalo de ${columnLabel} em dias`}
            value={(value as string | number) ?? ""}
            placeholder="Intervalo em dias..."
            className="h-8"
            onChange={(event) =>
              onValueChange(
                event.target.value === "" ? "" : Number(event.target.value),
              )
            }
          />
        );
      }
      if (isRange) {
        return (
          <RangeEditor
            type="date"
            columnLabel={columnLabel}
            value={value}
            onValueChange={onValueChange}
          />
        );
      }
      return (
        <Input
          type="date"
          aria-label={`Filtrar ${columnLabel}`}
          value={(value as string) ?? ""}
          className="h-8"
          onChange={(event) => onValueChange(event.target.value)}
        />
      );
    default:
      return (
        <Input
          type="text"
          aria-label={`Valor do filtro de ${columnLabel}`}
          value={(value as string) ?? ""}
          placeholder={`Pesquisar ${columnLabel}...`}
          className="h-8"
          onChange={(event) => onValueChange(event.target.value)}
        />
      );
  }
}
