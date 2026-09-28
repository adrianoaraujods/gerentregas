"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Row actions cell: collapses all row actions into a single kebab-style
 * dropdown aligned with the right-aligned "Ações" column header.
 */
function RowActions({
  label = "Ações",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label={label} />}
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-40">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function RowActionsItem({
  icon: Icon,
  label,
  variant = "default",
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "default" | "destructive";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <DropdownMenuItem variant={variant} disabled={disabled} onClick={onClick}>
      <Icon className="size-4 shrink-0" />
      {label}
    </DropdownMenuItem>
  );
}

export { RowActions, RowActionsItem };
