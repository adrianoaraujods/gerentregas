import type * as React from "react";

type LabelledColumn = {
  id: string;
  columnDef: {
    meta?: { label?: string };
  };
};

export function getColumnLabel(
  column: LabelledColumn,
  fallback?: string,
): string {
  return column.columnDef.meta?.label ?? fallback ?? column.id;
}

// Releases pointer capture so dnd-kit sensors and popover/select triggers do
// not fight over mouse interactions inside a drag context.
export function releasePointerCapture(event: React.PointerEvent<HTMLElement>) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
  }

  if (
    event.button === 0 &&
    event.ctrlKey === false &&
    event.pointerType === "mouse" &&
    !(target instanceof HTMLInputElement)
  ) {
    event.preventDefault();
  }
}
