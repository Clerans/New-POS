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
  
  // Floor and Table Permissions
  { name: 'Restaurant.View', description: 'View floor plans and live table statuses' },
  { name: 'Restaurant.Manage', description: 'Manage floor layouts and operations' },
  { name: 'Floor.View', description: 'View dining floors' },
  { name: 'Floor.Create', description: 'Create dining floors' },
  { name: 'Floor.Edit', description: 'Edit dining floors' },
  { name: 'Floor.Delete', description: 'Delete dining floors' },
  { name: 'Table.View', description: 'View tables layout' },
  { name: 'Table.Create', description: 'Create restaurant tables' },
  { name: 'Table.Edit', description: 'Modify tables parameters' },
  { name: 'Table.Delete', description: 'Delete tables' },
  { name: 'Reservation.View', description: 'View reservations calendar' },
  { name: 'Reservation.Create', description: 'Create customer reservations' },
  { name: 'Reservation.Edit', description: 'Edit reservations' },
  { name: 'Reservation.Delete', description: 'Delete reservations' },
  { name: 'Waitlist.Manage', description: 'Manage walk-ins waitlist' },
  { name: 'QR.Generate', description: 'Generate table QR codes' },
  { name: 'Table.Merge', description: 'Merge restaurant tables' },
  { name: 'Table.Split', description: 'Split merged tables or bills' },
  { name: 'Table.Transfer', description: 'Transfer order tables' },

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

  // POS Enterprise System Permissions
  { name: 'POS.View', description: 'View POS cashier interface' },
  { name: 'POS.Create', description: 'Create POS orders' },
  { name: 'POS.Edit', description: 'Edit POS orders' },
  { name: 'POS.Delete', description: 'Delete or void POS orders' },
  { name: 'POS.Discount', description: 'Apply manual or percentage discounts' },
  { name: 'POS.PriceOverride', description: 'Override unit price of cart items' },
  { name: 'POS.Refund', description: 'Perform customer order refunds' },
  { name: 'POS.SplitBill', description: 'Split order bill payments' },
  { name: 'POS.MergeBill', description: 'Merge separate table orders' },
  { name: 'POS.Payment', description: 'Process cashier card/cash transactions' },
  { name: 'POS.CashDrawer', description: 'Manage cash drawer transactions' },
  { name: 'POS.CloseShift', description: 'Close cashier shift summaries' },
  { name: 'POS.PrintReceipt', description: 'Print POS invoice thermal receipts' },
  { name: 'POS.ReprintReceipt', description: 'Reprint POS invoices' },
  { name: 'POS.VoidOrder', description: 'Void active cart orders' },
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
  { name: 'Chai Latte Grande', sku: 'PRD-CHL-04', price: 5.00, cost: 0.90, stock: 6, minStock: 12, category: 'Tea' },
  { name: 'Earl Grey Special', sku: 'PRD-EGS-05', price: 3.50, cost: 0.60, stock: 45, minStock: 10, category: 'Tea' },
  { name: 'Blueberry Muffin', sku: 'PRD-BBM-06', price: 3.50, cost: 1.00, stock: 3, minStock: 10, category: 'Bakery' },
  { name: 'Chocolate Croissant', sku: 'PRD-CCR-07', price: 4.00, cost: 1.20, stock: 0, minStock: 10, category: 'Bakery' },
  { name: 'Classic Club Sandwich', sku: 'PRD-CCS-08', price: 8.50, cost: 3.00, stock: 25, minStock: 5, category: 'Sandwiches' },
  { name: 'Avocado Sourdough Toast', sku: 'PRD-AST-09', price: 9.50, cost: 3.50, stock: 30, minStock: 5, category: 'Sandwiches' },
  { name: 'New York Cheesecake', sku: 'PRD-NYC-10', price: 6.00, cost: 2.00, stock: 18, minStock: 5, category: 'Desserts' },
  { name: 'Macarons Gift Box', sku: 'PRD-MGB-11', price: 12.00, cost: 4.50, stock: 8, minStock: 5, category: 'Desserts' },
];

const FLOORS = [
  { name: 'Ground Floor', description: 'Main dining hall layout', color: '#1a1b26', displayOrder: 1 },
  { name: 'VIP Lounge', description: 'Premium private cabins', color: '#1f2335', displayOrder: 2 },
  { name: 'Terrace Bar', description: 'Outdoor rooftop view area', color: '#24283b', displayOrder: 3 },
];

// Tables with Canvas Coordinates
const TABLES = [
  { tableNumber: 'T01', capacity: 2, shape: 'SQUARE', x: 100, y: 120, width: 80, height: 80, floor: 'Ground Floor', status: 'AVAILABLE' },
  { tableNumber: 'T02', capacity: 4, shape: 'RECTANGLE', x: 250, y: 120, width: 120, height: 80, floor: 'Ground Floor', status: 'OCCUPIED' },
  { tableNumber: 'T03', capacity: 4, shape: 'ROUND', x: 450, y: 120, width: 90, height: 90, floor: 'Ground Floor', status: 'OCCUPIED' },
  { tableNumber: 'T04', capacity: 6, shape: 'BOOTH', x: 100, y: 280, width: 140, height: 80, floor: 'Ground Floor', status: 'CLEANING' },
  { tableNumber: 'T05', capacity: 2, shape: 'SQUARE', x: 280, y: 280, width: 80, height: 80, floor: 'Ground Floor', status: 'AVAILABLE' },
  { tableNumber: 'T06', capacity: 2, shape: 'ROUND', x: 420, y: 280, width: 80, height: 80, floor: 'Ground Floor', status: 'RESERVED' },
  { tableNumber: 'T07', capacity: 1, shape: 'BAR_STOOL', x: 580, y: 120, width: 50, height: 50, floor: 'Ground Floor', status: 'AVAILABLE' },
  { tableNumber: 'T08', capacity: 1, shape: 'BAR_STOOL', x: 580, y: 200, width: 50, height: 50, floor: 'Ground Floor', status: 'AVAILABLE' },
  // VIP Floor Tables
  { tableNumber: 'V01', capacity: 8, shape: 'BOOTH', x: 120, y: 150, width: 160, height: 90, floor: 'VIP Lounge', status: 'AVAILABLE' },
  { tableNumber: 'V02', capacity: 6, shape: 'OVAL', x: 380, y: 150, width: 130, height: 90, floor: 'VIP Lounge', status: 'AVAILABLE' },
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

const WAITLIST = [
  { queueNumber: 1, customerName: 'Frank Sinatra', customerPhone: '+15550999', guests: 2, priority: 'NORMAL', status: 'WAITING', estimatedWait: 15 },
  { queueNumber: 2, customerName: 'Dean Martin', customerPhone: '+15550888', guests: 4, priority: 'HIGH', status: 'WAITING', estimatedWait: 20 },
  { queueNumber: 3, customerName: 'Sammy Davis Jr', customerPhone: '+15550777', guests: 3, priority: 'VIP', status: 'WAITING', estimatedWait: 5 },
];

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing tables in correct order
  await prisma.couponRedemption.deleteMany({});
  await prisma.discountRule.deleteMany({});
  await prisma.taxRule.deleteMany({});
  await prisma.invoiceSequence.deleteMany({});
  await prisma.customerOrderHistory.deleteMany({});
  await prisma.orderNote.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.shiftTransaction.deleteMany({});
  await prisma.cashShift.deleteMany({});
  await prisma.cashDrawer.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.refundItem.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.heldOrderItem.deleteMany({});
  await prisma.heldOrder.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.orderDiscount.deleteMany({});
  await prisma.orderItemModifier.deleteMany({});
  await prisma.tablePosition.deleteMany({});
  await prisma.tableSessionLog.deleteMany({});
  await prisma.tableSession.deleteMany({});
  await prisma.tableMergeItem.deleteMany({});
  await prisma.tableMerge.deleteMany({});
  await prisma.tableQrCode.deleteMany({});
  await prisma.tableStatusHistory.deleteMany({});
  await prisma.reservationLog.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.waitlist.deleteMany({});
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
  await prisma.restaurantTable.deleteMany({});
  await prisma.floor.deleteMany({});
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

  // Create Floors
  const floorMap: Record<string, any> = {};
  for (const fl of FLOORS) {
    const createdFloor = await prisma.floor.create({
      data: {
        name: fl.name,
        description: fl.description,
        color: fl.color,
        displayOrder: fl.displayOrder,
        branchId: mainBranch.id,
      },
    });
    floorMap[fl.name] = createdFloor;
  }
  console.log(`🗺️ Created ${FLOORS.length} restaurant floors.`);

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
  const rolePermissionsData: any[] = [];
  for (const roleName of ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER']) {
    const roleObj = roleMap[roleName];
    for (const perm of allPermissions) {
      rolePermissionsData.push({ roleId: roleObj.id, permissionId: perm.id });
    }
  }
  await prisma.rolePermission.createMany({ data: rolePermissionsData });

  // Link specific permissions to Waiter & Staff
  const waiterPermissions = [
    'Restaurant.View',
    'Table.View',
    'Reservation.View',
    'Reservation.Create',
    'Reservation.Edit',
    'Orders.Create',
    'Orders.Update',
  ];
  const waiterRolePermissionsData: any[] = [];
  for (const name of waiterPermissions) {
    const perm = permissionMap[name];
    if (perm) {
      waiterRolePermissionsData.push({ roleId: roleMap['WAITER'].id, permissionId: perm.id });
    }
  }
  await prisma.rolePermission.createMany({ data: waiterRolePermissionsData });

  const cashierPermissions = [
    'Restaurant.View',
    'Table.View',
    'Reservation.View',
    'Orders.Create',
    'Orders.Update',
    'POS.View',
    'POS.Create',
    'POS.Edit',
    'POS.Discount',
    'POS.Payment',
    'POS.PrintReceipt',
    'POS.ReprintReceipt',
    'POS.CashDrawer',
  ];
  const cashierRolePermissionsData: any[] = [];
  for (const name of cashierPermissions) {
    const perm = permissionMap[name];
    if (perm) {
      cashierRolePermissionsData.push({ roleId: roleMap['CASHIER'].id, permissionId: perm.id });
    }
  }
  await prisma.rolePermission.createMany({ data: cashierRolePermissionsData });
  console.log('🔗 Configured roles and permissions matrix.');

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

  // Seed Categories
  const categoryMap: Record<string, any> = {};
  for (const catName of CATEGORIES) {
    const createdCat = await prisma.category.create({ data: { name: catName } });
    categoryMap[catName] = createdCat;
  }

  // Seed Products
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

  // Seed Tables & Positions & QRCodes
  const tablesList: any[] = [];
  for (const tab of TABLES) {
    const createdTab = await prisma.restaurantTable.create({
      data: {
        tableNumber: tab.tableNumber,
        displayName: `${tab.floor} - ${tab.tableNumber}`,
        capacity: tab.capacity,
        shape: tab.shape,
        width: tab.width,
        height: tab.height,
        rotation: 0,
        status: tab.status,
        branchId: mainBranch.id,
        floorId: floorMap[tab.floor].id,
      },
    });

    // Seed visual placement position
    await prisma.tablePosition.create({
      data: {
        tableId: createdTab.id,
        x: tab.x,
        y: tab.y,
        rotation: 0,
      },
    });

    // Seed mock SVG QR payload
    await prisma.tableQrCode.create({
      data: {
        tableId: createdTab.id,
        qrData: `http://localhost:5173/menu?table=${createdTab.tableNumber}`,
        svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><rect x="15" y="15" width="20" height="20" fill="#000"/><rect x="65" y="15" width="20" height="20" fill="#000"/><rect x="15" y="65" width="20" height="20" fill="#000"/><path d="M 40 20 H 50 V 30 H 40 Z M 45 45 H 55 V 55 H 45 Z M 20 40 H 30 V 50 H 20 Z M 60 60 H 80 V 80 H 60 Z" fill="#000"/></svg>`,
      },
    });

    tablesList.push(createdTab);
  }
  console.log(`🍽️ Seeded ${TABLES.length} tables, coordinates positions, and QR codes.`);

  // Seed Customers
  const customersList: any[] = [];
  for (const cust of CUSTOMERS) {
    const createdCust = await prisma.customer.create({ data: cust });
    customersList.push(createdCust);
  }

  // Seed Reservations
  const today = new Date();
  const res1 = await prisma.reservation.create({
    data: {
      reservationNumber: 'RES-99812',
      customerName: 'George Clooney',
      customerPhone: '+15559999',
      guests: 4,
      reservationTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0), // 7:00 PM
      status: 'CONFIRMED',
      tableId: tablesList[5].id, // Table 6
    },
  });

  const res2 = await prisma.reservation.create({
    data: {
      reservationNumber: 'RES-99813',
      customerName: 'Brad Pitt',
      customerPhone: '+15558888',
      guests: 2,
      reservationTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30), // 12:30 PM
      status: 'SEATED',
      tableId: tablesList[0].id, // Table 1
    },
  });

  // Seed Waitlist queue
  for (const wl of WAITLIST) {
    await prisma.waitlist.create({
      data: {
        queueNumber: wl.queueNumber,
        customerName: wl.customerName,
        customerPhone: wl.customerPhone,
        guests: wl.guests,
        priority: wl.priority,
        status: wl.status,
        estimatedWait: wl.estimatedWait,
        branchId: mainBranch.id,
      },
    });
  }
  console.log('📋 Seeded walk-ins waitlist queues.');

  // Seed Expenses
  for (let i = 0; i < 20; i++) {
    const expTemplate = EXPENSES[i % EXPENSES.length];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() - (i % 30));
    await prisma.expense.create({
      data: {
        amount: expTemplate.amount + (Math.random() * 20 - 10),
        category: expTemplate.category,
        description: expTemplate.description,
        branchId: i % 2 === 0 ? mainBranch.id : downtownBranch.id,
        createdAt: expDate,
      },
    });
  }

  // Seed Orders & Items & Payments (Generative Loop: 120 orders over past 30 days)
  console.log('📦 Seeding generative historical POS orders...');
  const paymentMethods = ['CASH', 'CARD', 'QR', 'ONLINE'];
  const orderTypes = ['EAT_IN', 'TAKEAWAY', 'DELIVERY'];
  const orderStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'REFUNDED', 'CANCELLED'];
  const kitchenStatuses = ['SERVED', 'SERVED', 'SERVED', 'SERVED', 'PREPARING', 'READY', 'PENDING'];

  for (let idx = 1; idx <= 120; idx++) {
    const orderNum = `CC-${1000 + idx}`;
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    const rand = Math.random();
    let hour = 8;
    if (rand < 0.35) {
      hour = 12 + Math.floor(Math.random() * 3);
    } else if (rand < 0.70) {
      hour = 17 + Math.floor(Math.random() * 3);
    } else {
      hour = 8 + Math.floor(Math.random() * 9);
    }
    date.setHours(hour, Math.floor(Math.random() * 60), 0);

    const isDowntown = idx % 3 === 0;
    const branchId = isDowntown ? downtownBranch.id : mainBranch.id;

    const numItems = 1 + Math.floor(Math.random() * 3);
    const selectedProds: any[] = [];
    while (selectedProds.length < numItems) {
      const p = productsList[Math.floor(Math.random() * productsList.length)];
      if (!selectedProds.find(sp => sp.id === p.id)) {
        selectedProds.push(p);
      }
    }

    let subtotal = 0;
    const itemsData = selectedProds.map(prod => {
      const quantity = 1 + Math.floor(Math.random() * 2);
      const price = prod.price;
      subtotal += price * quantity;
      return { productId: prod.id, quantity, price };
    });

    const discount = Math.random() < 0.15 ? subtotal * 0.1 : 0;
    const tax = (subtotal - discount) * 0.08;
    const serviceCharge = Math.random() < 0.5 ? 2.50 : 0.0;
    const total = subtotal - discount + tax + serviceCharge;

    const status = orderStatuses[idx % orderStatuses.length];
    const paymentStatus = status === 'COMPLETED' ? 'PAID' : status === 'REFUNDED' ? 'REFUNDED' : 'UNPAID';
    const paymentMethod = paymentMethods[idx % paymentMethods.length];
    const orderType = orderTypes[idx % orderTypes.length];

    const customer = Math.random() < 0.4 ? customersList[idx % customersList.length] : null;
    const table = orderType === 'EAT_IN' ? tablesList[idx % tablesList.length] : null;

    const prepTime = 5 + Math.floor(Math.random() * 15);
    const servTime = 2 + Math.floor(Math.random() * 8);

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

  // Seed Cash Drawers
  const mainDrawer = await prisma.cashDrawer.create({
    data: {
      name: 'Main Cash Register',
      branchId: mainBranch.id,
      balance: 250.00,
      status: 'CLOSED',
    },
  });
  console.log('💵 Seeded default Cash Drawer.');

  // Seed Tax Rules
  await prisma.taxRule.createMany({
    data: [
      { name: 'VAT Standard (10%)', rate: 10.0, type: 'PERCENTAGE', isInclusive: false },
      { name: 'VAT Inclusive (8%)', rate: 8.0, type: 'PERCENTAGE', isInclusive: true },
      { name: 'Service Tax (5%)', rate: 5.0, type: 'PERCENTAGE', isInclusive: false },
    ],
  });
  console.log('📊 Seeded default Tax Rules.');

  // Seed Discount Rules (Coupons)
  await prisma.discountRule.createMany({
    data: [
      { name: 'Welcome Voucher (10%)', type: 'PERCENTAGE', value: 10.0, code: 'WELCOME10', minSpend: 15.0 },
      { name: 'Happy Hour $5 Off', type: 'FIXED', value: 5.0, code: 'HAPPY5', minSpend: 20.0 },
      { name: 'Employee Discount (15%)', type: 'PERCENTAGE', value: 15.0, code: 'STAFF15' },
    ],
  });
  console.log('🏷️ Seeded default Coupons / Discount Rules.');

  // Seed Invoice Sequence
  await prisma.invoiceSequence.create({
    data: {
      prefix: 'CC-2026-',
      nextValue: 1200,
    },
  });
  console.log('🔢 Seeded Invoice Sequence.');

  console.log('✅ Seeding complete successfully!');
  console.log('------------------------------------');
  console.log('System layout tables and queues initialized.');
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
