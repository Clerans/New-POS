import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { name: 'Dashboard.View', description: 'View dashboard metrics' },
  { name: 'Dashboard.Analytics', description: 'View advanced analytics widgets' },
  { name: 'Dashboard.Finance', description: 'View financial details and margins' },
  { name: 'Dashboard.Inventory', description: 'View stock alerts and values' },
  { name: 'Dashboard.Kitchen', description: 'View kitchen queues' },
  { name: 'Dashboard.Reports', description: 'View performance reports' },
  { name: 'Dashboard.Export', description: 'Export POS metrics and lists' },
  { name: 'Dashboard.Settings', description: 'Configure dashboard configurations' },
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

const CATEGORIES = ['Coffee', 'Tea', 'Bakery', 'Sandwiches', 'Desserts'];

const PRODUCTS = [
  { name: 'Espresso Single', sku: 'PRD-ESP-01', price: 3.00, cost: 0.50, stock: 150, minStock: 20, category: 'Coffee' },
  { name: 'Caffe Latte Grande', sku: 'PRD-LAT-02', price: 4.50, cost: 0.80, stock: 100, minStock: 15, category: 'Coffee' },
  { name: 'Cappuccino Mugs', sku: 'PRD-CAP-03', price: 4.50, cost: 0.80, stock: 120, minStock: 15, category: 'Coffee' },
  { name: 'Chai Latte Grande', sku: 'PRD-CHL-04', price: 5.00, cost: 0.90, stock: 6, minStock: 12, category: 'Tea' }, // Alert: Low Stock
  { name: 'Earl Grey Special', sku: 'PRD-EGS-05', price: 3.50, cost: 0.60, stock: 45, minStock: 10, category: 'Tea' },
  { name: 'Blueberry Muffin', sku: 'PRD-BBM-06', price: 3.50, cost: 1.00, stock: 3, minStock: 10, category: 'Bakery' }, // Alert: Low Stock
  { name: 'Chocolate Croissant', sku: 'PRD-CCR-07', price: 4.00, cost: 1.20, stock: 0, minStock: 10, category: 'Bakery' }, // Alert: Out of Stock
  { name: 'Classic Club Sandwich', sku: 'PRD-CCS-08', price: 8.50, cost: 3.00, stock: 25, minStock: 5, category: 'Sandwiches' },
  { name: 'Avocado Sourdough Toast', sku: 'PRD-AST-09', price: 9.50, cost: 3.50, stock: 30, minStock: 5, category: 'Sandwiches' },
  { name: 'New York Cheesecake', sku: 'PRD-NYC-10', price: 6.00, cost: 2.00, stock: 18, minStock: 5, category: 'Desserts' },
  { name: 'Macarons Gift Box', sku: 'PRD-MGB-11', price: 12.00, cost: 4.50, stock: 8, minStock: 5, category: 'Desserts' },
];

const TABLES = [
  { name: 'Table 01', capacity: 2, status: 'AVAILABLE' },
  { name: 'Table 02', capacity: 2, status: 'OCCUPIED' },
  { name: 'Table 03', capacity: 4, status: 'OCCUPIED' },
  { name: 'Table 04', capacity: 4, status: 'CLEANING' },
  { name: 'Table 05', capacity: 6, status: 'RESERVED' },
  { name: 'Table 06', capacity: 2, status: 'AVAILABLE' },
  { name: 'Table 07', capacity: 4, status: 'AVAILABLE' },
];

const CUSTOMERS = [
  { name: 'Alice Johnson', email: 'alice@example.com', phone: '+15550101', isLoyaltyMember: true, loyaltyPoints: 340 },
  { name: 'Bob Smith', email: 'bob@example.com', phone: '+15550102', isLoyaltyMember: true, loyaltyPoints: 110 },
  { name: 'Charlie Brown', email: 'charlie@example.com', phone: '+15550103', isLoyaltyMember: true, loyaltyPoints: 210 },
  { name: 'Diana Prince', email: 'diana@example.com', phone: '+15550104', isLoyaltyMember: false, loyaltyPoints: 0 },
];

const EXPENSES = [
  { amount: 45.00, category: 'Food & Beverage', description: 'Fresh organic milk restock (15L)' },
  { amount: 35.00, category: 'Supplies', description: 'POS receipt thermal paper rolls' },
  { amount: 180.00, category: 'Inventory', description: 'Avocado and fresh greens restock' },
  { amount: 250.00, category: 'Utilities', description: 'Electricity bill Downtown branch' },
  { amount: 650.00, category: 'Rent', description: 'Monthly kitchen space rent contribution' },
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
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.restaurantTable.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});

  console.log('🧹 Cleaned existing database records.');

  // Create Branches
  const mainBranch = await prisma.branch.create({
    data: { name: 'Main Head Office', code: 'MHO-01' },
  });

  const downtownBranch = await prisma.branch.create({
    data: { name: 'Downtown CafeChai', code: 'DCC-02' },
  });

  console.log('🏢 Created branches.');

  // Create Permissions
  const permissionMap: Record<string, any> = {};
  for (const perm of PERMISSIONS) {
    const createdPerm = await prisma.permission.create({ data: perm });
    permissionMap[perm.name] = createdPerm;
  }
  console.log(`🔑 Created ${PERMISSIONS.length} granular permissions.`);

  // Create Roles
  const roleMap: Record<string, any> = {};
  for (const role of ROLES) {
    const createdRole = await prisma.role.create({ data: role });
    roleMap[role.name] = createdRole;
  }
  console.log(`👥 Created ${ROLES.length} system roles.`);

  // Link all permissions to admin roles
  const allPermissions = Object.values(permissionMap);
  for (const roleName of ['SUPER_ADMIN', 'OWNER', 'ADMIN']) {
    const roleObj = roleMap[roleName];
    for (const perm of allPermissions) {
      await prisma.rolePermission.create({
        data: { roleId: roleObj.id, permissionId: perm.id },
      });
    }
  }

  // Link specific permissions to Cashier
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
        data: { roleId: roleMap['CASHIER'].id, permissionId: perm.id },
      });
    }
  }
  console.log('🔗 Configured roles and permissions.');

  // Create default admin user
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

  await prisma.userRole.create({ data: { userId: adminUser.id, roleId: roleMap['SUPER_ADMIN'].id } });
  await prisma.userRole.create({ data: { userId: adminUser.id, roleId: roleMap['ADMIN'].id } });

  // 1. Seed Categories
  const categoryMap: Record<string, any> = {};
  for (const catName of CATEGORIES) {
    const createdCat = await prisma.category.create({ data: { name: catName } });
    categoryMap[catName] = createdCat;
  }

  // 2. Seed Products
  const productsList: any[] = [];
  for (const prod of PRODUCTS) {
    const createdProd = await prisma.product.create({
      data: {
        name: prod.name,
        sku: prod.sku,
        price: prod.price,
        cost: prod.cost,
        stock: prod.stock,
        minStock: prod.minStock,
        categoryId: categoryMap[prod.category].id,
      },
    });
    productsList.push(createdProd);
  }

  // 3. Seed Tables
  const tablesList: any[] = [];
  for (const tab of TABLES) {
    const createdTab = await prisma.restaurantTable.create({
      data: {
        name: tab.name,
        capacity: tab.capacity,
        status: tab.status,
        branchId: mainBranch.id,
      },
    });
    tablesList.push(createdTab);
  }

  // 4. Seed Customers
  const customersList: any[] = [];
  for (const cust of CUSTOMERS) {
    const createdCust = await prisma.customer.create({ data: cust });
    customersList.push(createdCust);
  }

  // 5. Seed Reservations
  const today = new Date();
  const res1 = await prisma.reservation.create({
    data: {
      customerName: 'George Clooney',
      customerPhone: '+15559999',
      guests: 4,
      reservationTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0), // 7:00 PM
      status: 'CONFIRMED',
      tableId: tablesList[4].id, // Table 5
    },
  });

  const res2 = await prisma.reservation.create({
    data: {
      customerName: 'Brad Pitt',
      customerPhone: '+15558888',
      guests: 2,
      reservationTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30), // 12:30 PM
      status: 'SEATED',
      tableId: tablesList[0].id, // Table 1
    },
  });

  // 6. Seed Expenses
  for (let i = 0; i < 20; i++) {
    const expTemplate = EXPENSES[i % EXPENSES.length];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() - (i % 30)); // spread over 30 days
    await prisma.expense.create({
      data: {
        amount: expTemplate.amount + (Math.random() * 20 - 10), // slight fluctuation
        category: expTemplate.category,
        description: expTemplate.description,
        branchId: i % 2 === 0 ? mainBranch.id : downtownBranch.id,
        createdAt: expDate,
      },
    });
  }

  // 7. Seed Orders & OrderItems & Payments (Generative Loop: 120 orders over past 30 days)
  console.log('📦 Seeding generative historical POS orders...');
  const paymentMethods = ['CASH', 'CARD', 'QR', 'ONLINE'];
  const orderTypes = ['EAT_IN', 'TAKEAWAY', 'DELIVERY'];
  const orderStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'REFUNDED', 'CANCELLED'];
  const kitchenStatuses = ['SERVED', 'SERVED', 'SERVED', 'SERVED', 'PREPARING', 'READY', 'PENDING'];

  for (let idx = 1; idx <= 120; idx++) {
    const orderNum = `CC-${1000 + idx}`;
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // random day in last 30 days
    
    // Simulate peak times (Lunch 12-2, Dinner 5-7, Afternoon 3-4)
    const rand = Math.random();
    let hour = 8;
    if (rand < 0.35) {
      hour = 12 + Math.floor(Math.random() * 3); // 12 PM - 2 PM
    } else if (rand < 0.70) {
      hour = 17 + Math.floor(Math.random() * 3); // 5 PM - 7 PM
    } else {
      hour = 8 + Math.floor(Math.random() * 9); // general working hours 8 AM - 5 PM
    }
    date.setHours(hour, Math.floor(Math.random() * 60), 0);

    const isDowntown = idx % 3 === 0;
    const branchId = isDowntown ? downtownBranch.id : mainBranch.id;

    // Pick random items
    const numItems = 1 + Math.floor(Math.random() * 3); // 1-3 items
    const selectedProds: any[] = [];
    while (selectedProds.length < numItems) {
      const p = productsList[Math.floor(Math.random() * productsList.length)];
      if (!selectedProds.find(sp => sp.id === p.id)) {
        selectedProds.push(p);
      }
    }

    let subtotal = 0;
    const itemsData = selectedProds.map(prod => {
      const quantity = 1 + Math.floor(Math.random() * 2); // 1-2 items
      const price = prod.price;
      subtotal += price * quantity;
      return { productId: prod.id, quantity, price };
    });

    const discount = Math.random() < 0.15 ? subtotal * 0.1 : 0; // 10% discount sometimes
    const tax = (subtotal - discount) * 0.08; // 8% tax
    const serviceCharge = Math.random() < 0.5 ? 2.50 : 0.0;
    const total = subtotal - discount + tax + serviceCharge;

    const status = orderStatuses[idx % orderStatuses.length];
    const paymentStatus = status === 'COMPLETED' ? 'PAID' : status === 'REFUNDED' ? 'REFUNDED' : 'UNPAID';
    const paymentMethod = paymentMethods[idx % paymentMethods.length];
    const orderType = orderTypes[idx % orderTypes.length];

    // Pick random customer or walk-in
    const customer = Math.random() < 0.4 ? customersList[idx % customersList.length] : null;
    // Pick table if Eat In
    const table = orderType === 'EAT_IN' ? tablesList[idx % tablesList.length] : null;

    const prepTime = 5 + Math.floor(Math.random() * 15); // 5-20 mins
    const servTime = 2 + Math.floor(Math.random() * 8); // 2-10 mins

    const createdOrder = await prisma.order.create({
      data: {
        orderNumber: orderNum,
        orderType,
        status: status === 'COMPLETED' ? kitchenStatuses[idx % kitchenStatuses.length] : status,
        paymentStatus,
        paymentMethod,
        subtotal,
        discount,
        tax,
        serviceCharge,
        total,
        preparationTime: prepTime,
        servingTime: servTime,
        userId: adminUser.id,
        branchId,
        customerId: customer?.id,
        tableId: table?.id,
        createdAt: date,
        updatedAt: date,
      },
    });

    // Create items
    for (const item of itemsData) {
      await prisma.orderItem.create({
        data: {
          orderId: createdOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          createdAt: date,
        },
      });
    }

    // Create payment
    if (paymentStatus === 'PAID') {
      await prisma.payment.create({
        data: {
          orderId: createdOrder.id,
          amount: total,
          method: paymentMethod,
          createdAt: date,
        },
      });
    }
  }

  console.log('✅ Seeding complete successfully!');
  console.log('------------------------------------');
  console.log('System is ready for Dashboard Part 03 analytics.');
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
