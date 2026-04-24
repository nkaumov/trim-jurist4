import type { FastifyInstance } from "fastify";
import { prisma } from "../../shared/db/prisma.js";
import { AppError } from "../../shared/http/app-error.js";
import { requireAuth } from "../../shared/http/auth.js";

export function registerAnalysesRoutes(app: FastifyInstance) {
  app.post(
    "/cases/:id/analyze",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const caseId = String((request.params as any).id);

      const c = await prisma.case.findFirst({
        where: { id: caseId, organizationId: auth.organizationId },
        include: {
          disagreementInput: { include: { items: { orderBy: { sortOrder: "asc" } } } },
        },
      });
      if (!c) throw new AppError("Case not found", { code: "NOT_FOUND", statusCode: 404 });

      const requestPayload = {
        caseId: c.id,
        title: c.title,
        counterpartyName: c.counterpartyName,
        contractType: c.contractType,
        notes: c.notes,
        disagreementInput: c.disagreementInput
          ? {
              inputType: c.disagreementInput.inputType,
              freeText: c.disagreementInput.freeText,
              items: c.disagreementInput.items.map((it) => ({
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
      };

      const run = await prisma.analysisRun.create({
        data: {
          caseId: c.id,
          startedByUserId: auth.userId,
          status: "queued",
          requestPayloadJson: requestPayload,
          summary: null,
          finalRecommendation: null,
          draftProtocolText: null,
          errorMessage: null,
          startedAt: new Date(),
          finishedAt: null,
        },
      });

      await prisma.case.update({
        where: { id: c.id },
        data: { status: "ready_for_analysis" },
      });

      return reply.status(201).send({ ok: true, data: { analysisRunId: run.id } });
    },
  );

  app.get(
    "/cases/:id/analysis-runs",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const caseId = String((request.params as any).id);

      const c = await prisma.case.findFirst({
        where: { id: caseId, organizationId: auth.organizationId },
      });
      if (!c) throw new AppError("Case not found", { code: "NOT_FOUND", statusCode: 404 });

      const runs = await prisma.analysisRun.findMany({
        where: { caseId },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({
        ok: true,
        data: runs.map((r) => ({
          id: r.id,
          status: r.status,
          summary: r.summary,
          createdAt: r.createdAt.toISOString(),
          finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
        })),
      });
    },
  );

  app.get(
    "/analysis-runs/:id",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const id = String((request.params as any).id);

      const run = await prisma.analysisRun.findUnique({
        where: { id },
        include: { case: true },
      });
      if (!run || run.case.organizationId !== auth.organizationId) {
        throw new AppError("Analysis run not found", { code: "NOT_FOUND", statusCode: 404 });
      }

      return reply.send({
        ok: true,
        data: {
          id: run.id,
          status: run.status,
          summary: run.summary,
          finalRecommendation: run.finalRecommendation,
          draftProtocolText: run.draftProtocolText,
          errorMessage: run.errorMessage,
          startedAt: run.startedAt.toISOString(),
          finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
        },
      });
    },
  );

  app.get(
    "/analysis-runs/:id/positions",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const id = String((request.params as any).id);

      const run = await prisma.analysisRun.findUnique({
        where: { id },
        include: {
          case: true,
          positions: { orderBy: { sortOrder: "asc" }, include: { bases: { orderBy: { priorityOrder: "asc" } } } },
        },
      });
      if (!run || run.case.organizationId !== auth.organizationId) {
        throw new AppError("Analysis run not found", { code: "NOT_FOUND", statusCode: 404 });
      }

      return reply.send({
        ok: true,
        data: run.positions.map((p) => ({
          id: p.id,
          clauseNumber: p.clauseNumber,
          clauseTitle: p.clauseTitle,
          ourVersion: p.ourVersion,
          counterpartyVersion: p.counterpartyVersion,
          aiComment: p.aiComment,
          recommendation: p.recommendation,
          suggestedProtocolText: p.suggestedProtocolText,
          riskLevel: p.riskLevel,
          bases: p.bases.map((b) => ({
            id: b.id,
            basisType: b.basisType,
            sourceTitle: b.sourceTitle,
            sourceReference: b.sourceReference,
            quoteText: b.quoteText,
            priorityOrder: b.priorityOrder,
          })),
        })),
      });
    },
  );
}
