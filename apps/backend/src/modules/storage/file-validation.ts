import { AppError } from "../../shared/http/app-error.js";

const AllowedMimeTypes = new Set<string>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export function assertAllowedMimeType(mimeType: string) {
  if (!AllowedMimeTypes.has(mimeType)) {
    throw new AppError(`Unsupported file type: ${mimeType}`, {
      code: "BAD_REQUEST",
      statusCode: 400,
      details: { allowed: Array.from(AllowedMimeTypes) },
    });
  }
}

