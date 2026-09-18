import * as auth from "./auth";
import * as fleet from "./fleet";
import * as parameters from "./parameters";

export const schema = {
  ...auth,
  ...fleet,
  ...parameters,
};
