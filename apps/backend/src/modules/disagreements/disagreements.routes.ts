import type { FastifyInstance } from "fastify";
import { prisma } from "../../shared/db/prisma.js";
import { AppError } from "../../shared/http/app-error.js";
import { requireAuth } from "../../shared/http/auth.js";
import {
  CreateDisagreementItemBodySchema,
  PatchDisagreementInputBodySchema,
  PatchDisagreementItemBodySchema,
  UpsertDisagreementInputBodySchema,
} from "./disagreements.schemas.js";

export function registerDisagreementsRoutes(app: FastifyInstance) {
  app.post(
    "/cases/:id/disagreement-input",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const caseId = String((request.params as any).id);
      const body = UpsertDisagreementInputBodySchema.parse(request.body);

      const c = await prisma.case.findFirst({
        where: { id: caseId, organizationId: auth.organizationId },
        include: { disagreementInput: true },
      });
      if (!c) throw new AppError("Case not found", { code: "NOT_FOUND", statusCode: 404 });

      const input = await prisma.disagreementInput.upsert({
        where: { caseId },
        update: {
          inputType: body.inputType as any,
          freeText: body.freeText ?? null,
        },
        create: {
          caseId,
          inputType: body.inputType as any,
          freeText: body.freeText ?? null,
          createdByUserId: auth.userId,
        },
      });

      return reply.status(201).send({ ok: true, data: { id: input.id } });
    },
  );

  app.patch(
    "/disagreement-inputs/:id",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const id = String((request.params as any).id);
      const body = PatchDisagreementInputBodySchema.parse(request.body);

      const existing = await prisma.disagreementInput.findUnique({
        where: { id },
        include: { case: true },
      });
      if (!existing || existing.case.organizationId !== auth.organizationId) {
        throw new AppError("Disagreement input not found", { code: "NOT_FOUND", statusCode: 404 });
      }

      const updated = await prisma.disagreementInput.update({
        where: { id },
        data: {
          ...(body.inputType ? { inputType: body.inputType as any } : {}),
          ...(body.freeText !== undefined ? { freeText: body.freeText } : {}),
        },
      });

      return reply.send({ ok: true, data: { id: updated.id } });
    },
  );

  app.post(
    "/disagreement-inputs/:id/items",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const disagreementInputId = String((request.params as any).id);
      const body = CreateDisagreementItemBodySchema.parse(request.body);

      const input = await prisma.disagreementInput.findUnique({
        where: { id: disagreementInputId },
        include: { case: true },
      });
      if (!input || input.case.organizationId !== auth.organizationId) {
        throw new AppError("Disagreement input not found", { code: "NOT_FOUND", statusCode: 404 });
      }

      const item = await prisma.disagreementItem.create({
        data: {
          disagreementInputId,
          clauseNumber: body.clauseNumber ?? null,
          clauseTitle: body.clauseTitle ?? null,
          ourVersion: body.ourVersion ?? null,
          counterpartyVersion: body.counterpartyVersion ?? null,
          clientRequest: body.clientRequest ?? null,
          comment: body.comment ?? null,
          sortOrder: body.sortOrder,
        },
      });

      return reply.status(201).send({ ok: true, data: { id: item.id } });
    },
  );

  app.patch(
    "/disagreement-items/:id",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const id = String((request.params as any).id);
      const body = PatchDisagreementItemBodySchema.parse(request.body);

      const existing = await prisma.disagreementItem.findUnique({
        where: { id },
        include: { input: { include: { case: true } } },
      });
      if (!existing || existing.input.case.organizationId !== auth.organizationId) {
        throw new AppError("Disagreement item not found", { code: "NOT_FOUND", statusCode: 404 });
      }

      const updated = await prisma.disagreementItem.update({
        where: { id },
        data: {
          ...(body.clauseNumber !== undefined ? { clauseNumber: body.clauseNumber } : {}),
          ...(body.clauseTitle !== undefined ? { clauseTitle: body.clauseTitle } : {}),
          ...(body.ourVersion !== undefined ? { ourVersion: body.ourVersion } : {}),
          ...(body.counterpartyVersion !== undefined
            ? { counterpartyVersion: body.counterpartyVersion }
            : {}),
          ...(body.clientRequest !== undefined ? { clientRequest: body.clientRequest } : {}),
          ...(body.comment !== undefined ? { comment: body.comment } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        },
      });

      return reply.send({ ok: true, data: { id: updated.id } });
    },
  );

  app.delete(
    "/disagreement-items/:id",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const id = String((request.params as any).id);

      const existing = await prisma.disagreementItem.findUnique({
        where: { id },
        include: { input: { include: { case: true } } },
      });
      if (!existing || existing.input.case.organizationId !== auth.organizationId) {
        throw new AppError("Disagreement item not found", { code: "NOT_FOUND", statusCode: 404 });
      }

      await prisma.disagreementItem.delete({ where: { id } });
      return reply.status(204).send();
    },
  );
}

