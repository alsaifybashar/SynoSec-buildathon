import { z } from "zod";

export const workflowEvaluationSubscoreSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  score: z.number().int().min(0),
  maxScore: z.number().int().min(0)
});
export type WorkflowEvaluationSubscore = z.infer<typeof workflowEvaluationSubscoreSchema>;

export const workflowEvaluationExpectationSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  met: z.boolean(),
  evidence: z.array(z.string().min(1)).default([])
});
export type WorkflowEvaluationExpectation = z.infer<typeof workflowEvaluationExpectationSchema>;

export const workflowEvaluationTargetPackSchema = z.enum([
  "vulnerable-app",
  "full-stack-target",
  "juice-shop",
  "auth-lab"
]);
export type WorkflowEvaluationTargetPack = z.infer<typeof workflowEvaluationTargetPackSchema>;

export const workflowEvaluationAvailableSchema = z.object({
  status: z.literal("available"),
  runId: z.string().uuid(),
  targetPack: workflowEvaluationTargetPackSchema,
  score: z.number().int().min(0).max(100),
  label: z.string().min(1),
  summary: z.string().min(1),
  subscores: z.array(workflowEvaluationSubscoreSchema).min(1),
  explanation: z.array(z.string().min(1)).default([]),
  totalExpectations: z.number().int().min(1).optional(),
  unmetExpectationsTruncatedCount: z.number().int().min(0).optional(),
  matchedExpectations: z.array(workflowEvaluationExpectationSchema).default([]),
  unmetExpectations: z.array(workflowEvaluationExpectationSchema).default([])
});
export type WorkflowEvaluationAvailable = z.infer<typeof workflowEvaluationAvailableSchema>;

export const workflowEvaluationUnavailableSchema = z.object({
  status: z.literal("unavailable"),
  runId: z.string().uuid(),
  reason: z.enum(["unsupported_target", "missing_target_context"]),
  label: z.literal("Not available"),
  summary: z.string().min(1)
});
export type WorkflowEvaluationUnavailable = z.infer<typeof workflowEvaluationUnavailableSchema>;

export const workflowRunEvaluationResponseSchema = z.discriminatedUnion("status", [
  workflowEvaluationAvailableSchema,
  workflowEvaluationUnavailableSchema
]);
export type WorkflowRunEvaluationResponse = z.infer<typeof workflowRunEvaluationResponseSchema>;
