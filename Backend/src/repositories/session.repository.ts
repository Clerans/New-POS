import { prisma } from '../config/db.js';

export class SessionRepository {
  async createSession(data: {
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    device?: string;
    browser?: string;
    os?: string;
  }) {
    return prisma.userSession.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        device: data.device,
        browser: data.browser,
        os: data.os,
        isValid: true,
      },
    });
  }

  async findSessionByToken(token: string) {
    return prisma.userSession.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findSessionById(id: string) {
    return prisma.userSession.findUnique({
      where: { id },
    });
  }

  async findActiveSessionsByUserId(userId: string) {
    return prisma.userSession.findMany({
      where: {
        userId,
        isValid: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async invalidateSessionByToken(token: string) {
    return prisma.userSession.update({
      where: { token },
      data: { isValid: false },
    });
  }

  async invalidateSessionById(id: string) {
    return prisma.userSession.update({
      where: { id },
      data: { isValid: false },
    });
  }

  async invalidateAllSessionsByUserId(userId: string) {
    return prisma.userSession.updateMany({
      where: { userId, isValid: true },
      data: { isValid: false },
    });
  }

  async cleanExpiredSessions() {
    return prisma.userSession.deleteMany({
      where: {
        OR: [
          { isValid: false },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });
  }
}

export default SessionRepository;
