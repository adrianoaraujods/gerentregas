import { z } from "zod";

export const periodTypeEnum = z.enum(["day", "month", "custom"]);
export type PeriodType = z.infer<typeof periodTypeEnum>;

export const getAggregationInputSchema = z.object({
  periodType: periodTypeEnum,
  date: z.iso.datetime({ local: true }).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  dateFrom: z.iso.datetime({ local: true }).optional(),
  dateTo: z.iso.datetime({ local: true }).optional(),
});
export type GetAggregationInput = z.infer<typeof getAggregationInputSchema>;

export const dayTimelineStopSchema = z.object({
  stopId: z.string().uuid(),
  order: z.string(),
  pointId: z.string().uuid(),
  pointName: z.string(),
  address: z.string(),
  arrivalTime: z.iso.datetime({ local: true }).nullable(),
  departureTime: z.iso.datetime({ local: true }).nullable(),
  dwellMinutes: z.number().nonnegative(),
  startHour: z.number().min(0).max(24),
  dwellHours: z.number().nonnegative(),
  workdayPercentage: z.number().nonnegative(),
});
export type DayTimelineStop = z.infer<typeof dayTimelineStopSchema>;

export const dailyAggregationSchema = z.object({
  date: z.iso.datetime({ local: true }),
  totalDwellMinutes: z.number().nonnegative(),
  stopsCount: z.number().int().nonnegative(),
  workdayPercentage: z.number().nonnegative(),
});
export type DailyAggregation = z.infer<typeof dailyAggregationSchema>;

export const monthlyAggregationSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  days: z.array(dailyAggregationSchema),
  totalDwellMinutes: z.number().nonnegative(),
  workdayPercentage: z.number().nonnegative(),
});
export type MonthlyAggregation = z.infer<typeof monthlyAggregationSchema>;

export const customAggregationSchema = z.object({
  dateFrom: z.iso.datetime({ local: true }),
  dateTo: z.iso.datetime({ local: true }),
  days: z.array(dailyAggregationSchema),
  totalDwellMinutes: z.number().nonnegative(),
  workdayPercentage: z.number().nonnegative(),
});
export type CustomAggregation = z.infer<typeof customAggregationSchema>;

export const aggregationOutputSchema = z.discriminatedUnion("periodType", [
  z.object({
    periodType: z.literal("day"),
    date: z.iso.datetime({ local: true }),
    stops: z.array(dayTimelineStopSchema),
    totalDwellMinutes: z.number().nonnegative(),
    workdayPercentage: z.number().nonnegative(),
  }),
  z.object({
    periodType: z.literal("month"),
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    days: z.array(dailyAggregationSchema),
    totalDwellMinutes: z.number().nonnegative(),
    workdayPercentage: z.number().nonnegative(),
  }),
  z.object({
    periodType: z.literal("custom"),
    dateFrom: z.iso.datetime({ local: true }),
    dateTo: z.iso.datetime({ local: true }),
    days: z.array(dailyAggregationSchema),
    totalDwellMinutes: z.number().nonnegative(),
    workdayPercentage: z.number().nonnegative(),
  }),
]);
export type AggregationOutput = z.infer<typeof aggregationOutputSchema>;

export const drilldownInputSchema = z.object({
  periodType: periodTypeEnum,
  date: z.iso.datetime({ local: true }).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  dateFrom: z.iso.datetime({ local: true }).optional(),
  dateTo: z.iso.datetime({ local: true }).optional(),
});
export type DrilldownInput = z.infer<typeof drilldownInputSchema>;

export const drilldownStopSchema = z.object({
  routeId: z.string().uuid(),
  driverId: z.string().uuid(),
  driverName: z.string(),
  stopId: z.string().uuid(),
  order: z.string(),
  pointId: z.string().uuid(),
  pointName: z.string(),
  address: z.string(),
  arrivalTime: z.iso.datetime({ local: true }).nullable(),
  departureTime: z.iso.datetime({ local: true }).nullable(),
  dwellMinutes: z.number().nonnegative(),
  workdayPercentage: z.number().nonnegative(),
});
export type DrilldownStop = z.infer<typeof drilldownStopSchema>;

export const drilldownOutputSchema = z.object({
  stops: z.array(drilldownStopSchema),
  totalDwellMinutes: z.number().nonnegative(),
  workdayPercentage: z.number().nonnegative(),
});
export type DrilldownOutput = z.infer<typeof drilldownOutputSchema>;

export const csvExportInputSchema = z.object({
  periodType: periodTypeEnum,
  date: z.iso.datetime({ local: true }).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  dateFrom: z.iso.datetime({ local: true }).optional(),
  dateTo: z.iso.datetime({ local: true }).optional(),
});
export type CsvExportInput = z.infer<typeof csvExportInputSchema>;

export const csvExportRowSchema = z.object({
  date: z.string(),
  driverName: z.string(),
  stopOrder: z.string(),
  pointName: z.string(),
  address: z.string(),
  arrivalTime: z.string(),
  departureTime: z.string(),
  dwellMinutes: z.number(),
  workdayPercentage: z.number(),
});
export type CsvExportRow = z.infer<typeof csvExportRowSchema>;

export const csvExportOutputSchema = z.object({
  csv: z.string(),
  filename: z.string(),
});
export type CsvExportOutput = z.infer<typeof csvExportOutputSchema>;

export const standardWorkdayDurationSchema = z.object({
  standardWorkdayDuration: z.number().int().positive(),
});
export type StandardWorkdayDuration = z.infer<
  typeof standardWorkdayDurationSchema
>;
