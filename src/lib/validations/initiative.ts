import { z } from "zod";

// Initiative type enum
export const initiativeTypeSchema = z.enum([
  "COST_REDUCTION",
  "ACQUISITION",
  "NEW_PRODUCT",
  "CAPEX_PROJECT",
  "OTHER",
]);

// Tag schema for initiative scope
export const tagSchema = z.object({
  type: z.enum([
    "bu",
    "site",
    "function",
    "customer_tier",
    "product_family",
    "custom",
  ]),
  value: z.string().min(1),
  label: z.string().optional(),
});

// Initiative creation schema
export const createInitiativeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  templateId: z.string().cuid().optional(),
  tags: z.array(tagSchema).default([]),
  type: initiativeTypeSchema.default("OTHER"),
  isPublic: z.boolean().default(false),
  collaboratorEmails: z.string().max(2000).optional(), // Comma-separated emails
});

// Initiative update schema
export const updateInitiativeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z
    .enum([
      "IDEA",
      "DRAFT",
      "IN_REVIEW",
      "APPROVED",
      "IN_FLIGHT",
      "REALIZED",
      "ARCHIVED",
    ])
    .optional(),
  tags: z.array(tagSchema).optional(),
  type: initiativeTypeSchema.optional(),
  isPublic: z.boolean().optional(),
  collaboratorEmails: z.string().max(2000).optional().nullable(),
});

// Version creation schema
export const createVersionSchema = z.object({
  initiativeId: z.string().cuid(),
  versionLabel: z.string().min(1).max(20).optional(),
  notes: z.string().max(2000).optional(),
  copyFromVersionId: z.string().cuid().optional(),
});

// Version state update schema
export const updateVersionStateSchema = z.object({
  versionId: z.string().cuid(),
  state: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SUPERSEDED"]),
  notes: z.string().max(2000).optional(),
});

// Driver value schema
export const driverValueSchema = z.object({
  driverKey: z.string().min(1),
  value: z.union([
    z.number(),
    z.string(),
    z.boolean(),
    z.array(z.number()), // for curves
    z.null(),
  ]),
  notes: z.string().max(2000).optional(),
  source: z
    .enum(["MANUAL", "IMPORTED", "REQUESTED", "CALCULATED", "BASELINE"])
    .optional(),
});

// Batch driver values update
export const updateDriverValuesSchema = z.object({
  versionId: z.string().cuid(),
  values: z.array(driverValueSchema),
});

// Scenario schema
export const createScenarioSchema = z.object({
  versionId: z.string().cuid(),
  name: z.string().min(1).max(100),
  isBaseline: z.boolean().default(false),
  overrides: z
    .record(
      z.string(),
      z.union([z.number(), z.string(), z.boolean(), z.array(z.number()), z.null()])
    )
    .default({}),
});

export const updateScenarioSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  overrides: z
    .record(
      z.string(),
      z.union([z.number(), z.string(), z.boolean(), z.array(z.number()), z.null()])
    )
    .optional(),
});

// Input request schema
export const createInputRequestSchema = z.object({
  versionId: z.string().cuid(),
  assigneeEmail: z.string().email(),
  driverKeys: z.array(z.string()).min(1),
  dueDate: z.coerce.date().optional(),
  message: z.string().max(2000).optional(),
});

// Comment schema
export const createCommentSchema = z.object({
  versionId: z.string().cuid(),
  content: z.string().min(1).max(5000),
  parentId: z.string().cuid().optional(),
  driverKey: z.string().optional(),
});

// Initiative filters for querying
export const initiativeFiltersSchema = z.object({
  status: z
    .array(
      z.enum([
        "IDEA",
        "DRAFT",
        "IN_REVIEW",
        "APPROVED",
        "IN_FLIGHT",
        "REALIZED",
        "ARCHIVED",
      ])
    )
    .optional(),
  templateId: z.string().cuid().optional(),
  type: initiativeTypeSchema.optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(tagSchema).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z
    .enum(["createdAt", "updatedAt", "title", "status", "type"])
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type InitiativeType = z.infer<typeof initiativeTypeSchema>;
export type CreateInitiativeInput = z.infer<typeof createInitiativeSchema>;
export type UpdateInitiativeInput = z.infer<typeof updateInitiativeSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type UpdateVersionStateInput = z.infer<typeof updateVersionStateSchema>;
export type DriverValueInput = z.infer<typeof driverValueSchema>;
export type UpdateDriverValuesInput = z.infer<typeof updateDriverValuesSchema>;
export type CreateScenarioInput = z.infer<typeof createScenarioSchema>;
export type UpdateScenarioInput = z.infer<typeof updateScenarioSchema>;
export type CreateInputRequestInput = z.infer<typeof createInputRequestSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type InitiativeFilters = z.infer<typeof initiativeFiltersSchema>;
export type Tag = z.infer<typeof tagSchema>;
