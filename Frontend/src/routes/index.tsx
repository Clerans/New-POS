import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';

// Layouts
import PublicLayout from '../layouts/PublicLayout.js';
import AuthLayout from '../layouts/AuthLayout.js';
import DashboardLayout from '../layouts/DashboardLayout.js';
import ErrorLayout from '../layouts/ErrorLayout.js';

// Guards
import PrivateRoute from './PrivateRoute.js';
import GuestRoute from './GuestRoute.js';

// Lazy Pages
const Login = lazy(() => import('../pages/Login.js'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword.js'));
const ResetPassword = lazy(() => import('../pages/ResetPassword.js'));
const Dashboard = lazy(() => import('../pages/Dashboard.js'));
const Settings = lazy(() => import('../pages/Settings.js'));
const NotFound = lazy(() => import('../pages/NotFound.js'));

const SuspenseLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    }
  >
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  // Guest / Auth routes
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <SuspenseLayout><Login /></SuspenseLayout> },
          { path: '/forgot-password', element: <SuspenseLayout><ForgotPassword /></SuspenseLayout> },
          { path: '/reset-password', element: <SuspenseLayout><ResetPassword /></SuspenseLayout> },
        ],
      },
    ],
  },
  // Private / Dashboard routes
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <SuspenseLayout><Dashboard /></SuspenseLayout> },
          { path: '/settings', element: <SuspenseLayout><Settings /></SuspenseLayout> },
        ],
      },
    ],
  },
  // Public routes
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
    ],
  },
  // Catch all (404)
  {
    element: <ErrorLayout />,
    children: [
      { path: '*', element: <SuspenseLayout><NotFound /></SuspenseLayout> },
    ],
  },
]);

export default router;
