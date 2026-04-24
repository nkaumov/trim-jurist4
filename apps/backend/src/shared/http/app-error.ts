export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    options: { code: AppErrorCode; statusCode: number; details?: unknown },
  ) {
    super(message);
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}

