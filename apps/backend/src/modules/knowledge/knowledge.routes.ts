import type { FastifyInstance } from "fastify";
import { prisma } from "../../shared/db/prisma.js";
import { AppError } from "../../shared/http/app-error.js";
import { requireAuth } from "../../shared/http/auth.js";
import { LocalFileStorage } from "../storage/local-file-storage.js";
import { assertAllowedMimeType } from "../storage/file-validation.js";
import { PatchOrganizationKnowledgeBodySchema } from "./knowledge.schemas.js";

const storage = new LocalFileStorage();

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function registerKnowledgeRoutes(app: FastifyInstance) {
  app.get(
    "/knowledge/global",
    { preHandler: requireAuth(app) },
    async (_request, reply) => {
      const globals = await prisma.globalKnowledgeSource.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
      });
      return reply.send({
        ok: true,
        data: globals.map((g) => ({
          id: g.id,
          title: g.title,
          rules: g.description,
          sourceType: g.sourceType,
          externalUrl: g.externalUrl,
          tags: g.tags,
          updatedAt: g.updatedAt.toISOString(),
        })),
      });
    },
  );

  app.get(
    "/knowledge/organization",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const docs = await prisma.organizationKnowledgeSource.findMany({
        where: { organizationId: auth.organizationId, isActive: true },
        orderBy: { updatedAt: "desc" },
      });
      return reply.send({
        ok: true,
        data: docs.map((d) => ({
          id: d.id,
          title: d.title,
          rules: d.description,
          sourceType: d.sourceType,
          mimeType: d.mimeType,
          tags: d.tags,
          updatedAt: d.updatedAt.toISOString(),
        })),
      });
    },
  );

  app.post(
    "/knowledge/organization/files",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const parts = request.parts();

      let title: string | undefined;
      let rules: string | undefined;
      let sourceType: string | undefined;
      let tags: string[] = [];
      let uploadedFile:
        | {
            filename: string;
            mimetype: string;
            file: NodeJS.ReadableStream;
          }
        | undefined;

      for await (const part of parts) {
        if (part.type === "file") uploadedFile = part;
        if (part.type === "field") {
          if (part.fieldname === "title") title = String(part.value);
          if (part.fieldname === "rules") rules = String(part.value);
          // backward compatible alias
          if (part.fieldname === "description" && rules === undefined) rules = String(part.value);
          if (part.fieldname === "sourceType") sourceType = String(part.value);
          if (part.fieldname === "tags") tags = parseTags(part.value);
        }
      }

      if (!uploadedFile) throw new AppError("File is required", { code: "BAD_REQUEST", statusCode: 400 });
      if (!title) throw new AppError("title is required", { code: "BAD_REQUEST", statusCode: 400 });
      if (!sourceType) throw new AppError("sourceType is required", { code: "BAD_REQUEST", statusCode: 400 });

      assertAllowedMimeType(uploadedFile.mimetype);

      const stored = await storage.saveFile({
        stream: uploadedFile.file as any,
        originalName: uploadedFile.filename,
        mimeType: uploadedFile.mimetype,
        directory: `knowledge/${auth.organizationId}`,
      });

      const doc = await prisma.organizationKnowledgeSource.create({
        data: {
          organizationId: auth.organizationId,
          uploadedByUserId: auth.userId,
          title,
          description: rules ?? null,
          sourceType,
          filePath: stored.filePath,
          externalUrl: null,
          mimeType: stored.mimeType,
          tags,
          isActive: true,
        },
      });

      return reply.status(201).send({ ok: true, data: { id: doc.id } });
    },
  );

  app.patch(
    "/knowledge/organization/:id",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const id = String((request.params as any).id);
      const body = PatchOrganizationKnowledgeBodySchema.parse(request.body);

      const existing = await prisma.organizationKnowledgeSource.findUnique({
        where: { id },
      });
      if (!existing || existing.organizationId !== auth.organizationId) {
        throw new AppError("Knowledge doc not found", { code: "NOT_FOUND", statusCode: 404 });
      }

      const updated = await prisma.organizationKnowledgeSource.update({
        where: { id },
        data: {
          ...(body.title ? { title: body.title } : {}),
          ...((body.rules ?? body.description) !== undefined
            ? { description: body.rules ?? body.description }
            : {}),
          ...(body.sourceType ? { sourceType: body.sourceType } : {}),
          ...(body.tags ? { tags: body.tags } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });

      return reply.send({ ok: true, data: { id: updated.id } });
    },
  );

  app.delete(
    "/knowledge/organization/:id",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const id = String((request.params as any).id);

      const existing = await prisma.organizationKnowledgeSource.findUnique({
        where: { id },
      });
      if (!existing || existing.organizationId !== auth.organizationId) {
        throw new AppError("Knowledge doc not found", { code: "NOT_FOUND", statusCode: 404 });
      }

      await prisma.organizationKnowledgeSource.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.status(204).send();
    },
  );
}
