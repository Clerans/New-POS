import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useUserStore } from '../store/userStore.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import apiClient from '../api/apiClient.js';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, clearAuth } = useAuthStore();
  const { user, setUser } = useUserStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (isAuthenticated && !user) {
        try {
          const response = await apiClient.get('/auth/me');
          setUser(response.data.data.user);
        } catch (error) {
          console.error('Failed to restore auth session:', error);
          clearAuth();
        }
      }
      setInitializing(false);
    };

    initializeAuth();
  }, [isAuthenticated, user, setUser, clearAuth]);

  if (initializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm font-semibold tracking-wide text-muted-foreground animate-pulse">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;
