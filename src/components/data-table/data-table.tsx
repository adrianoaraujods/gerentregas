"use client";

import {
  type AppReactTable,
  type Cell,
  type CellData,
  flexRender,
  type Header,
  type RowData,
  type TableState,
} from "@tanstack/react-table";
import type * as React from "react";

import { cn } from "@/lib/utils";

import type { features } from "./features";
import { DataTablePagination } from "./pagination";
import { DataTableToolbar } from "./toolbar";
import type { CellComponents, HeaderComponents } from "./use-app-table";

type AppTableInstance<TData extends RowData> = AppReactTable<
  typeof features,
  TData,
  TableState<typeof features>,
  Record<string, never>,
  CellComponents,
  HeaderComponents
>;

export interface DataTableProps<TData extends RowData = RowData>
  extends React.ComponentProps<"div"> {
  table: AppTableInstance<TData>;
  /** Replace the default toolbar. Pass `null` to hide it. */
  toolbar?: React.ReactNode | null;
  /** Show the default toolbar (search + filter + sort + view options). */
  showToolbar?: boolean;
  /** Show the pagination footer. */
  showPagination?: boolean;
  /** Props forwarded to the default `DataTableToolbar`. */
  toolbarProps?: Omit<
    React.ComponentProps<typeof DataTableToolbar>,
    "table" | "children"
  >;
  /** Extra classes for the scroll container wrapping the `<table>`. */
  tableClassName?: string;
}

/**
 * Batteries-included Excel/Sheets-style grid. Renders a sticky header with
 * per-column dropdowns, a body with resizing styles and the variant
 * Cell Renderers (incl. `GroupedCell`/`AggregatedCell` under grouping), the
 * default toolbar, and pagination — all from any TanStack Table instance
 * produced by `useAppTable`.
 */
export function DataTable<TData extends RowData = RowData>({
  table,
  toolbar,
  showToolbar = true,
  showPagination = true,
  toolbarProps,
  tableClassName,
  className,
  ...props
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;

  return (
    <div
      data-slot="data-table"
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    >
      {showToolbar
        ? toolbar !== null
          ? (toolbar ?? <DataTableToolbar table={table} {...toolbarProps} />)
          : null
        : null}

      <div className="relative w-full overflow-auto rounded-md border">
        <table.AppTable>
          <table
            data-slot="data-table-grid"
            className={cn("w-full caption-bottom text-sm", tableClassName)}
          >
            <thead className="[&_tr]:border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <table.AppHeader key={header.id} header={header}>
                      {(h) => {
                        const column = header.column;
                        return (
                          <th
                            colSpan={header.colSpan}
                            className={cn(
                              "bg-background sticky top-0 z-20 h-10 px-2 text-left align-middle font-medium whitespace-nowrap",
                              "border-b border-r last:border-r-0",
                            )}
                            style={{ width: `${column.getSize()}px` }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                            <h.ResizeHandle />
                          </th>
                        );
                      }}
                    </table.AppHeader>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const column = cell.column;
                      return (
                        <table.AppCell key={cell.id} cell={cell}>
                          {(c) => (
                            <td
                              className={cn(
                                "px-2 py-1.5 align-middle whitespace-nowrap",
                                "border-r last:border-r-0",
                              )}
                              style={{ width: `${column.getSize()}px` }}
                            >
                              <c.FlexRender />
                            </td>
                          )}
                        </table.AppCell>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum resultado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </table.AppTable>
      </div>

      {showPagination ? <DataTablePagination table={table} /> : null}
    </div>
  );
}

/**
 * Manual-composition wrappers around the per-instance `table.AppTable` /
 * `table.AppHeader` / `table.AppCell` context components. Use these (with a
 * `useAppTable` instance) to build a custom grid layout instead of the
 * batteries-included `<DataTable>`.
 */
export function AppTable<TData extends RowData = RowData>({
  table,
  children,
}: {
  table: AppTableInstance<TData>;
  children: React.ReactNode;
}): React.ReactNode {
  return <table.AppTable>{children}</table.AppTable>;
}

export function AppHeader<TData extends RowData = RowData>({
  table,
  header,
  children,
}: {
  table: AppTableInstance<TData>;
  header: Header<typeof features, TData, CellData>;
  children: (
    header: Header<typeof features, TData, CellData> &
      HeaderComponents & {
        FlexRender: () => React.ReactNode;
      },
  ) => React.ReactNode;
}): React.ReactNode {
  return (
    <table.AppHeader header={header}>{(h) => children(h)}</table.AppHeader>
  );
}

export function AppCell<TData extends RowData = RowData>({
  table,
  cell,
  children,
}: {
  table: AppTableInstance<TData>;
  cell: Cell<typeof features, TData, CellData>;
  children: (
    cell: Cell<typeof features, TData, CellData> &
      CellComponents & {
        FlexRender: () => React.ReactNode;
      },
  ) => React.ReactNode;
}): React.ReactNode {
  return <table.AppCell cell={cell}>{(c) => children(c)}</table.AppCell>;
}
