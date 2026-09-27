import type { CellData, RowData, TableFeatures } from "@tanstack/react-table";

export type ColumnVariant =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "multi-select";

export interface ColumnMetaOptions {
  label: string;
  value: string;
  count?: number;
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    label?: string;
    variant?: ColumnVariant;
    options?: ColumnMetaOptions[];
  }
}
