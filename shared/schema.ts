import { z } from "zod";

export const predictRequestSchema = z.object({
  drawing: z.array(
    z.tuple([z.array(z.number()), z.array(z.number())])
  ),
});

export type PredictRequest = z.infer<typeof predictRequestSchema>;

export const predictResponseSchema = z.object({
  predictedClass: z.string(),
  confidence: z.number(),
  allProbabilities: z.record(z.string(), z.number()),
});

export type PredictResponse = z.infer<typeof predictResponseSchema>;

