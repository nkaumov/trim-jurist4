import { z } from "zod";

export const UserRoleSchema = z.enum(["admin", "lawyer"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const CaseStatusSchema = z.enum([
  "draft",
  "ready_for_analysis",
  "analyzing",
  "completed",
  "archived",
  "failed",
]);
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const CasePrioritySchema = z.enum(["low", "medium", "high"]);
export type CasePriority = z.infer<typeof CasePrioritySchema>;

export const AnalysisRunStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "failed",
]);
export type AnalysisRunStatus = z.infer<typeof AnalysisRunStatusSchema>;

export const DisagreementInputTypeSchema = z.enum([
  "document",
  "free_text",
  "manual_items",
]);
export type DisagreementInputType = z.infer<typeof DisagreementInputTypeSchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const AnalysisBasisTypeSchema = z.enum([
  "law",
  "internal_rule",
  "knowledge_doc",
  "template",
  "comment",
  "other",
]);
export type AnalysisBasisType = z.infer<typeof AnalysisBasisTypeSchema>;

export const AiAnalysisBasisSchema = z.object({
  basisType: z.enum([
    "law",
    "internal_rule",
    "knowledge_doc",
    "template",
    "comment",
    "other",
  ]),
  sourceTitle: z.string(),
  sourceReference: z.string().nullable().optional(),
  quoteText: z.string().nullable().optional(),
});

export const AiAnalysisPositionSchema = z.object({
  clauseNumber: z.string().nullable().optional(),
  clauseTitle: z.string(),
  ourVersion: z.string().nullable().optional(),
  counterpartyVersion: z.string().nullable().optional(),
  aiComment: z.string(),
  recommendation: z.string(),
  suggestedProtocolText: z.string().nullable().optional(),
  riskLevel: RiskLevelSchema,
  bases: z.array(AiAnalysisBasisSchema).default([]),
});

export const AiAnalysisResponseSchema = z.object({
  caseSummary: z.string(),
  finalRecommendation: z.string(),
  draftProtocolText: z.string(),
  positions: z.array(AiAnalysisPositionSchema),
});

export type AiAnalysisResponse = z.infer<typeof AiAnalysisResponseSchema>;

