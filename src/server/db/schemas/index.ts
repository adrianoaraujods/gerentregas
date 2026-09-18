import * as auth from "./auth";
import * as parameters from "./parameters";
import * as points from "./points";

export const schema = {
  ...auth,
  ...parameters,
  ...points,
};
