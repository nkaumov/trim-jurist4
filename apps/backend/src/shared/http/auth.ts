import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "./app-error.js";

export type AuthUser = {
  userId: string;
  organizationId: string;
};

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthUser;
  }
}

export function requireAuth(app: FastifyInstance) {
  return async function authenticate(request: FastifyRequest) {
    try {
      const payload = await request.jwtVerify<AuthUser>();
      request.auth = payload;
    } catch {
      throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
    }
  };
}
