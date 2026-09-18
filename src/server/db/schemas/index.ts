import * as auth from "./auth";
import * as parameters from "./parameters";
import * as points from "./points";
import * as routes from "./routes";

export const schema = {
  ...auth,
  ...parameters,
  ...points,
  ...routes,
};
