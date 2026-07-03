import { prisma } from '../config/db.js';
import { getDateRangeFromFilter } from '../utils/dateHelper.js';

export class DashboardService {
  // Helper to calculate percentage changes
  private calcPercentChange(current: number, previous: number): { value: number; type: 'up' | 'down' } {
    if (previous === 0) {
      return { value: current > 0 ? 100 : 0, type: 'up' };
    }
    const pct = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(pct * 10) / 10),
      type: pct >= 0 ? 'up' : 'down',
    };
  }

  async getSummary(branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const branchFilter = branchId ? { branchId } : {};

    // 1. Today's orders & sales
    const todayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        ...branchFilter,
      },
    });

    const yesterdayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: yesterday, lt: today },
        ...branchFilter,
      },
    });

    // Compute sales totals
    const todaySales = todayOrders
      .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
      .reduce((sum, o) => sum + o.total, 0);

    const yesterdaySales = yesterdayOrders
      .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
      .reduce((sum, o) => sum + o.total, 0);

    const salesTrend = this.calcPercentChange(todaySales, yesterdaySales);
    const ordersTrend = this.calcPercentChange(todayOrders.length, yesterdayOrders.length);

    // 2. Customers today (Unique Customer IDs or distinct transactions)
    const todayCustCount = new Set(todayOrders.map((o) => o.customerId || o.id)).size;
    const yesterdayCustCount = new Set(yesterdayOrders.map((o) => o.customerId || o.id)).size;
    const custTrend = this.calcPercentChange(todayCustCount, yesterdayCustCount);

    // 3. Average Order Value
    const todayAOV = todayOrders.length > 0 ? todaySales / todayOrders.length : 0;
    const yesterdayAOV = yesterdayOrders.length > 0 ? yesterdaySales / yesterdayOrders.length : 0;
    const aovTrend = this.calcPercentChange(todayAOV, yesterdayAOV);

    // 4. Pending / Preparing Kitchen Queue
    const pendingOrdersCount = await prisma.order.count({
      where: {
        status: { in: ['PENDING', 'PREPARING', 'READY'] },
        ...branchFilter,
      },
    });

    const kitchenQueueCount = await prisma.order.count({
      where: {
        status: { in: ['PREPARING', 'READY'] },
        ...branchFilter,
      },
    });

    // 5. Table occupancy status
    const activeTablesCount = await prisma.restaurantTable.count({
      where: {
        status: 'OCCUPIED',
        ...branchFilter,
      },
    });

    // 6. Inventory stock warnings
    const inventoryAlertsCount = await prisma.product.count({
      where: {
        stock: { lte: prisma.product.fields.minStock },
      },
    });

    // 7. Today's Expenses
    const todayExpensesList = await prisma.expense.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        ...branchFilter,
      },
    });
    const todayExpenses = todayExpensesList.reduce((sum, e) => sum + e.amount, 0);

    // 8. Monthly summaries
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: thisMonthStart, lt: tomorrow },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        ...branchFilter,
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    const monthlyExpensesList = await prisma.expense.findMany({
      where: {
        createdAt: { gte: thisMonthStart, lt: tomorrow },
        ...branchFilter,
      },
    });

    const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + o.total, 0);
    const monthlyExpenses = monthlyExpensesList.reduce((sum, e) => sum + e.amount, 0);

    // Calculate cost of goods sold (COGS) to find profit
    let monthlyCOGS = 0;
    monthlyOrders.forEach((o) => {
      o.orderItems.forEach((item) => {
        monthlyCOGS += item.quantity * (item.product?.cost || 0);
      });
    });

    const monthlyProfit = monthlyRevenue - monthlyCOGS - monthlyExpenses;

    // 9. Customers totals
    const totalCustomers = await prisma.customer.count();
    const loyaltyMembers = await prisma.customer.count({
      where: { isLoyaltyMember: true },
    });

    // 10. Staff roster count today
    const employeesWorking = new Set(todayOrders.map((o) => o.userId).filter(Boolean)).size || 1;

    // 11. Reservations today
    const reservationsToday = await prisma.reservation.count({
      where: {
        reservationTime: { gte: today, lt: tomorrow },
        status: { in: ['CONFIRMED', 'SEATED'] },
      },
    });

    return {
      kpis: {
        todaySales: { value: todaySales, trend: salesTrend },
        todayOrders: { value: todayOrders.length, trend: ordersTrend },
        customersToday: { value: todayCustCount, trend: custTrend },
        aov: { value: todayAOV, trend: aovTrend },
        pendingOrders: { value: pendingOrdersCount },
        kitchenQueue: { value: kitchenQueueCount },
        activeTables: { value: activeTablesCount },
        inventoryAlerts: { value: inventoryAlertsCount },
        expensesToday: { value: todayExpenses },
        monthlyRevenue: { value: monthlyRevenue },
        monthlyProfit: { value: monthlyProfit },
        monthlyExpenses: { value: monthlyExpenses },
        totalCustomers: { value: totalCustomers },
        loyaltyMembers: { value: loyaltyMembers },
        employeesWorking: { value: employeesWorking },
        reservationsToday: { value: reservationsToday },
      },
    };
  }

  async getSalesAnalytics(branchId?: string, filter?: string, customStart?: string, customEnd?: string) {
    const { start, end } = getDateRangeFromFilter(filter, customStart, customEnd);
    const branchFilter = branchId ? { branchId } : {};

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        ...branchFilter,
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Aggregate data points (grouping by date)
    const pointsMap: Record<string, { revenue: number; profit: number; transactions: number }> = {};

    orders.forEach((order) => {
      // Group key based on interval length
      // If today/yesterday -> group by hour. Else group by YYYY-MM-DD
      const date = new Date(order.createdAt);
      let groupKey = '';
      if (filter === 'today' || filter === 'yesterday') {
        const hour = date.getHours();
        groupKey = `${hour}:00`;
      } else {
        groupKey = date.toISOString().split('T')[0];
      }

      let cogs = 0;
      order.orderItems.forEach((item) => {
        cogs += item.quantity * (item.product?.cost || 0);
      });

      const profit = order.total - cogs;

      if (!pointsMap[groupKey]) {
        pointsMap[groupKey] = { revenue: 0, profit: 0, transactions: 0 };
      }

      pointsMap[groupKey].revenue += order.total;
      pointsMap[groupKey].profit += profit;
      pointsMap[groupKey].transactions += 1;
    });

    const labels = Object.keys(pointsMap);
    const revenueData = labels.map((k) => Math.round(pointsMap[k].revenue * 100) / 100);
    const profitData = labels.map((k) => Math.round(pointsMap[k].profit * 100) / 100);
    const transactionData = labels.map((k) => pointsMap[k].transactions);

    return {
      labels,
      series: [
        { name: 'Revenue', data: revenueData },
        { name: 'Gross Profit', data: profitData },
        { name: 'Orders Count', data: transactionData },
      ],
    };
  }

  async getOrderAnalytics(branchId?: string, filter?: string) {
    const { start, end } = getDateRangeFromFilter(filter);
    const branchFilter = branchId ? { branchId } : {};

    // Get order status summary
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: start, lte: end },
        ...branchFilter,
      },
      _count: {
        id: true,
      },
    });

    const statusMap = {
      completed: 0,
      pending: 0,
      cancelled: 0,
      refunded: 0,
    };

    statusCounts.forEach((s) => {
      const status = s.status.toLowerCase();
      if (status.includes('served') || status.includes('complete')) {
        statusMap.completed += s._count.id;
      } else if (status.includes('pending') || status.includes('prep') || status.includes('ready')) {
        statusMap.pending += s._count.id;
      } else if (status.includes('cancel')) {
        statusMap.cancelled += s._count.id;
      } else if (status.includes('refund')) {
        statusMap.refunded += s._count.id;
      }
    });

    // Compute average prepare and serve times
    const timesAggregate = await prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        ...branchFilter,
      },
      _avg: {
        preparationTime: true,
        servingTime: true,
      },
    });

    // Payment methods summary
    const paymentsSummary = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where: {
        createdAt: { gte: start, lte: end },
        paymentStatus: 'PAID',
        ...branchFilter,
      },
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
    });

    const payments = paymentsSummary.map((p) => ({
      method: p.paymentMethod || 'UNKNOWN',
      count: p._count.id,
      total: p._sum.total || 0,
    }));

    // Grouping by peak business hours
    const rawOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...branchFilter,
      },
      select: { createdAt: true },
    });

    const hoursMap: Record<number, number> = {};
    for (let h = 8; h <= 22; h++) hoursMap[h] = 0; // standard working hours

    rawOrders.forEach((o) => {
      const h = new Date(o.createdAt).getHours();
      if (hoursMap[h] !== undefined) {
        hoursMap[h]++;
      }
    });

    const peakHours = Object.keys(hoursMap).map((h) => ({
      hour: `${h}:00`,
      orders: hoursMap[Number(h)],
    }));

    return {
      statusDistribution: statusMap,
      avgPrepTime: Math.round(timesAggregate._avg.preparationTime || 12),
      avgServingTime: Math.round(timesAggregate._avg.servingTime || 5),
      payments,
      peakHours,
    };
  }

  async getCustomerAnalytics(branchId?: string, filter?: string) {
    const { start, end } = getDateRangeFromFilter(filter);
    const branchFilter = branchId ? { branchId } : {};

    // New Customers count
    const newCustomers = await prisma.customer.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    });

    // Total distinct customers in this range
    const ordersWithCustomers = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        customerId: { not: null },
        ...branchFilter,
      },
      select: {
        customerId: true,
        total: true,
      },
    });

    const custTotalSpendMap: Record<string, number> = {};
    ordersWithCustomers.forEach((o) => {
      const cid = o.customerId!;
      custTotalSpendMap[cid] = (custTotalSpendMap[cid] || 0) + o.total;
    });

    const distinctCustIds = Object.keys(custTotalSpendMap);

    // Fetch top spenders details
    const topSpendersList = await prisma.customer.findMany({
      where: {
        id: { in: distinctCustIds },
      },
    });

    const topCustomers = topSpendersList
      .map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        totalSpend: Math.round(custTotalSpendMap[c.id] * 100) / 100,
        isLoyalty: c.isLoyaltyMember,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5);

    // Customer loyalty splits
    const loyaltyCount = await prisma.customer.count({ where: { isLoyaltyMember: true } });
    const standardCount = await prisma.customer.count({ where: { isLoyaltyMember: false } });

    return {
      newCustomers,
      returningCustomers: Math.max(0, distinctCustIds.length - newCustomers),
      loyaltyDistribution: {
        loyalty: loyaltyCount,
        standard: standardCount,
      },
      topCustomers,
      avgCustomerSpend:
        distinctCustIds.length > 0
          ? Math.round(
              (ordersWithCustomers.reduce((sum, o) => sum + o.total, 0) / distinctCustIds.length) * 100
            ) / 100
          : 0,
    };
  }

  async getProductAnalytics(branchId?: string, filter?: string) {
    const { start, end } = getDateRangeFromFilter(filter);
    const branchFilter = branchId ? { branchId } : {};

    // Get product quantities sold
    const items = await prisma.orderItem.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        order: {
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          ...branchFilter,
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    const prodSalesMap: Record<
      string,
      { name: string; sku: string; category: string; quantity: number; revenue: number; profit: number }
    > = {};

    items.forEach((item) => {
      const pid = item.productId;
      const prod = item.product;
      const profitPerItem = item.price - (prod?.cost || 0);

      if (!prodSalesMap[pid]) {
        prodSalesMap[pid] = {
          name: prod?.name || 'Unknown',
          sku: prod?.sku || '',
          category: prod?.category?.name || 'Uncategorized',
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }

      prodSalesMap[pid].quantity += item.quantity;
      prodSalesMap[pid].revenue += item.price * item.quantity;
      prodSalesMap[pid].profit += profitPerItem * item.quantity;
    });

    const sortedProds = Object.values(prodSalesMap);

    const topSelling = [...sortedProds].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const leastSelling = [...sortedProds].sort((a, b) => a.quantity - b.quantity).slice(0, 5);
    const highestProfit = [...sortedProds].sort((a, b) => b.profit - a.profit).slice(0, 5);

    // Grouping category orders
    const categoryTotals: Record<string, number> = {};
    sortedProds.forEach((p) => {
      categoryTotals[p.category] = (categoryTotals[p.category] || 0) + p.quantity;
    });

    const categories = Object.keys(categoryTotals).map((catName) => ({
      name: catName,
      quantity: categoryTotals[catName],
    }));

    return {
      topSelling,
      leastSelling,
      highestProfit,
      categoryDistribution: categories,
    };
  }

  async getInventorySummary(branchId?: string) {
    const branchFilter = branchId ? { branchId } : {};

    const products = await prisma.product.findMany({
      include: { category: true },
    });

    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
    const outOfStock = products.filter((p) => p.stock === 0);

    const totalStockValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0);

    // Fetch recent stock purchase order expenses (Category "Inventory" or "Food & Beverage")
    const recentPurchases = await prisma.expense.findMany({
      where: {
        category: { in: ['Inventory', 'Food & Beverage'] },
        ...branchFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      counts: {
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        totalItems: products.length,
        stockValue: Math.round(totalStockValue * 100) / 100,
      },
      lowStockItems: lowStock.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        minStock: p.minStock,
        category: p.category?.name || 'Uncategorized',
      })),
      recentPurchases,
    };
  }

  async getFinancialSummary(branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const branchFilter = branchId ? { branchId } : {};

    const todayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        ...branchFilter,
      },
    });

    const methodTotals = {
      CASH: 0,
      CARD: 0,
      QR: 0,
      ONLINE: 0,
    };

    todayOrders.forEach((o) => {
      const method = (o.paymentMethod || 'CASH').toUpperCase();
      if (methodTotals[method as keyof typeof methodTotals] !== undefined) {
        methodTotals[method as keyof typeof methodTotals] += o.total;
      }
    });

    // Today's expenses
    const todayExpensesList = await prisma.expense.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        ...branchFilter,
      },
    });
    const todayExpensesSum = todayExpensesList.reduce((sum, e) => sum + e.amount, 0);

    // Mock drawer initial opening balance
    const openingDrawerBalance = 200.00;
    const currentDrawerBalance = openingDrawerBalance + methodTotals.CASH - todayExpensesSum;

    return {
      openingDrawerBalance,
      currentDrawerBalance: Math.max(0, Math.round(currentDrawerBalance * 100) / 100),
      salesByMethod: methodTotals,
      todayExpenses: todayExpensesSum,
    };
  }

  async getReservationSummary(branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tables = await prisma.restaurantTable.findMany({
      where: branchId ? { branchId } : undefined,
    });

    const tableStatuses = {
      available: tables.filter((t) => t.status === 'AVAILABLE').length,
      occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
      reserved: tables.filter((t) => t.status === 'RESERVED').length,
      cleaning: tables.filter((t) => t.status === 'CLEANING').length,
    };

    const todayReservations = await prisma.reservation.findMany({
      where: {
        reservationTime: { gte: today, lt: tomorrow },
      },
      include: {
        table: true,
      },
      orderBy: { reservationTime: 'asc' },
    });

    return {
      tableStatuses,
      totalTables: tables.length,
      reservations: todayReservations,
    };
  }

  async getLiveStatus(branchId?: string) {
    const branchFilter = branchId ? { branchId } : {};

    // Count of orders in kitchen state
    const kitchenPrep = await prisma.order.count({
      where: {
        status: 'PREPARING',
        ...branchFilter,
      },
    });

    const kitchenReady = await prisma.order.count({
      where: {
        status: 'READY',
        ...branchFilter,
      },
    });

    const activeTables = await prisma.restaurantTable.count({
      where: {
        status: 'OCCUPIED',
        ...branchFilter,
      },
    });

    return {
      kitchenBusy: kitchenPrep > 2,
      preparingCount: kitchenPrep,
      readyCount: kitchenReady,
      occupiedTables: activeTables,
    };
  }

  async getRecentOrders(branchId?: string) {
    return prisma.order.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        customer: true,
        table: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async getNotifications() {
    // Generate notification warnings (e.g. low stock, expired tokens)
    const products = await prisma.product.findMany({
      where: {
        stock: { lte: prisma.product.fields.minStock },
      },
      take: 5,
    });

    const notifications: any[] = [];
    products.forEach((p) => {
      notifications.push({
        id: p.id,
        type: p.stock === 0 ? 'ERROR' : 'WARNING',
        title: p.stock === 0 ? 'Out of Stock Alert' : 'Low Stock Warning',
        message: p.stock === 0 ? `Product '${p.name}' is completely out of stock!` : `Product '${p.name}' stock is low (${p.stock} remaining).`,
        createdAt: new Date(),
      });
    });

    return notifications;
  }
}

export default DashboardService;
