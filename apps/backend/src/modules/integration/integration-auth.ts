import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "../../shared/env.js";
import { AppError } from "../../shared/http/app-error.js";

export type IntegrationAuth = {
  type: "integration";
};

declare module "fastify" {
  interface FastifyRequest {
    integrationAuth?: IntegrationAuth;
  }
}

export function requireIntegrationKey(_app: FastifyInstance) {
  return async function auth(request: FastifyRequest) {
    const header =
      request.headers["x-juri4-integration-key"] ??
      request.headers["x-integration-key"];
    const key = Array.isArray(header) ? header[0] : header;

    if (!key || String(key) !== env.INTEGRATION_API_KEY) {
      throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    request.integrationAuth = { type: "integration" };
  };
}

