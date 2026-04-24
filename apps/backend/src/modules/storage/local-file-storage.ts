import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import type { FileStorage, SaveFileInput, StoredFile } from "./storage.types.js";
import { env } from "../../shared/env.js";

function safeExt(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  return ext.length <= 12 ? ext : "";
}

export class LocalFileStorage implements FileStorage {
  async saveFile(input: SaveFileInput): Promise<StoredFile> {
    const ext = safeExt(input.originalName);
    const storedName = `${randomUUID()}${ext}`;
    const dirPath = path.join(env.UPLOAD_DIR, input.directory);
    await mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, storedName);
    let bytes = 0;
    input.stream.on("data", (chunk) => {
      bytes += Buffer.byteLength(chunk);
    });

    await pipeline(input.stream, createWriteStream(filePath));

    return { storedName, filePath, fileSize: bytes, mimeType: input.mimeType };
  }

  async deleteFile(filePath: string): Promise<void> {
    await rm(filePath, { force: true });
  }
}

