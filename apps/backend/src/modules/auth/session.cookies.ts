import type { FastifyReply } from "fastify";
import { env } from "../../shared/env.js";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

function daysToSeconds(days: number) {
  return Math.max(1, Math.floor(days * 24 * 60 * 60));
}

export function setAuthCookies(reply: FastifyReply, tokens: AuthTokens) {
  reply.setCookie("access_token", tokens.accessToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
  });

  reply.setCookie("refresh_token", tokens.refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/auth/refresh",
    maxAge: daysToSeconds(env.REFRESH_TOKEN_TTL_DAYS),
  });
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie("access_token", { path: "/" });
  reply.clearCookie("refresh_token", { path: "/auth/refresh" });
}

