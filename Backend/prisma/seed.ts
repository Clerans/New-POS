import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data in correct dependency order
  await prisma.userRole.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});

  console.log('🧹 Cleaned existing database records.');

  // Create roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: 'System Administrator with full access',
    },
  });

  const userRole = await prisma.role.create({
    data: {
      name: 'USER',
      description: 'Standard staff/cashier user',
    },
  });

  console.log('👥 Created roles: ADMIN, USER.');

  // Create default admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@cafechai.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
    },
  });

  // Assign admin role to admin user
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('------------------------------------');
  console.log('Default Admin Account Credentials:');
  console.log('Email:    admin@cafechai.com');
  console.log('Password: admin123');
  console.log('------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
