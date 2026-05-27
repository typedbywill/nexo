import { z } from "zod";

import { zPropDefinition } from "./schema.zod.js";

export const zComponentMeta = z.object({
  name: z.string(),
  props: z.record(z.string(), zPropDefinition),
});
