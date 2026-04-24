import path from "node:path";
import { AppError } from "../../shared/http/app-error.js";

const AllowedMimeTypes = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.ms-word",
  "application/vnd.ms-office",
  "application/vnd.ms-word.document.macroenabled.12",
  "application/vnd.ms-word.template.macroenabled.12",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
  "application/rtf",
  "text/rtf",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.text-template",
  "text/plain",
  "text/markdown",
  "text/html",
  "application/xhtml+xml",
  "text/csv",
  "application/csv",
  "text/xml",
  "application/xml",
]);

const AllowedExtensions = new Set<string>([
  ".pdf",
  ".doc",
  ".dot",
  ".docx",
  ".docm",
  ".dotx",
  ".dotm",
  ".rtf",
  ".odt",
  ".ott",
  ".txt",
  ".md",
  ".markdown",
  ".html",
  ".htm",
  ".csv",
  ".xml",
]);

const GenericMimeTypes = new Set<string>([
  "",
  "application/octet-stream",
  "application/x-ole-storage",
  "application/zip",
  "application/x-zip-compressed",
]);

type FileValidationInput = {
  mimeType?: string | null;
  filename?: string | null;
};

function normalizeMimeType(mimeType?: string | null) {
  return (mimeType ?? "").split(";")[0]!.trim().toLowerCase();
}

function normalizeExtension(filename?: string | null) {
  return path.extname(filename ?? "").trim().toLowerCase();
}

export function assertAllowedMimeType(
  input: string | FileValidationInput,
  filename?: string,
) {
  const mimeType = normalizeMimeType(typeof input === "string" ? input : input.mimeType);
  const originalName = typeof input === "string" ? filename : input.filename;
  const extension = normalizeExtension(originalName);

  if (AllowedMimeTypes.has(mimeType)) return;

  // Browsers and Windows can send old Word/Office files as application/octet-stream,
  // application/x-ole-storage, or even zip-like MIME for OOXML files. In this case
  // we accept the upload only when the filename extension is a known text document type.
  if (AllowedExtensions.has(extension) && GenericMimeTypes.has(mimeType)) return;

  if (AllowedExtensions.has(extension) && mimeType.startsWith("text/")) return;

  throw new AppError(
    `Unsupported file type: ${mimeType || "unknown"}${extension ? ` (${extension})` : ""}`,
    {
      code: "BAD_REQUEST",
      statusCode: 400,
      details: {
        allowedMimeTypes: Array.from(AllowedMimeTypes),
        allowedExtensions: Array.from(AllowedExtensions),
      },
    },
  );
}
