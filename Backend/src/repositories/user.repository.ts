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

  async create(data: { email: string; passwordHash: string; firstName?: string; lastName?: string }) {
    return prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Partial<{ email: string; passwordHash: string; firstName: string; lastName: string; isActive: boolean }>) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }
}

export default UserRepository;
