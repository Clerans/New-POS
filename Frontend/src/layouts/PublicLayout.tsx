import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { ToastContainer } from '../components/ui/Toast.js';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Simple Public Navbar */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6 select-none">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
          <Store className="h-6 w-6" />
          <span>CafeChai POS Enterprise</span>
        </Link>
        <Link to="/login" className="text-sm font-semibold hover:text-primary transition-colors">
          Sign In
        </Link>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  );
};
export default PublicLayout;
