import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { name: 'Dashboard.View', description: 'View dashboard metrics' },
  { name: 'Dashboard.Edit', description: 'Modify dashboard widgets and settings' },
  { name: 'Orders.Create', description: 'Create new customer orders' },
  { name: 'Orders.Update', description: 'Update existing customer orders' },
  { name: 'Orders.Delete', description: 'Delete or void customer orders' },
  { name: 'Products.View', description: 'View product catalog and prices' },
  { name: 'Products.Create', description: 'Create new products or variants' },
  { name: 'Products.Edit', description: 'Edit existing products and pricing' },
  { name: 'Products.Delete', description: 'Delete products from catalog' },
  { name: 'Customers.View', description: 'View customer information' },
  { name: 'Customers.Edit', description: 'Manage customer accounts' },
  { name: 'Inventory.View', description: 'View inventory status and logs' },
  { name: 'Inventory.Edit', description: 'Update inventory stock levels' },
  { name: 'Kitchen.View', description: 'View kitchen display screen orders' },
  { name: 'Kitchen.Edit', description: 'Manage order statuses in kitchen' },
  { name: 'Reports.View', description: 'View sales, product, and staff reports' },
  { name: 'Reports.Export', description: 'Export sales reports and audit data' },
  { name: 'Employees.View', description: 'View employees list' },
  { name: 'Employees.Manage', description: 'Manage employee records, shifts, and data' },
  { name: 'Settings.Manage', description: 'Manage global system settings' },
  { name: 'Users.Manage', description: 'Manage system users and statuses' },
  { name: 'Permissions.Manage', description: 'Manage roles and permission matrix' },
  { name: 'AuditLogs.View', description: 'View security audit and activity logs' },
];

const ROLES = [
  { name: 'SUPER_ADMIN', description: 'Global Super Admin with root access' },
  { name: 'OWNER', description: 'Business Owner with full operational access' },
  { name: 'ADMIN', description: 'System Administrator' },
  { name: 'MANAGER', description: 'Branch Store Manager' },
  { name: 'CASHIER', description: 'Front desk cashier' },
  { name: 'WAITER', description: 'Table service staff' },
  { name: 'KITCHEN_STAFF', description: 'Kitchen/Chef staff' },
  { name: 'INVENTORY_STAFF', description: 'Warehouse and inventory keeper' },
  { name: 'CUSTOMER', description: 'Customer portal access' },
];

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing tables in correct order
  await prisma.userRole.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.emailVerificationToken.deleteMany({});
  await prisma.loginHistory.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});

  console.log('🧹 Cleaned existing database records.');

  // Create Branches
  const mainBranch = await prisma.branch.create({
    data: {
      name: 'Main Head Office',
      code: 'MHO-01',
    },
  });

  const downtownBranch = await prisma.branch.create({
    data: {
      name: 'Downtown CafeChai',
      code: 'DCC-02',
    },
  });

  console.log('🏢 Created branches: Main, Downtown.');

  // Create Permissions
  const permissionMap: Record<string, any> = {};
  for (const perm of PERMISSIONS) {
    const createdPerm = await prisma.permission.create({
      data: perm,
    });
    permissionMap[perm.name] = createdPerm;
  }
  console.log(`🔑 Created ${PERMISSIONS.length} granular permissions.`);

  // Create Roles
  const roleMap: Record<string, any> = {};
  for (const role of ROLES) {
    const createdRole = await prisma.role.create({
      data: role,
    });
    roleMap[role.name] = createdRole;
  }
  console.log(`👥 Created ${ROLES.length} system roles.`);

  // Assign permissions to roles
  // SUPER_ADMIN, OWNER, ADMIN get all permissions
  const allPermissions = Object.values(permissionMap);
  for (const roleName of ['SUPER_ADMIN', 'OWNER', 'ADMIN']) {
    const roleObj = roleMap[roleName];
    for (const perm of allPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: roleObj.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // MANAGER permissions
  const managerExclusions = ['Settings.Manage', 'Permissions.Manage', 'AuditLogs.View'];
  const managerPermissions = allPermissions.filter(p => !managerExclusions.includes(p.name));
  for (const perm of managerPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: roleMap['MANAGER'].id,
        permissionId: perm.id,
      },
    });
  }

  // CASHIER permissions
  const cashierPermissions = [
    'Dashboard.View',
    'Orders.Create',
    'Orders.Update',
    'Products.View',
    'Customers.View',
    'Customers.Edit',
  ];
  for (const name of cashierPermissions) {
    const perm = permissionMap[name];
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roleMap['CASHIER'].id,
          permissionId: perm.id,
        },
      });
    }
  }

  // WAITER permissions
  const waiterPermissions = ['Dashboard.View', 'Orders.Create', 'Orders.Update', 'Products.View'];
  for (const name of waiterPermissions) {
    const perm = permissionMap[name];
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roleMap['WAITER'].id,
          permissionId: perm.id,
        },
      });
    }
  }

  // KITCHEN STAFF permissions
  const kitchenPermissions = ['Kitchen.View', 'Kitchen.Edit'];
  for (const name of kitchenPermissions) {
    const perm = permissionMap[name];
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roleMap['KITCHEN_STAFF'].id,
          permissionId: perm.id,
        },
      });
    }
  }

  // INVENTORY STAFF permissions
  const inventoryPermissions = ['Inventory.View', 'Inventory.Edit', 'Products.View'];
  for (const name of inventoryPermissions) {
    const perm = permissionMap[name];
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roleMap['INVENTORY_STAFF'].id,
          permissionId: perm.id,
        },
      });
    }
  }

  // CUSTOMER permissions
  const customerPermissions = ['Dashboard.View'];
  for (const name of customerPermissions) {
    const perm = permissionMap[name];
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roleMap['CUSTOMER'].id,
          permissionId: perm.id,
        },
      });
    }
  }

  console.log('🔗 Linked permissions to roles.');

  // Create default Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@cafechai.com',
      username: 'admin',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'System Administrator',
      phone: '+1234567890',
      emailVerified: true,
      phoneVerified: true,
      status: 'ACTIVE',
      branchId: mainBranch.id,
    },
  });

  // Assign multiple roles to the admin user
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: roleMap['SUPER_ADMIN'].id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: roleMap['ADMIN'].id,
    },
  });

  console.log('✅ Seeding complete successfully!');
  console.log('------------------------------------');
  console.log('Admin Account Credentials:');
  console.log('Email:         admin@cafechai.com');
  console.log('Username:      admin');
  console.log('Password:      admin123');
  console.log('Branch:        Main Head Office');
  console.log('Assigned Roles: SUPER_ADMIN, ADMIN');
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
