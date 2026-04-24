import type { FastifyInstance } from "fastify";
import { prisma } from "../../shared/db/prisma.js";
import { AppError } from "../../shared/http/app-error.js";
import { requireAuth } from "../../shared/http/auth.js";
import { LocalFileStorage } from "../storage/local-file-storage.js";
import { assertAllowedMimeType } from "../storage/file-validation.js";
import { CaseFileCategorySchema } from "./case-files.schemas.js";

const storage = new LocalFileStorage();

export function registerCaseFilesRoutes(app: FastifyInstance) {
  app.post(
    "/cases/:id/files",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const caseId = String((request.params as any).id);

      const c = await prisma.case.findFirst({
        where: { id: caseId, organizationId: auth.organizationId },
      });
      if (!c) throw new AppError("Case not found", { code: "NOT_FOUND", statusCode: 404 });

      const parts = request.parts();
      let fileCategory: string | undefined;
      let uploadedFile:
        | {
            filename: string;
            mimetype: string;
            file: NodeJS.ReadableStream;
          }
        | undefined;

      for await (const part of parts) {
        if (part.type === "file") {
          uploadedFile = part;
        } else if (part.type === "field" && part.fieldname === "fileCategory") {
          fileCategory = String(part.value);
        }
      }

      if (!uploadedFile) {
        throw new AppError("File is required", { code: "BAD_REQUEST", statusCode: 400 });
      }

      const parsedCategory = CaseFileCategorySchema.safeParse(fileCategory ?? "other");
      if (!parsedCategory.success) {
        throw new AppError("Invalid fileCategory", {
          code: "VALIDATION_ERROR",
          statusCode: 400,
          details: parsedCategory.error.flatten(),
        });
      }

      assertAllowedMimeType({
        mimeType: uploadedFile.mimetype,
        filename: uploadedFile.filename,
      });

      const stored = await storage.saveFile({
        stream: uploadedFile.file as any,
        originalName: uploadedFile.filename,
        mimeType: uploadedFile.mimetype,
        directory: `cases/${caseId}`,
      });

      const record = await prisma.caseFile.create({
        data: {
          caseId,
          uploadedByUserId: auth.userId,
          fileCategory: parsedCategory.data as any,
          originalName: uploadedFile.filename,
          storedName: stored.storedName,
          filePath: stored.filePath,
          mimeType: stored.mimeType,
          fileSize: stored.fileSize,
          extractedText: null,
        },
      });

      return reply.status(201).send({
        ok: true,
        data: { id: record.id },
      });
    },
  );

  app.get(
    "/cases/:id/files",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const caseId = String((request.params as any).id);

      const c = await prisma.case.findFirst({
        where: { id: caseId, organizationId: auth.organizationId },
      });
      if (!c) throw new AppError("Case not found", { code: "NOT_FOUND", statusCode: 404 });

      const files = await prisma.caseFile.findMany({
        where: { caseId },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({
        ok: true,
        data: files.map((f) => ({
          id: f.id,
          fileCategory: f.fileCategory,
          originalName: f.originalName,
          mimeType: f.mimeType,
          fileSize: f.fileSize,
          createdAt: f.createdAt.toISOString(),
        })),
      });
    },
  );

  app.delete(
    "/case-files/:id",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const id = String((request.params as any).id);

      const file = await prisma.caseFile.findUnique({
        where: { id },
        include: { case: true },
      });
      if (!file || file.case.organizationId !== auth.organizationId) {
        throw new AppError("File not found", { code: "NOT_FOUND", statusCode: 404 });
      }

      await storage.deleteFile(file.filePath).catch(() => undefined);
      await prisma.caseFile.delete({ where: { id } });

      return reply.status(204).send();
    },
  );
}

