import type { ParametersService } from "./parameters.service";
import type { UpdateParametersInput } from "./parameters.types";

export class ParametersController {
  constructor(private readonly service: ParametersService) {}

  get() {
    return this.service.get();
  }

  update(input: UpdateParametersInput) {
    return this.service.update(input);
  }
}
