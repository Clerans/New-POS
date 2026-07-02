import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  Plus,
  RefreshCw,
  Download,
  Printer,
  Camera,
  Layers,
  Utensils,
  AlertTriangle,
  Calendar,
  Clock,
  CreditCard,
  Wallet,
  MapPin,
  CheckCircle2,
  Lock
} from 'lucide-react';

import { StatCard } from '../components/ui/StatCard.js';
import { Button } from '../components/ui/Button.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table.js';
import { Badge } from '../components/ui/Badge.js';
import { SkeletonLoader } from '../components/common/SkeletonLoader.js';
import { ApexChartWrapper } from '../components/charts/ApexChartWrapper.js';
import { useUserStore } from '../store/userStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { getSocket } from '../api/socket.js';
import { apiClient } from '../api/apiClient.js';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useUserStore();
  const { addToast } = useNotificationStore();

  // State Filters
  const [branchId, setBranchId] = useState<string>('all');
  const [filter, setFilter] = useState<string>('last30');
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [chartTab, setChartTab] = useState<'sales' | 'orders' | 'products' | 'customers'>('sales');

  // Clock state
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Socket.io updates invalidating React Query cache
  useEffect(() => {
    const socket = getSocket();

    socket.on('dashboard_update', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('order_created', (order: any) => {
      addToast({
        title: 'New Live Order',
        message: `Order #${order.orderNumber} placed for $${order.total.toFixed(2)}`,
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('inventory_alert', (product: any) => {
      addToast({
        title: 'Inventory Alert',
        message: `Stock warning for ${product.name} (${product.stock} units remaining)`,
        type: 'error',
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    return () => {
      socket.off('dashboard_update');
      socket.off('order_created');
      socket.off('inventory_alert');
    };
  }, [queryClient, addToast]);

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Queries protected by permission checks
  const canViewDashboard = hasPermission('Dashboard.View');
  const canViewAnalytics = hasPermission('Dashboard.Analytics');
  const canViewInventory = hasPermission('Dashboard.Inventory');
  const canViewFinance = hasPermission('Dashboard.Finance');

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', branchId],
    queryFn: () => apiClient.get('/dashboard/summary', { params: { branchId } }).then((res) => res.data.data),
    enabled: canViewDashboard,
  });

  const salesQuery = useQuery({
    queryKey: ['dashboard', 'sales', branchId, filter],
    queryFn: () => apiClient.get('/dashboard/sales', { params: { branchId, filter } }).then((res) => res.data.data),
    enabled: canViewAnalytics,
  });

  const ordersQuery = useQuery({
    queryKey: ['dashboard', 'orders', branchId, filter],
    queryFn: () => apiClient.get('/dashboard/orders', { params: { branchId, filter } }).then((res) => res.data.data),
    enabled: canViewAnalytics,
  });

  const customersQuery = useQuery({
    queryKey: ['dashboard', 'customers', branchId, filter],
    queryFn: () => apiClient.get('/dashboard/customers', { params: { branchId, filter } }).then((res) => res.data.data),
    enabled: canViewAnalytics,
  });

  const productsQuery = useQuery({
    queryKey: ['dashboard', 'products', branchId, filter],
    queryFn: () => apiClient.get('/dashboard/products', { params: { branchId, filter } }).then((res) => res.data.data),
    enabled: canViewAnalytics,
  });

  const inventoryQuery = useQuery({
    queryKey: ['dashboard', 'inventory', branchId],
    queryFn: () => apiClient.get('/dashboard/inventory', { params: { branchId } }).then((res) => res.data.data),
    enabled: canViewInventory,
  });

  const reservationsQuery = useQuery({
    queryKey: ['dashboard', 'reservations', branchId],
    queryFn: () =>
      apiClient.get('/dashboard/reservations', { params: { branchId } }).then((res) => res.data.data),
    enabled: canViewDashboard,
  });

  const activitiesQuery = useQuery({
    queryKey: ['dashboard', 'activities', branchId],
    queryFn: () =>
      apiClient.get('/dashboard/activities', { params: { branchId } }).then((res) => res.data.data),
    enabled: canViewDashboard,
  });

  // Simulated Quick POS Actions Mutations
  const mockOrderMutation = useMutation({
    mutationFn: () => apiClient.post('/dashboard/mock-order', { branchId }),
    onSuccess: () => {
      addToast({ title: 'Simulating POS Checkouts', message: 'A live ticket order was submitted.', type: 'info' });
    },
    onError: (err: any) => {
      addToast({ title: 'Checkout Failed', message: err.message, type: 'error' });
    },
  });

  const restockMutation = useMutation({
    mutationFn: (prodId: string) => apiClient.post(`/dashboard/restock/${prodId}`),
    onSuccess: () => {
      addToast({ title: 'Inventory Restocked', message: 'Stock quantity restored.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    addToast({ title: 'Cache Invalidated', message: 'Updated statistics from database.', type: 'info' });
  };

  // Exports functions
  const handleExportCSV = () => {
    if (!salesQuery.data) return;
    const series = salesQuery.data.series || [];
    const labels = salesQuery.data.labels || [];
    let csv = 'Date/Time,Revenue,Profit,Orders\n';
    labels.forEach((lbl: string, i: number) => {
      const rev = series[0]?.data[i] || 0;
      const prof = series[1]?.data[i] || 0;
      const count = series[2]?.data[i] || 0;
      csv += `${lbl},${rev},${prof},${count}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cafechai_dashboard_${filter}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    addToast({ title: 'CSV Exported', message: 'Sales analytics file downloaded.', type: 'success' });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleScreenshot = () => {
    addToast({
      title: 'Screenshot Alert',
      message: 'Generating high-resolution snapshot... (Ctrl+P is recommended for prints)',
      type: 'info',
    });
  };

  // Skeletons
  const isLoading = summaryQuery.isLoading || salesQuery.isLoading;

  return (
    <div className="flex flex-col gap-6 print:p-0">
      {/* Top Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5 select-none">
            <Layers className="h-3.5 w-3.5 animate-pulse" /> CONTROL CENTER
          </span>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">
            {getGreeting()}, {user?.firstName || 'User'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {currentDate}
            </span>
            <span className="h-3 w-px bg-border/80" />
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {currentTime}
            </span>
          </p>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Branch Filter */}
          <div className="flex items-center bg-card border border-border/80 rounded-lg px-2.5 py-1.5 shadow-sm text-xs font-semibold gap-1.5">
            <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Branch:</span>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="bg-transparent border-none text-foreground font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Branches</option>
              <option value="MHO-01">Main Head Office</option>
              <option value="DCC-02">Downtown CafeChai</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center bg-card border border-border/80 rounded-lg px-2.5 py-1.5 shadow-sm text-xs font-semibold gap-1.5">
            <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Period:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent border-none text-foreground font-bold focus:outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
            </select>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-1 bg-accent/20 border border-border/80 rounded-lg p-1">
            <button
              onClick={handleManualRefresh}
              className="p-1.5 hover:bg-card rounded-md text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleExportCSV}
              className="p-1.5 hover:bg-card rounded-md text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-1.5 hover:bg-card rounded-md text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Print Dashboard"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={handleScreenshot}
              className="p-1.5 hover:bg-card rounded-md text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Snap Dashboard"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 select-none">
        {isLoading ? (
          <SkeletonLoader variant="card" count={4} className="h-28" />
        ) : (
          <>
            {/* Sales Card */}
            {canViewFinance ? (
              <StatCard
                title="Today's Gross Sales"
                value={`$${(summaryQuery.data?.kpis?.todaySales?.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                description="Tax & discounts excluded"
                icon={<DollarSign className="h-4 w-4 text-success" />}
                trend={summaryQuery.data?.kpis?.todaySales?.trend}
              />
            ) : (
              <div className="bg-card border border-dashed border-border rounded-xl p-5 flex flex-col justify-center items-center text-center opacity-70">
                <Lock className="h-5 w-5 text-muted-foreground mb-1.5" />
                <span className="text-xs font-semibold text-muted-foreground">Today's Sales Locked</span>
              </div>
            )}

            {/* Orders Card */}
            <StatCard
              title="Total Orders Today"
              value={summaryQuery.data?.kpis?.todayOrders?.value || 0}
              description={`Averages $${(summaryQuery.data?.kpis?.aov?.value || 0).toFixed(2)} per ticket`}
              icon={<ShoppingBag className="h-4 w-4 text-primary" />}
              trend={summaryQuery.data?.kpis?.todayOrders?.trend}
            />

            {/* Customers Card */}
            <StatCard
              title="Customers Visited"
              value={summaryQuery.data?.kpis?.customersToday?.value || 0}
              description="Repeat customers tracking"
              icon={<Users className="h-4 w-4 text-warning" />}
              trend={summaryQuery.data?.kpis?.customersToday?.trend}
            />

            {/* Monthly Margin Card */}
            {canViewFinance ? (
              <StatCard
                title="Net Monthly Profit"
                value={`$${(summaryQuery.data?.kpis?.monthlyProfit?.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                description={`Total monthly revenue: $${(summaryQuery.data?.kpis?.monthlyRevenue?.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                icon={<TrendingUp className="h-4 w-4 text-success" />}
                trend={summaryQuery.data?.kpis?.aov?.trend}
              />
            ) : (
              <div className="bg-card border border-dashed border-border rounded-xl p-5 flex flex-col justify-center items-center text-center opacity-70">
                <Lock className="h-5 w-5 text-muted-foreground mb-1.5" />
                <span className="text-xs font-semibold text-muted-foreground">Profit Valuations Locked</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Second KPI row (Interactive alerts / operational counts) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          <SkeletonLoader variant="card" count={4} className="h-16" />
        ) : (
          <>
            <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Kitchen Queue</span>
                <span className="text-lg font-bold text-foreground mt-0.5">
                  {summaryQuery.data?.kpis?.kitchenQueue?.value || 0} Orders
                </span>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Utensils className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Seated Tables</span>
                <span className="text-lg font-bold text-foreground mt-0.5">
                  {summaryQuery.data?.kpis?.activeTables?.value || 0} Tables
                </span>
              </div>
              <div className="p-2 rounded-lg bg-success/10 text-success">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Exp Alert Thresholds</span>
                <span className="text-lg font-bold text-foreground mt-0.5">
                  {summaryQuery.data?.kpis?.inventoryAlerts?.value || 0} Items
                </span>
              </div>
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Active Reservations</span>
                <span className="text-lg font-bold text-foreground mt-0.5">
                  {summaryQuery.data?.kpis?.reservationsToday?.value || 0} Today
                </span>
              </div>
              <div className="p-2 rounded-lg bg-warning/10 text-warning">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Charts & Analytics Tabs */}
      {canViewAnalytics ? (
        <div className="bg-card border border-border/80 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {/* Charts Header Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-border bg-accent/20 px-5 pt-3 pb-0 overflow-x-auto gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setChartTab('sales')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  chartTab === 'sales' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Revenue & Profit Trend
              </button>
              <button
                onClick={() => setChartTab('orders')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  chartTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Hourly Peak Hours
              </button>
              <button
                onClick={() => setChartTab('products')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  chartTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Category Shares
              </button>
              <button
                onClick={() => setChartTab('customers')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  chartTab === 'customers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Top Spenders
              </button>
            </div>

            {/* Chart Type Toggles */}
            <div className="flex items-center gap-1.5 self-center pb-3 sm:pb-0">
              <button
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                  chartType === 'area' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:bg-accent'
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                  chartType === 'line' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:bg-accent'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                  chartType === 'bar' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:bg-accent'
                }`}
              >
                Bar
              </button>
            </div>
          </div>

          {/* Chart Wrapper Container */}
          <div className="p-6">
            {chartTab === 'sales' && salesQuery.data && (
              <ApexChartWrapper
                type={chartType}
                series={[salesQuery.data.series[0], salesQuery.data.series[1]]} // Revenue vs profit
                categories={salesQuery.data.labels}
                title="Business Performance Timeline"
              />
            )}

            {chartTab === 'orders' && ordersQuery.data && (
              <ApexChartWrapper
                type="bar"
                series={[{ name: 'Orders placed', data: ordersQuery.data.peakHours.map((h: any) => h.orders) }]}
                categories={ordersQuery.data.peakHours.map((h: any) => h.hour)}
                title="Customer Frequency (Hourly Distribution)"
              />
            )}

            {chartTab === 'products' && productsQuery.data && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-2">
                  <ApexChartWrapper
                    type="bar"
                    series={[{ name: 'Volume sold', data: productsQuery.data.topSelling.map((p: any) => p.quantity) }]}
                    categories={productsQuery.data.topSelling.map((p: any) => p.name)}
                    title="Best Selling Inventory Items"
                  />
                </div>
                <div className="border border-border rounded-xl p-5 bg-accent/15">
                  <h3 className="text-sm font-extrabold text-foreground border-b border-border/80 pb-3 mb-4">Volume Contribution by Category</h3>
                  <div className="space-y-4">
                    {productsQuery.data.categoryDistribution.map((cat: any) => (
                      <div key={cat.name} className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between font-bold text-foreground">
                          <span>{cat.name}</span>
                          <span>{cat.quantity} sold</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(cat.quantity / productsQuery.data.categoryDistribution.reduce((sum: number, c: any) => sum + c.quantity, 0)) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {chartTab === 'customers' && customersQuery.data && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 border border-border rounded-xl p-5 bg-card">
                  <h3 className="text-sm font-bold text-foreground mb-4">Top Spending Restaurant Guests</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Phone / Email</TableHead>
                        <TableHead>Loyalty Status</TableHead>
                        <TableHead className="text-right">Total Expenditure</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customersQuery.data.topCustomers.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-bold text-foreground">{c.name}</TableCell>
                          <TableCell>{c.email || c.phone || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={c.isLoyalty ? 'primary' : 'secondary'}>
                              {c.isLoyalty ? 'LOYALTY MEMBER' : 'STANDARD'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-success text-right">${c.totalSpend.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col border border-border rounded-xl p-5 bg-card justify-between">
                  <div className="flex flex-col gap-1 border-b border-border/80 pb-3 mb-4">
                    <h3 className="text-sm font-bold text-foreground">Customer Demographics</h3>
                    <p className="text-xs text-muted-foreground">New vs Returning Visitors</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">New Registered:</span>
                      <span className="font-bold text-foreground">{customersQuery.data.newCustomers}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Returning Visitors:</span>
                      <span className="font-bold text-foreground">{customersQuery.data.returningCustomers}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between items-center text-sm font-bold text-foreground">
                      <span>Avg Spend Ticket:</span>
                      <span className="text-primary">${customersQuery.data.avgCustomerSpend.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="h-8" />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 flex flex-col justify-center items-center text-center opacity-70">
          <Lock className="h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-1">Analytics View Restricted</h3>
          <p className="text-xs text-muted-foreground">You do not hold permissions to see Sales Analytics trends.</p>
        </div>
      )}

      {/* Operational Modules Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kitchen Live Prep Queue */}
        <div className="lg:col-span-2 border border-border/80 bg-card rounded-xl shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Live Kitchen Display Prep Queue</h3>
              <p className="text-xs text-muted-foreground">Real-time status updates from Socket.io</p>
            </div>
            <Badge variant="primary" className="animate-pulse">KITCHEN MONITOR</Badge>
          </div>

          <div className="overflow-x-auto">
            {activitiesQuery.data?.orders?.filter((o: any) => o.status === 'PREPARING' || o.status === 'READY').length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No orders pending cooking in the kitchen.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Table / Type</TableHead>
                    <TableHead>Kitchen Status</TableHead>
                    <TableHead>Avg Prep Speed</TableHead>
                    <TableHead className="text-right">Ticket Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activitiesQuery.data?.orders
                    ?.filter((o: any) => o.status === 'PREPARING' || o.status === 'READY')
                    .slice(0, 5)
                    .map((o: any) => (
                      <TableRow key={o.id} className="hover:bg-accent/10">
                        <TableCell className="font-extrabold text-foreground">{o.orderNumber}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-xs text-muted-foreground">
                            {o.table?.name || o.orderType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={o.status === 'READY' ? 'primary' : 'secondary'} className={o.status === 'READY' ? 'bg-success text-success-foreground' : 'animate-pulse'}>
                            {o.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {o.preparationTime || 12} mins
                        </TableCell>
                        <TableCell className="font-bold text-foreground text-right">${o.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="border border-border/80 bg-card rounded-xl shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Low Stock alerts</h3>
              <p className="text-xs text-muted-foreground">Refreshes when thresholds are crossed</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>

          {canViewInventory && inventoryQuery.data ? (
            <div className="flex-1 flex flex-col justify-between">
              {inventoryQuery.data.lowStockItems.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">All products are healthy. No inventory warnings.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {inventoryQuery.data.lowStockItems.slice(0, 4).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground">{p.sku}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-destructive/10 text-destructive border-none">
                          {p.stock} units
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => restockMutation.mutate(p.id)}
                          isLoading={restockMutation.isPending && restockMutation.variables === p.id}
                        >
                          Restock
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-4 border-t border-border/40 flex justify-between text-xs text-muted-foreground font-semibold">
                <span>Total stock valuation:</span>
                <span className="text-foreground">${inventoryQuery.data.counts.stockValue.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center text-center opacity-70 flex-1 py-6">
              <Lock className="h-5 w-5 text-muted-foreground mb-1.5" />
              <span className="text-xs font-semibold text-muted-foreground">Inventory Restricted</span>
            </div>
          )}
        </div>
      </div>

      {/* Transactions & Table Occupancy Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List */}
        <div className="lg:col-span-2 border border-border/80 bg-card rounded-xl shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Recent POS Transactions</h3>
              <p className="text-xs text-muted-foreground">Review payment settlement details</p>
            </div>
            <Button size="sm" onClick={() => mockOrderMutation.mutate()} isLoading={mockOrderMutation.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Mock Checkout
            </Button>
          </div>

          <div className="overflow-x-auto">
            {activitiesQuery.data?.orders?.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-muted-foreground">No recent transaction logs found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Settled Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activitiesQuery.data?.orders?.slice(0, 6).map((o: any) => (
                    <TableRow key={o.id} className="hover:bg-accent/10">
                      <TableCell className="font-bold text-foreground">{o.orderNumber}</TableCell>
                      <TableCell>
                        {new Date(o.createdAt).toLocaleDateString()} {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>{o.customer?.name || 'Walk-in Guest'}</TableCell>
                      <TableCell className="flex items-center gap-1.5">
                        {o.paymentMethod === 'CASH' ? (
                          <Wallet className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5 text-primary" />
                        )}
                        {o.paymentMethod || 'CASH'}
                      </TableCell>
                      <TableCell className="font-bold text-foreground text-right">${o.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Live Table Occupancy Layout */}
        <div className="border border-border/80 bg-card rounded-xl shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Live Table Layout</h3>
              <p className="text-xs text-muted-foreground">Real-time occupancy tracking</p>
            </div>
            <Badge variant="secondary">TABLE MONITOR</Badge>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            {reservationsQuery.data ? (
              <div className="grid grid-cols-3 gap-2">
                {reservationsQuery.data.reservations.slice(0, 9).map((res: any) => (
                  <div
                    key={res.id}
                    className={`border p-3 rounded-lg flex flex-col justify-between text-center select-none ${
                      res.status === 'SEATED'
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : 'bg-primary/10 border-primary/20 text-primary'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">{res.table?.name || 'Table'}</span>
                    <span className="text-xs font-extrabold mt-1">{res.guests} Pax</span>
                    <span className="text-[9px] font-semibold mt-1 opacity-70">
                      {res.status === 'SEATED' ? 'Seated' : 'Reserved'}
                    </span>
                  </div>
                ))}
                {/* Available Tables block placeholders */}
                <div className="border border-success/20 bg-success/5 text-success p-3 rounded-lg flex flex-col justify-between text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Table 06</span>
                  <span className="text-xs font-extrabold mt-1">2 Pax</span>
                  <span className="text-[9px] font-semibold mt-1 opacity-70">Available</span>
                </div>
                <div className="border border-success/20 bg-success/5 text-success p-3 rounded-lg flex flex-col justify-between text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Table 07</span>
                  <span className="text-xs font-extrabold mt-1">4 Pax</span>
                  <span className="text-[9px] font-semibold mt-1 opacity-70">Available</span>
                </div>
                <div className="border border-warning/20 bg-warning/5 text-warning p-3 rounded-lg flex flex-col justify-between text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Table 04</span>
                  <span className="text-xs font-extrabold mt-1">4 Pax</span>
                  <span className="text-[9px] font-semibold mt-1 opacity-70">Cleaning</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground">Retriving table statuses...</p>
              </div>
            )}

            {reservationsQuery.data && (
              <div className="pt-4 border-t border-border/40 grid grid-cols-2 gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span>{reservationsQuery.data.tableStatuses.available} Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span>{reservationsQuery.data.tableStatuses.occupied} Occupied</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
