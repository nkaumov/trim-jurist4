import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/http/app-error.js";
import { requireAuth } from "../../shared/http/auth.js";
import { authService } from "./auth.service.js";
import { clearAuthCookies, setAuthCookies } from "./session.cookies.js";
import { AuthLoginBodySchema, AuthMeResponseSchema } from "./auth.schemas.js";
import { authRepo } from "./auth.repo.js";

export function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const body = AuthLoginBodySchema.parse(request.body);
    const { accessToken, refreshToken, refreshTokenExpiresAt, user } =
      await authService.login(app, body);

    setAuthCookies(reply, { accessToken, refreshToken, refreshTokenExpiresAt });

    return reply.send({
      ok: true,
      data: AuthMeResponseSchema.parse({
        ...user,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      }),
    });
  });

  app.post("/auth/refresh", async (request, reply) => {
    const token = request.cookies.refresh_token;
    if (!token) throw new AppError("Missing refresh token", { code: "UNAUTHORIZED", statusCode: 401 });

    const { accessToken, refreshToken, refreshTokenExpiresAt, user } =
      await authService.refresh(app, token);
    setAuthCookies(reply, { accessToken, refreshToken, refreshTokenExpiresAt });
    return reply.send({
      ok: true,
      data: AuthMeResponseSchema.parse({
        ...user,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      }),
    });
  });

  app.post("/auth/logout", async (request, reply) => {
    await authService.logout(request.cookies.refresh_token);
    clearAuthCookies(reply);
    return reply.send({ ok: true });
  });

  app.get(
    "/auth/me",
    { preHandler: requireAuth(app) },
    async (request, reply) => {
      const auth = request.auth!;
      const user = await authRepo.getUserById(auth.userId);
      if (!user || !user.isActive) {
        throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
      }

      const response = AuthMeResponseSchema.parse({
        id: user.id,
        organizationId: user.organizationId,
        fullName: user.fullName,
        email: user.email,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      });
      return reply.send({ ok: true, data: response });
    },
  );
}
