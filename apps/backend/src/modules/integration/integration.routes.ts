import type { FastifyInstance } from "fastify";
import { AiAnalysisResponseSchema } from "@juri/shared-types";
import { prisma } from "../../shared/db/prisma.js";
import { AppError } from "../../shared/http/app-error.js";
import { requireIntegrationKey } from "./integration-auth.js";

export function registerIntegrationRoutes(app: FastifyInstance) {
  app.get("/integration/health", async () => ({ ok: true }));

  // Minimal queue endpoint for external workers (platform, cron, etc.)
  app.get(
    "/integration/queue",
    { preHandler: requireIntegrationKey(app) },
    async (request, reply) => {
      const limitRaw = (request.query as any)?.limit;
      const limit = Math.max(1, Math.min(50, Number(limitRaw ?? 20) || 20));

      const cases = await prisma.case.findMany({
        where: { status: "ready_for_analysis" },
        orderBy: { updatedAt: "asc" },
        take: limit,
        select: {
          id: true,
          title: true,
          counterpartyName: true,
          priority: true,
          contractType: true,
          updatedAt: true,
        },
      });

      return reply.send({
        ok: true,
        data: cases.map((c) => ({
          id: c.id,
          title: c.title,
          counterpartyName: c.counterpartyName,
          priority: c.priority,
          contractType: c.contractType,
          updatedAt: c.updatedAt.toISOString(),
        })),
      });
    },
  );

  app.get(
    "/integration/cases/:id/context",
    { preHandler: requireIntegrationKey(app) },
    async (request, reply) => {
      const caseId = String((request.params as any).id);
      const c = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
          files: { orderBy: { createdAt: "asc" } },
          disagreementInput: { include: { items: { orderBy: { sortOrder: "asc" } } } },
          organization: true,
        },
      });
      if (!c) throw new AppError("Case not found", { code: "NOT_FOUND", statusCode: 404 });

      const orgDocs = await prisma.organizationKnowledgeSource.findMany({
        where: { organizationId: c.organizationId, isActive: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });

      return reply.send({
        ok: true,
        data: {
          case: {
            id: c.id,
            title: c.title,
            counterpartyName: c.counterpartyName,
            status: c.status,
            priority: c.priority,
            contractType: c.contractType,
            description: c.description,
            notes: c.notes,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          },
          organization: {
            id: c.organization.id,
            name: c.organization.name,
            slug: c.organization.slug,
          },
          files: c.files.map((f) => ({
            id: f.id,
            fileCategory: f.fileCategory,
            originalName: f.originalName,
            mimeType: f.mimeType,
            fileSize: f.fileSize,
            extractedText: f.extractedText,
            createdAt: f.createdAt.toISOString(),
          })),
          disagreements: c.disagreementInput
            ? {
                id: c.disagreementInput.id,
                inputType: c.disagreementInput.inputType,
                freeText: c.disagreementInput.freeText,
                items: c.disagreementInput.items.map((it) => ({
                  id: it.id,
                  clauseNumber: it.clauseNumber,
                  clauseTitle: it.clauseTitle,
                  ourVersion: it.ourVersion,
                  counterpartyVersion: it.counterpartyVersion,
                  clientRequest: it.clientRequest,
                  comment: it.comment,
                  sortOrder: it.sortOrder,
                })),
              }
            : null,
          organizationKnowledge: orgDocs.map((d) => ({
            id: d.id,
            title: d.title,
            rules: d.description,
            sourceType: d.sourceType,
            tags: d.tags,
            mimeType: d.mimeType,
            updatedAt: d.updatedAt.toISOString(),
          })),
        },
      });
    },
  );

  app.post(
    "/integration/cases/:id/analysis-result",
    { preHandler: requireIntegrationKey(app) },
    async (request, reply) => {
      const caseId = String((request.params as any).id);
      const c = await prisma.case.findUnique({ where: { id: caseId } });
      if (!c) throw new AppError("Case not found", { code: "NOT_FOUND", statusCode: 404 });

      const body = AiAnalysisResponseSchema.parse(request.body);

      const now = new Date();
      const run = await prisma.$transaction(async (tx) => {
        const existing = await tx.analysisRun.findFirst({
          where: { caseId, status: { in: ["queued", "processing"] } },
          orderBy: { createdAt: "desc" },
        });

        if (existing) {
          await tx.analysisPosition.deleteMany({ where: { analysisRunId: existing.id } });
          return tx.analysisRun.update({
            where: { id: existing.id },
            data: {
              status: "completed",
              responsePayloadJson: body,
              summary: body.caseSummary,
              finalRecommendation: body.finalRecommendation,
              draftProtocolText: body.draftProtocolText,
              errorMessage: null,
              finishedAt: now,
              positions: {
                create: body.positions.map((p, idx) => ({
                  clauseNumber: p.clauseNumber ?? null,
                  clauseTitle: p.clauseTitle,
                  ourVersion: p.ourVersion ?? null,
                  counterpartyVersion: p.counterpartyVersion ?? null,
                  aiComment: p.aiComment,
                  recommendation: p.recommendation,
                  suggestedProtocolText: p.suggestedProtocolText ?? null,
                  riskLevel: p.riskLevel as any,
                  sortOrder: idx + 1,
                  bases: {
                    create: (p.bases ?? []).map((b, bIdx) => ({
                      basisType: b.basisType as any,
                      sourceTitle: b.sourceTitle,
                      sourceReference: b.sourceReference ?? null,
                      quoteText: b.quoteText ?? null,
                      priorityOrder: bIdx + 1,
                    })),
                  },
                })),
              },
            },
          });
        }

        return tx.analysisRun.create({
          data: {
            caseId,
            startedByUserId: c.createdByUserId,
            status: "completed",
            requestPayloadJson: { source: "external", caseId },
            responsePayloadJson: body,
            summary: body.caseSummary,
            finalRecommendation: body.finalRecommendation,
            draftProtocolText: body.draftProtocolText,
            errorMessage: null,
            startedAt: now,
            finishedAt: now,
            positions: {
              create: body.positions.map((p, idx) => ({
                clauseNumber: p.clauseNumber ?? null,
                clauseTitle: p.clauseTitle,
                ourVersion: p.ourVersion ?? null,
                counterpartyVersion: p.counterpartyVersion ?? null,
                aiComment: p.aiComment,
                recommendation: p.recommendation,
                suggestedProtocolText: p.suggestedProtocolText ?? null,
                riskLevel: p.riskLevel as any,
                sortOrder: idx + 1,
                bases: {
                  create: (p.bases ?? []).map((b, bIdx) => ({
                    basisType: b.basisType as any,
                    sourceTitle: b.sourceTitle,
                    sourceReference: b.sourceReference ?? null,
                    quoteText: b.quoteText ?? null,
                    priorityOrder: bIdx + 1,
                  })),
                },
              })),
            },
          },
        });
      });

      await prisma.case.update({
        where: { id: caseId },
        data: { status: "completed" },
      });

      return reply.status(201).send({ ok: true, data: { analysisRunId: run.id } });
    },
  );
}
