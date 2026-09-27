"use client";

import { createTableHookContexts } from "@tanstack/react-table";

import type { features } from "./features";

export const {
  tableContext,
  cellContext,
  headerContext,
  useTableContext,
  useCellContext,
  useHeaderContext,
} = createTableHookContexts<typeof features>();
