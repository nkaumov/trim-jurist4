import { z } from "zod";
import { CasePrioritySchema, CaseStatusSchema } from "@juri/shared-types";

export const ListCasesQuerySchema = z.object({
  status: CaseStatusSchema.optional(),
  priority: CasePrioritySchema.optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreateCaseBodySchema = z.object({
  title: z.string().min(1),
  counterpartyName: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: CasePrioritySchema.default("medium"),
  contractType: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdateCaseBodySchema = z.object({
  title: z.string().min(1).optional(),
  counterpartyName: z.string().min(1).optional(),
  status: CaseStatusSchema.optional(),
  description: z.string().nullable().optional(),
  priority: CasePrioritySchema.optional(),
  contractType: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

