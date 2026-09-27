import { NotFoundError } from "@/server/api";

import type { ParametersRepository } from "./parameters.repository";
import type {
  ParameterOutput,
  UpdateParametersInput,
} from "./parameters.types";
import { updateParametersInputSchema } from "./parameters.types";

export class ParametersService {
  constructor(private readonly repository: ParametersRepository) {}

  async get(): Promise<ParameterOutput> {
    const param = await this.repository.find();
    if (!param) {
      throw new NotFoundError("Parâmetros não configurados.");
    }
    return param;
  }

  async update(input: UpdateParametersInput): Promise<ParameterOutput> {
    const validated = updateParametersInputSchema.parse(input);

    return this.repository.upsert({
      fuelPricePerLiter: validated.fuelPricePerLiter,
      standardWorkdayDuration: validated.standardWorkdayDuration,
    });
  }
}
