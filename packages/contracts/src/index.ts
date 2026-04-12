import { z } from "zod";

export const apiRoutes = {
  health: "/api/health",
  demo: "/api/demo",
  brief: "/api/brief",
  applications: "/api/applications"
} as const;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("synosec-backend"),
  timestamp: z.string().datetime()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const demoFindingSchema = z.object({
  id: z.string().min(1),
  target: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
  summary: z.string().min(1)
});

export const demoResponseSchema = z.object({
  scanMode: z.literal("depth-first"),
  targetCount: z.number().int().nonnegative(),
  findings: z.array(demoFindingSchema).min(1)
});

export type DemoResponse = z.infer<typeof demoResponseSchema>;

export const briefResponseSchema = z.object({
  headline: z.string().min(1),
  actions: z.array(z.string().min(1)).min(1),
  generatedAt: z.string().datetime()
});

export type BriefResponse = z.infer<typeof briefResponseSchema>;

export const applicationEnvironmentSchema = z.enum(["production", "staging", "development"]);
export type ApplicationEnvironment = z.infer<typeof applicationEnvironmentSchema>;

export const applicationStatusSchema = z.enum(["active", "investigating", "archived"]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const applicationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  baseUrl: z.string().url().nullable(),
  environment: applicationEnvironmentSchema,
  status: applicationStatusSchema,
  lastScannedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type Application = z.infer<typeof applicationSchema>;

export const listApplicationsResponseSchema = z.object({
  applications: z.array(applicationSchema)
});
export type ListApplicationsResponse = z.infer<typeof listApplicationsResponseSchema>;

const applicationBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  baseUrl: z.union([z.string().trim().url(), z.literal(""), z.null()]).transform((value) => value || null),
  environment: applicationEnvironmentSchema,
  status: applicationStatusSchema,
  lastScannedAt: z.union([z.string().datetime(), z.null()])
});

export const createApplicationBodySchema = applicationBodyBaseSchema;
export type CreateApplicationBody = z.infer<typeof createApplicationBodySchema>;

export const updateApplicationBodySchema = applicationBodyBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required."
});
export type UpdateApplicationBody = z.infer<typeof updateApplicationBodySchema>;
