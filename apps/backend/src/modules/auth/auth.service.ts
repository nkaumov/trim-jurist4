import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/http/app-error.js";
import { env } from "../../shared/env.js";
import { authRepo } from "./auth.repo.js";
import { refreshTokenRepo } from "./refresh-token.repo.js";

type AuthUserPayload = {
  userId: string;
  organizationId: string;
};

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function refreshExpiryDate() {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export const authService = {
  async login(app: FastifyInstance, input: { email: string; password: string }) {
    const user = await authRepo.getUserByEmail(input.email);
    if (!user || !user.isActive) {
      throw new AppError("Invalid credentials", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new AppError("Invalid credentials", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    await authRepo.updateLastLogin(user.id);

    const payload: AuthUserPayload = {
      userId: user.id,
      organizationId: user.organizationId,
    };

    const accessToken = app.jwt.sign(payload);

    const refreshToken = app.jwt.sign(
      { userId: user.id },
      {
        key: env.JWT_REFRESH_SECRET,
        expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
      },
    );

    const refreshTokenHash = sha256(refreshToken);
    const refreshTokenExpiresAt = refreshExpiryDate();
    await refreshTokenRepo.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
    });

    return {
      auth: payload,
      user: {
        id: user.id,
        organizationId: user.organizationId,
        fullName: user.fullName,
        email: user.email,
        lastLoginAt: user.lastLoginAt,
      },
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
    };
  },

  async refresh(app: FastifyInstance, refreshToken: string) {
    let decoded: { userId: string };
    try {
      decoded = app.jwt.verify<{ userId: string }>(refreshToken, {
        key: env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new AppError("Invalid refresh token", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    const tokenHash = sha256(refreshToken);
    const stored = await refreshTokenRepo.findByTokenHash(tokenHash);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError("Refresh token revoked or expired", {
        code: "UNAUTHORIZED",
        statusCode: 401,
      });
    }

    const user = await authRepo.getUserById(decoded.userId);
    if (!user || !user.isActive) {
      throw new AppError("User not found", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    await refreshTokenRepo.revokeByTokenHash(tokenHash);

    const payload: AuthUserPayload = {
      userId: user.id,
      organizationId: user.organizationId,
    };
    const accessToken = app.jwt.sign(payload);

    const newRefreshToken = app.jwt.sign(
      { userId: user.id },
      {
        key: env.JWT_REFRESH_SECRET,
        expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
      },
    );

    const newHash = sha256(newRefreshToken);
    const newExpiresAt = refreshExpiryDate();
    await refreshTokenRepo.create({
      userId: user.id,
      tokenHash: newHash,
      expiresAt: newExpiresAt,
    });

    return {
      auth: payload,
      user: {
        id: user.id,
        organizationId: user.organizationId,
        fullName: user.fullName,
        email: user.email,
        lastLoginAt: user.lastLoginAt,
      },
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: newExpiresAt,
    };
  },

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const tokenHash = sha256(refreshToken);
    try {
      await refreshTokenRepo.revokeByTokenHash(tokenHash);
    } catch {
      // noop
    }
  },
};
