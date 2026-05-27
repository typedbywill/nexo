import { z } from "zod";

export const zPropType = z.enum(["string", "number", "boolean", "json"]);

export const zPropValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.unknown()),
]);

export const zPropDefinition = z.object({
  type: zPropType,
  default: zPropValue.optional(),
  required: z.boolean(),
});

export const zNexoComponentSchema = z.object({
  source: z.string(),
  assets: z
    .object({
      css: z.array(z.string()).optional(),
      js: z.array(z.string()).optional(),
    })
    .optional(),
  props: z.record(z.string(), zPropDefinition).optional(),
});

export const zNexoConfig = z.object({
  name: z.string(),
  port: z.number().optional(),
  assets: z.array(z.string()).optional(),
});

export const zNexoPages = z.record(z.string(), z.array(z.string()));

export const zNexoSchema = z.object({
  config: zNexoConfig,
  pages: zNexoPages,
  components: z.record(z.string(), zNexoComponentSchema),
});
