import { createRouter, managerProcedure } from "@/server/api";
import type { Database } from "@/server/db";
import { DashboardController } from "./dashboard.controller";
import { DashboardRepository } from "./dashboard.repository";
import { DashboardService } from "./dashboard.service";
import {
  aggregationOutputSchema,
  csvExportOutputSchema,
  drilldownOutputSchema,
  getAggregationInputSchema,
  standardWorkdayDurationSchema,
} from "./dashboard.types";

function createController(db: Database) {
  return new DashboardController(
    new DashboardService(new DashboardRepository(db)),
  );
}

export const dashboardRouter = createRouter({
  getAggregation: managerProcedure
    .input(getAggregationInputSchema)
    .query(({ ctx: { db }, input }) =>
      createController(db)
        .getAggregation(input)
        .then(aggregationOutputSchema.parse),
    ),

  getDrilldown: managerProcedure
    .input(getAggregationInputSchema)
    .query(({ ctx: { db }, input }) =>
      createController(db)
        .getDrilldown(input)
        .then(drilldownOutputSchema.parse),
    ),

  exportCSV: managerProcedure
    .input(getAggregationInputSchema)
    .query(({ ctx: { db }, input }) =>
      createController(db).exportCSV(input).then(csvExportOutputSchema.parse),
    ),

  getStandardWorkdayDuration: managerProcedure.query(({ ctx: { db } }) =>
    createController(db)
      .getStandardWorkdayDuration()
      .then(standardWorkdayDurationSchema.parse),
  ),
});
