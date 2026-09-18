import type { DashboardService } from "./dashboard.service";
import type { GetAggregationInput } from "./dashboard.types";

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  async getAggregation(input: GetAggregationInput) {
    return this.service.getAggregation(input);
  }

  async getDrilldown(input: GetAggregationInput) {
    return this.service.getDrilldown(input);
  }

  async exportCSV(input: GetAggregationInput) {
    return this.service.exportCSV(input);
  }

  async getStandardWorkdayDuration() {
    return this.service.getStandardWorkdayDuration();
  }
}
