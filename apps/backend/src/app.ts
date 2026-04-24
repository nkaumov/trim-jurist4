import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { env } from "./shared/env.js";
import { registerHealthRoutes } from "./modules/health/health.routes.js";
import { registerErrorHandler } from "./shared/http/error-handler.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerOrganizationRoutes } from "./modules/organizations/organization.routes.js";
import { registerCasesRoutes } from "./modules/cases/cases.routes.js";
import { registerCaseFilesRoutes } from "./modules/case-files/case-files.routes.js";
import { registerDisagreementsRoutes } from "./modules/disagreements/disagreements.routes.js";
import { registerKnowledgeRoutes } from "./modules/knowledge/knowledge.routes.js";
import { registerAnalysesRoutes } from "./modules/analyses/analyses.routes.js";
import { registerIntegrationRoutes } from "./modules/integration/integration.routes.js";

function parseCorsOrigin(value: string): true | string | string[] {
  const trimmed = value.trim();
  if (trimmed === "*") return true;
  if (!trimmed.includes(",")) return trimmed;
  return trimmed
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  registerErrorHandler(app);

  await app.register(cors, {
    origin: parseCorsOrigin(env.CORS_ORIGIN),
    credentials: true,
  });
  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    cookie: {
      cookieName: "access_token",
      signed: false,
    },
    sign: {
      expiresIn: env.ACCESS_TOKEN_TTL,
    },
  });
  await app.register(multipart, {
    limits: {
      fileSize: env.FILE_MAX_SIZE_BYTES,
      files: 10,
    },
  });

  registerHealthRoutes(app);
  registerAuthRoutes(app);
  registerOrganizationRoutes(app);
  registerCasesRoutes(app);
  registerCaseFilesRoutes(app);
  registerDisagreementsRoutes(app);
  registerKnowledgeRoutes(app);
  registerAnalysesRoutes(app);
  registerIntegrationRoutes(app);

  return app;
}
