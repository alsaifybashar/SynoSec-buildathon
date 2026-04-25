import crypto from "node:crypto";
import { prisma } from "@/shared/database/prisma-client.js";

type UpsertUserInput = {
  email: string;
  googleSubject: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type CreateSessionInput = {
  sessionId: string;
  sessionTokenHash: string;
  csrfToken: string;
  userId: string;
  expiresAt: Date;
};

export const authRepository = {
  async upsertUser(input: UpsertUserInput) {
    return prisma.user.upsert({
      where: { googleSubject: input.googleSubject },
      update: {
        email: input.email,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl
      },
      create: {
        id: crypto.randomUUID(),
        email: input.email,
        googleSubject: input.googleSubject,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl
      }
    });
  },

  async createSession(input: CreateSessionInput) {
    return prisma.session.create({
      data: {
        id: input.sessionId,
        sessionTokenHash: input.sessionTokenHash,
        csrfToken: input.csrfToken,
        userId: input.userId,
        expiresAt: input.expiresAt
      },
      include: {
        user: true
      }
    });
  },

  async findSessionByHash(sessionTokenHash: string) {
    return prisma.session.findUnique({
      where: { sessionTokenHash },
      include: { user: true }
    });
  },

  async touchSession(id: string) {
    return prisma.session.update({
      where: { id },
      data: {
        lastSeenAt: new Date()
      }
    });
  },

  async revokeSession(id: string) {
    return prisma.session.updateMany({
      where: {
        id,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }
};
