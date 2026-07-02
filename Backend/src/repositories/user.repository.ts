import { prisma } from '../config/db.js';

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
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
    });
  }

  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
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
    });
  }

  async findByEmailOrUsername(identifier: string) {
    return prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
        ],
      },
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
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async create(data: {
    email: string;
    username?: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    status?: string;
    branchId?: string;
  }) {
    return prisma.user.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async incrementFailedAttempts(id: string, currentAttempts: number) {
    const attempts = currentAttempts + 1;
    const maxAttempts = 5;
    const isLocking = attempts >= maxAttempts;
    const lockedUntil = isLocking ? new Date(Date.now() + 15 * 60 * 1000) : null; // 15 mins lock

    return prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: attempts,
        status: isLocking ? 'LOCKED' : undefined,
        lockedUntil,
      },
    });
  }

  async resetFailedAttempts(id: string) {
    return prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: 'ACTIVE',
      },
    });
  }

  // Password reset tokens
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    // Invalidate existing tokens first
    await prisma.passwordResetToken.updateMany({
      where: { userId, isUsed: false },
      data: { isUsed: true },
    });

    return prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async findPasswordResetToken(token: string) {
    return prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async markPasswordResetTokenUsed(token: string) {
    return prisma.passwordResetToken.update({
      where: { token },
      data: { isUsed: true },
    });
  }

  // Email verification tokens
  async createEmailVerificationToken(userId: string, token: string, expiresAt: Date) {
    await prisma.emailVerificationToken.updateMany({
      where: { userId, isUsed: false },
      data: { isUsed: true },
    });

    return prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async findEmailVerificationToken(token: string) {
    return prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async markEmailVerificationTokenUsed(token: string) {
    return prisma.emailVerificationToken.update({
      where: { token },
      data: { isUsed: true },
    });
  }

  // Login History Logging
  async logLoginAttempt(data: {
    userId?: string;
    email: string;
    ipAddress?: string;
    userAgent?: string;
    device?: string;
    browser?: string;
    os?: string;
    status: string;
    failReason?: string;
  }) {
    return prisma.loginHistory.create({
      data,
    });
  }

  async getLoginHistory(userId: string) {
    return prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // Audit and Activity logs
  async createAuditLog(data: {
    userId?: string;
    entityName: string;
    entityId: string;
    action: string;
    oldValue?: string;
    newValue?: string;
    ipAddress?: string;
    userAgent?: string;
    device?: string;
    browser?: string;
    os?: string;
  }) {
    return prisma.auditLog.create({
      data,
    });
  }

  async getAuditLogs(userId?: string) {
    return prisma.auditLog.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createActivityLog(data: {
    userId?: string;
    action: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    device?: string;
    browser?: string;
    os?: string;
  }) {
    return prisma.activityLog.create({
      data,
    });
  }

  async getActivityLogs(userId: string) {
    return prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

export default UserRepository;
