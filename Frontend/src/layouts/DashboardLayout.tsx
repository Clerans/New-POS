import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar.js';
import { TopNavbar } from '../components/layout/TopNavbar.js';
import { MobileDrawer } from '../components/layout/MobileDrawer.js';
import { ToastContainer } from '../components/ui/Toast.js';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer Navigation */}
      <MobileDrawer />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar />

        {/* Dashboard Shell Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>

        {/* Dashboard Footer */}
        <footer className="border-t border-border bg-card p-4 text-center text-xs text-muted-foreground select-none">
          © {new Date().getFullYear()} CafeChai POS Enterprise. All rights reserved.
        </footer>
      </div>

      {/* Toast Alert System Overlay */}
      <ToastContainer />
    </div>
  );
};
export default DashboardLayout;
