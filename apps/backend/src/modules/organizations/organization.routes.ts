import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/http/app-error.js";
import { requireAuth } from "../../shared/http/auth.js";
import { prisma } from "../../shared/db/prisma.js";

export function registerOrganizationRoutes(app: FastifyInstance) {
  app.get(
    "/organization/me",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const org = await prisma.organization.findUnique({
        where: { id: auth.organizationId },
      });
      if (!org) throw new AppError("Organization not found", { code: "NOT_FOUND", statusCode: 404 });
      return reply.send({
        ok: true,
        data: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
        },
      });
    },
  );
}

