import { z } from "zod";

export const PatchOrganizationKnowledgeBodySchema = z.object({
  title: z.string().min(1).optional(),
  rules: z.string().nullable().optional(),
  // deprecated alias (old UI)
  description: z.string().nullable().optional(),
  sourceType: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});
