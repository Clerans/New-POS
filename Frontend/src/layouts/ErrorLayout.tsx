import React from 'react';
import { Outlet } from 'react-router-dom';

export const ErrorLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-xl shadow-md text-center">
        <Outlet />
      </div>
    </div>
  );
};
export default ErrorLayout;
