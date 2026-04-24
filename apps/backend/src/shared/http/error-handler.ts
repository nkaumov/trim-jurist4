import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./app-error.js";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, _req, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation error",
          details: error.flatten(),
        },
      });
    }

    app.log.error({ err: error }, "unhandled_error");
    return reply.status(500).send({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  });
}

