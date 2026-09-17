import { NotFoundError } from "@/server/api";

import type { ParametersRepository } from "./parameters.repository";
import type {
  Parameter,
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
    return this.toOutput(param);
  }

  async update(input: UpdateParametersInput): Promise<ParameterOutput> {
    const validated = updateParametersInputSchema.parse(input);

    const param = await this.repository.upsert({
      id: "system",
      fuelPricePerLiter: Math.round(validated.fuelPricePerLiter * 100),
      standardWorkdayDuration: validated.standardWorkdayDuration,
    });
    return this.toOutput(param);
  }

  private toOutput(param: Parameter): ParameterOutput {
    return {
      ...param,
      fuelPricePerLiter: param.fuelPricePerLiter / 100,
    };
  }
}
