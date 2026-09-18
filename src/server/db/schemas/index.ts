import * as auth from "./auth";
import * as fleet from "./fleet";
import * as parameters from "./parameters";
import * as points from "./points";
import * as routes from "./routes";

export const schema = {
  ...auth,
  ...fleet,
  ...parameters,
  ...points,
  ...routes,
};
