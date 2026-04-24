import { z } from "zod";

export const AuthLoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const AuthMeResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  lastLoginAt: z.string().nullable(),
});
