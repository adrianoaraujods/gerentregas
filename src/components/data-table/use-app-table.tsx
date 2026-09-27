"use client";

import {
  type AppColumnHelper,
  createTableHook,
  type RowData,
  type TableOptions,
  type TableState,
} from "@tanstack/react-table";
import type * as React from "react";

import {
  AggregatedCell,
  BooleanCell,
  DateCell,
  GroupedCell,
  MultiSelectCell,
  NumberCell,
  SelectCell,
  TextCell,
} from "./cells";
import { ColumnHeader } from "./column-header";
import type { ColumnVariant } from "./column-meta";
import { features } from "./features";
import { ResizeHandle, SelectAllHeader } from "./headers";
import { cellContext, headerContext, tableContext } from "./table-context";

const cellComponents = {
  TextCell,
  NumberCell,
  DateCell,
  BooleanCell,
  SelectCell,
  MultiSelectCell,
  GroupedCell,
  AggregatedCell,
};

const headerComponents = {
  ColumnHeader,
  ResizeHandle,
  SelectAllHeader,
};

type CellComponents = typeof cellComponents;
type HeaderComponents = typeof headerComponents;

export type { CellComponents, HeaderComponents };

const VARIANT_CELL: Record<ColumnVariant, React.ComponentType> = {
  text: cellComponents.TextCell,
  number: cellComponents.NumberCell,
  date: cellComponents.DateCell,
  boolean: cellComponents.BooleanCell,
  select: cellComponents.SelectCell,
  "multi-select": cellComponents.MultiSelectCell,
};

/**
 * Fills in the variant-derived default `cell`/`header` when the column does not
 * already override them, so a column with `meta.variant` renders the right Cell
 * Renderer and `ColumnHeader` without boilerplate.
 */
function bindVariant<
  T extends {
    meta?: { variant?: ColumnVariant };
    cell?: unknown;
    header?: unknown;
    groupedCell?: unknown;
    aggregatedCell?: unknown;
  },
>(def: T): T {
  const variant = def.meta?.variant;
  if (!variant) return def;

  const next = { ...def };
  if (next.cell == null) {
    const Cell = VARIANT_CELL[variant];
    next.cell = () => <Cell />;
  }
  if (next.header == null) {
    next.header = () => <ColumnHeader />;
  }
  if (next.groupedCell == null) {
    next.groupedCell = () => <GroupedCell />;
  }
  if (next.aggregatedCell == null) {
    next.aggregatedCell = () => <AggregatedCell />;
  }
  return next as T;
}

const baseTableHook = createTableHook<
  typeof features,
  Record<string, never>,
  CellComponents,
  HeaderComponents
>({
  features,
  tableContext,
  cellContext,
  headerContext,
  defaultColumn: {
    size: 120,
    minSize: 60,
    maxSize: 800,
    filterFn: "dynamic",
  },
  globalFilterFn: "fuzzy",
  columnResizeMode: "onChange",
  cellComponents,
  headerComponents,
});

/**
 * Column helper pre-bound to the app feature bundle and component registries,
 * with `meta.variant` auto-binding to the default Cell Renderer + `ColumnHeader`.
 * Binding is applied per-method and idempotent, so columns produced by
 * `accessor`/`display`/`group` (already bound) are unchanged when passed through
 * `columns`.
 */
function createAppColumnHelper<TData extends RowData>(): AppColumnHelper<
  typeof features,
  TData,
  CellComponents,
  HeaderComponents
> {
  const helper = baseTableHook.createAppColumnHelper<TData>();

  return {
    accessor: ((
      accessor: Parameters<typeof helper.accessor>[0],
      column: Parameters<typeof helper.accessor>[1],
    ) =>
      helper.accessor(accessor, bindVariant(column))) as typeof helper.accessor,
    display: ((column: Parameters<typeof helper.display>[0]) =>
      helper.display(bindVariant(column))) as typeof helper.display,
    group: ((column: Parameters<typeof helper.group>[0]) =>
      helper.group(bindVariant(column))) as typeof helper.group,
    columns: ((columns: Parameters<typeof helper.columns>[0]) =>
      helper.columns(
        columns.map((c) => bindVariant(c)) as Parameters<
          typeof helper.columns
        >[0],
      )) as typeof helper.columns,
  };
}

const {
  useAppTable: rawUseAppTable,
  useTableContext,
  useCellContext,
  useHeaderContext,
} = baseTableHook;

/**
 * Wraps `useAppTable` so the row-selection column (`id: "select"` by default)
 * is rendered first out of the box. We inject it at the front of
 * `initialState.columnOrder` (rather than pinning) so it stays first while
 * every other column keeps its natural order. Respects any consumer-provided
 * `columnOrder`: if the selection id is already present we leave it untouched.
 */
function useAppTable<
  TData extends RowData,
  TSelected = TableState<typeof features>,
>(
  options: Omit<TableOptions<typeof features, TData>, "features"> & {
    selectColumnId?: string;
  },
  selector?: (state: TableState<typeof features>) => TSelected,
) {
  const { selectColumnId = "select", ...restOptions } = options;
  const existingOrder = restOptions.initialState?.columnOrder ?? [];
  const columnOrder = existingOrder.includes(selectColumnId)
    ? existingOrder
    : [selectColumnId, ...existingOrder];
  const initialState = {
    ...restOptions.initialState,
    columnOrder,
  };

  return rawUseAppTable({ ...restOptions, initialState }, selector);
}

export {
  createAppColumnHelper,
  useAppTable,
  useCellContext,
  useHeaderContext,
  useTableContext,
};
