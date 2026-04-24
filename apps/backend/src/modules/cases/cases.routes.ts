import type { FastifyInstance } from "fastify";
import { prisma } from "../../shared/db/prisma.js";
import { AppError } from "../../shared/http/app-error.js";
import { requireAuth } from "../../shared/http/auth.js";
import { CreateCaseBodySchema, ListCasesQuerySchema, UpdateCaseBodySchema } from "./cases.schemas.js";

export function registerCasesRoutes(app: FastifyInstance) {
  app.get("/cases", { preHandler: requireAuth(app) }, async (request, reply) => {
    const auth = request.auth!;
    const query = ListCasesQuerySchema.parse(request.query);

    const where = {
      organizationId: auth.organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" as const } },
              {
                counterpartyName: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await prisma.$transaction([
      prisma.case.count({ where }),
      prisma.case.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return reply.send({
      ok: true,
      data: {
        items: items.map((c) => ({
          id: c.id,
          title: c.title,
          counterpartyName: c.counterpartyName,
          status: c.status,
          priority: c.priority,
          contractType: c.contractType,
          updatedAt: c.updatedAt.toISOString(),
        })),
        total,
        page: query.page,
        limit: query.limit,
      },
    });
  });

  app.post("/cases", { preHandler: requireAuth(app) }, async (request, reply) => {
    const auth = request.auth!;
    const body = CreateCaseBodySchema.parse(request.body);

    const created = await prisma.case.create({
      data: {
        organizationId: auth.organizationId,
        createdByUserId: auth.userId,
        title: body.title,
        counterpartyName: body.counterpartyName,
        description: body.description ?? null,
        priority: body.priority,
        contractType: body.contractType ?? null,
        notes: body.notes ?? null,
        status: "draft",
      },
    });

    return reply.status(201).send({ ok: true, data: { id: created.id } });
  });

  app.get("/cases/:id", { preHandler: requireAuth(app) }, async (request, reply) => {
    const auth = request.auth!;
    const id = String((request.params as any).id);
    const c = await prisma.case.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: {
        disagreementInput: { include: { items: { orderBy: { sortOrder: "asc" } } } },
      },
    });
    if (!c) throw new AppError("Case not found", { code: "NOT_FOUND", statusCode: 404 });
    return reply.send({
      ok: true,
      data: {
        id: c.id,
        title: c.title,
        counterpartyName: c.counterpartyName,
        status: c.status,
        description: c.description,
        priority: c.priority,
        contractType: c.contractType,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        disagreementInput: c.disagreementInput
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
      },
    });
  });

  app.patch("/cases/:id", { preHandler: requireAuth(app) }, async (request, reply) => {
    const auth = request.auth!;
    const id = String((request.params as any).id);
    const body = UpdateCaseBodySchema.parse(request.body);

    const existing = await prisma.case.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!existing) throw new AppError("Case not found", { code: "NOT_FOUND", statusCode: 404 });

    const updated = await prisma.case.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.counterpartyName ? { counterpartyName: body.counterpartyName } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.contractType !== undefined ? { contractType: body.contractType } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    return reply.send({ ok: true, data: { id: updated.id } });
  });

  app.delete("/cases/:id", { preHandler: requireAuth(app) }, async (request, reply) => {
    const auth = request.auth!;
    const id = String((request.params as any).id);
    const existing = await prisma.case.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!existing) throw new AppError("Case not found", { code: "NOT_FOUND", statusCode: 404 });

    await prisma.case.update({
      where: { id },
      data: { status: "archived", archivedAt: new Date() },
    });

    return reply.status(204).send();
  });

  app.post("/cases/:id/archive", { preHandler: requireAuth(app) }, async (request, reply) => {
    const auth = request.auth!;
    const id = String((request.params as any).id);
    const existing = await prisma.case.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!existing) throw new AppError("Case not found", { code: "NOT_FOUND", statusCode: 404 });

    await prisma.case.update({
      where: { id },
      data: { status: "archived", archivedAt: new Date() },
    });

    return reply.send({ ok: true });
  });
}

