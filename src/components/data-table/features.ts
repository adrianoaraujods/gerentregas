import {
  aggregationFn_mean,
  aggregationFn_min,
  columnFacetingFeature,
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createGroupedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowAggregationFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

import { dynamicFilterFn, fuzzyFilter } from "./filter-logic";

const featureConfig = {
  rowAggregationFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowExpandingFeature,
  columnFilteringFeature,
  columnFacetingFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnGroupingFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  groupedRowModel: createGroupedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  filterFns: { fuzzy: fuzzyFilter, dynamic: dynamicFilterFn },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  aggregationFns: {
    mean: aggregationFn_mean,
    min: aggregationFn_min,
  },
};

type FeatureConfig = typeof featureConfig;

function definedOnly<T extends Record<string, unknown>>(config: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value != null),
  ) as Partial<T>;
}

export const features = tableFeatures(
  definedOnly(featureConfig) as FeatureConfig,
);
