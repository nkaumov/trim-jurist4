import { z } from "zod";
import { DisagreementInputTypeSchema } from "@juri/shared-types";

export const UpsertDisagreementInputBodySchema = z.object({
  inputType: DisagreementInputTypeSchema,
  freeText: z.string().nullable().optional(),
});

export const PatchDisagreementInputBodySchema = z.object({
  inputType: DisagreementInputTypeSchema.optional(),
  freeText: z.string().nullable().optional(),
});

export const CreateDisagreementItemBodySchema = z.object({
  clauseNumber: z.string().nullable().optional(),
  clauseTitle: z.string().nullable().optional(),
  ourVersion: z.string().nullable().optional(),
  counterpartyVersion: z.string().nullable().optional(),
  clientRequest: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const PatchDisagreementItemBodySchema = CreateDisagreementItemBodySchema.partial();

