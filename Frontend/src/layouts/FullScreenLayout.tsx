import React from 'react';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from '../components/ui/Toast.js';

export const FullScreenLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
};
export default FullScreenLayout;
