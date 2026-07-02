import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { StatCard } from '../components/ui/StatCard.js';
import { Button } from '../components/ui/Button.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table.js';
import { Pagination } from '../components/ui/Pagination.js';
import { SkeletonLoader } from '../components/common/SkeletonLoader.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { Dialog } from '../components/ui/Dialog.js';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog.js';
import { ApexChartWrapper } from '../components/charts/ApexChartWrapper.js';
import { DollarSign, ShoppingBag, Users, TrendingUp, Plus } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore.js';

export const Dashboard: React.FC = () => {
  const [viewState, setViewState] = useState<'loaded' | 'loading' | 'empty'>('loaded');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { addToast } = useNotificationStore();

  const handleCreateOrder = () => {
    setIsNewOrderOpen(false);
    addToast({
      title: 'Order Created',
      message: 'A mock order has been submitted successfully!',
      type: 'success',
    });
  };

  const handleRefreshCaches = () => {
    setIsConfirmOpen(false);
    addToast({
      title: 'Cache Cleared',
      message: 'System local state cache refreshed successfully.',
      type: 'info',
    });
  };

  const mockTransactions = [
    { id: '#1001', time: '10:30 AM', customer: 'Alice Johnson', items: 3, total: 24.50, status: 'Paid' },
    { id: '#1002', time: '10:45 AM', customer: 'Bob Smith', items: 1, total: 5.75, status: 'Paid' },
    { id: '#1003', time: '11:15 AM', customer: 'Charlie Brown', items: 5, total: 42.10, status: 'Pending' },
    { id: '#1004', time: '11:30 AM', customer: 'Diana Prince', items: 2, total: 18.25, status: 'Paid' },
    { id: '#1005', time: '12:00 PM', customer: 'Evan Wright', items: 4, total: 35.80, status: 'Failed' },
  ];

  const seriesData = [
    {
      name: 'Revenue',
      data: [1200, 1900, 1500, 2400, 2100, 3000, 2800],
    },
  ];

  const categoriesData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title="Welcome to CafeChai POS"
        description="Here is the layout container shell showcase."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmOpen(true)}>
              Reset States
            </Button>
            <Button size="sm" onClick={() => setIsNewOrderOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Order
            </Button>
          </div>
        }
      />

      {/* State Switch Controls */}
      <div className="flex gap-2 p-1.5 bg-muted rounded-lg w-fit select-none">
        <Button
          variant={viewState === 'loaded' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setViewState('loaded')}
        >
          Loaded Layout
        </Button>
        <Button
          variant={viewState === 'loading' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setViewState('loading')}
        >
          Loading Skeleton
        </Button>
        <Button
          variant={viewState === 'empty' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setViewState('empty')}
        >
          Empty State
        </Button>
      </div>

      {/* State Renderings */}
      {viewState === 'loading' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SkeletonLoader variant="card" count={4} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SkeletonLoader variant="card" className="h-80" />
            </div>
            <div>
              <SkeletonLoader variant="card" className="h-80" />
            </div>
          </div>
        </div>
      )}

      {viewState === 'empty' && (
        <EmptyState
          title="No Active Register Session"
          message="To begin accepting payments and taking orders, please open a register cash session from settings."
          action={
            <Button onClick={() => setViewState('loaded')}>
              Open Register Session
            </Button>
          }
        />
      )}

      {viewState === 'loaded' && (
        <div className="flex flex-col gap-6">
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Today's Revenue"
              value="$1,450.40"
              description="From 56 transactions"
              icon={<DollarSign className="h-4 w-4" />}
              trend={{ value: 12.5, type: 'up' }}
            />
            <StatCard
              title="Total Orders"
              value="84"
              description="Avg $17.26 per ticket"
              icon={<ShoppingBag className="h-4 w-4" />}
              trend={{ value: 4.2, type: 'up' }}
            />
            <StatCard
              title="Active Customers"
              value="42"
              description="12 new subscribers"
              icon={<Users className="h-4 w-4" />}
              trend={{ value: 8.9, type: 'up' }}
            />
            <StatCard
              title="Product Margin"
              value="68.4%"
              description="Healthy target region"
              icon={<TrendingUp className="h-4 w-4" />}
              trend={{ value: 1.1, type: 'down' }}
            />
          </div>

          {/* Charts & Layout Rows */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ApexChartWrapper
                type="area"
                series={seriesData}
                categories={categoriesData}
                title="Weekly Sales Trend"
              />
            </div>
            <div className="flex flex-col gap-4 border border-border p-5 rounded-xl bg-card justify-between h-[385px]">
              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-semibold leading-none">Register Details</h3>
                <p className="text-xs text-muted-foreground">Active Drawer Session Summary</p>
              </div>
              <div className="space-y-4 my-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Drawer Opening Cash:</span>
                  <span className="font-semibold text-foreground">$200.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cash Payments:</span>
                  <span className="font-semibold text-foreground">$450.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Card Payments:</span>
                  <span className="font-semibold text-foreground">$800.40</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex justify-between text-base font-bold">
                  <span>Current Balances:</span>
                  <span className="text-primary">$1,450.40</span>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Close Register
              </Button>
            </div>
          </div>

          {/* Table Segment */}
          <div className="border border-border rounded-xl p-5 bg-card flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-base font-semibold leading-none">Recent Transactions</h3>
              <p className="text-xs text-muted-foreground">Latest ticket activities from all registers</p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items Count</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-semibold text-foreground">{tx.id}</TableCell>
                    <TableCell>{tx.time}</TableCell>
                    <TableCell>{tx.customer}</TableCell>
                    <TableCell>{tx.items}</TableCell>
                    <TableCell className="font-medium text-foreground">${tx.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          tx.status === 'Paid'
                            ? 'bg-success/10 text-success'
                            : tx.status === 'Pending'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              currentPage={currentPage}
              totalPages={5}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* Interactive Modal Dialog Showcase */}
      <Dialog
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        title="Create Quick Order"
        description="Setup a dummy checkout ticket."
      >
        <div className="flex flex-col gap-4 py-3">
          <p className="text-sm text-muted-foreground">
            This checkout dialog mocks order placement in the pos shell.
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dummy Bill details</span>
            <div className="flex justify-between text-sm py-1 border-b border-border/40">
              <span>Espresso Macchiato x1</span>
              <span>$4.50</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-border/40">
              <span>Chai Latte Grande x1</span>
              <span>$5.50</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2">
              <span>Total:</span>
              <span className="text-primary">$10.00</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsNewOrderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrder}>
              Place Mock Order
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Interactive Confirmation dialog */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleRefreshCaches}
        title="Are you sure you want to clear system cache?"
        message="This action resets local mock settings and refreshes logs. This cannot be undone."
        confirmText="Yes, Reset"
        variant="warning"
      />
    </div>
  );
};
export default Dashboard;
