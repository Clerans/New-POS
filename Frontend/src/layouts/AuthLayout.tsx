import React from 'react';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from '../components/ui/Toast.js';
import { Store } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-accent/40 dark:bg-background">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 select-none">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary flex items-center justify-center">
            <Store className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CafeChai POS Enterprise</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage your restaurant operations</p>
        </div>

        {/* Form Container */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-md">
          <Outlet />
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};
export default AuthLayout;
