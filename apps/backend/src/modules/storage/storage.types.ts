import type { Readable } from "node:stream";

export type StoredFile = {
  storedName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
};

export type SaveFileInput = {
  stream: Readable;
  originalName: string;
  mimeType: string;
  directory: string;
};

export interface FileStorage {
  saveFile(input: SaveFileInput): Promise<StoredFile>;
  deleteFile(filePath: string): Promise<void>;
}

