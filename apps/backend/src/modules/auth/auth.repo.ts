import { prisma } from "../../shared/db/prisma.js";

export const authRepo = {
  async getUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  async getUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },
  async updateLastLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  },
};
