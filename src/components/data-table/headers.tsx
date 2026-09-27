"use client";

import { Subscribe } from "@tanstack/react-table";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import {
  useCellContext,
  useHeaderContext,
  useTableContext,
} from "./table-context";

export function SelectAllHeader(): React.ReactNode {
  const table = useTableContext();

  return (
    <Subscribe source={table.atoms.rowSelection}>
      {() => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          indeterminate={
            !table.getIsAllRowsSelected() && table.getIsSomeRowsSelected()
          }
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label="Select all"
        />
      )}
    </Subscribe>
  );
}

export function RowSelectCell(): React.ReactNode {
  const cell = useCellContext();
  const table = useTableContext();
  const row = cell.row;

  return (
    <Subscribe source={table.atoms.rowSelection}>
      {() => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      )}
    </Subscribe>
  );
}

export function ResizeHandle(): React.ReactNode {
  const header = useHeaderContext();
  const table = useTableContext();

  if (!header.column.getCanResize()) return null;

  return (
    <Subscribe source={table.atoms.columnResizing}>
      {() => (
        // biome-ignore lint/a11y/noStaticElementInteractions: resize handle needs pointer/touch drag handlers
        <div
          onDoubleClick={() => header.column.resetSize()}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={cn(
            "absolute right-[-2px] z-10 top-1/2 h-6 w-[3px] -translate-y-1/2 cursor-col-resize select-none touch-none rounded-md transition-colors hover:bg-primary before:absolute before:left-[-4px] before:right-[-4px] before:top-0 before:h-full before:content-['']",
            header.column.getIsResizing() && "bg-primary",
          )}
        />
      )}
    </Subscribe>
  );
}
