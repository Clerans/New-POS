import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Laptop,
  Smartphone,
  Tablet,
  Activity,
  LogOut,
  Shield,
  Clock,
  Globe,
  Trash2,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '../components/ui/PageHeader.js';
import { Card, CardContent } from '../components/ui/Card.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { useUserStore } from '../store/userStore.js';
import { useAuthStore } from '../store/authStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import apiClient from '../api/apiClient.js';

// Profile Validation Schema
const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  displayName: z.string().min(1, 'Display name is required'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
  avatar: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Password Change Schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain at least one special character'),
  confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface UserSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  createdAt: string;
  expiresAt: string;
  token: string;
}

interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  createdAt: string;
}

export const Profile: React.FC = () => {
  const { user, setUser } = useUserStore();
  const { clearAuth, refreshToken: currentRefreshToken } = useAuthStore();
  const { addToast } = useNotificationStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sessions' | 'logs'>('profile');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'None', color: 'bg-border' });

  // 1. Setup Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
    reset: resetProfileForm
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (user) {
      resetProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        displayName: user.displayName || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
      });
    }
  }, [user, resetProfileForm]);

  // 2. Setup Password Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting }
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const newPasswordVal = watchPassword('newPassword', '');

  // Calculate password strength dynamically
  useEffect(() => {
    let score = 0;
    if (!newPasswordVal) {
      setPasswordStrength({ score: 0, label: 'None', color: 'bg-border' });
      return;
    }

    if (newPasswordVal.length >= 8) score++;
    if (/[A-Z]/.test(newPasswordVal)) score++;
    if (/[a-z]/.test(newPasswordVal)) score++;
    if (/[0-9]/.test(newPasswordVal)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPasswordVal)) score++;

    let label = 'Very Weak';
    let color = 'bg-destructive';

    if (score === 5) {
      label = 'Strong';
      color = 'bg-success';
    } else if (score >= 4) {
      label = 'Good';
      color = 'bg-primary';
    } else if (score >= 3) {
      label = 'Fair';
      color = 'bg-warning';
    }

    setPasswordStrength({ score, label, color });
  }, [newPasswordVal]);

  // 3. Fetch Sessions & Logs
  const fetchSessions = async () => {
    if (!user) return;
    setLoadingSessions(true);
    try {
      const response = await apiClient.get('/auth/sessions');
      setSessions(response.data.data.sessions);
    } catch (e: any) {
      addToast({ title: 'Error', message: 'Failed to retrieve active sessions', type: 'error' });
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchLogs = async () => {
    if (!user) return;
    setLoadingLogs(true);
    try {
      const response = await apiClient.get('/auth/activity');
      setLogs(response.data.data.logs);
    } catch (e: any) {
      addToast({ title: 'Error', message: 'Failed to retrieve activity timeline', type: 'error' });
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    } else if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  // Submit profile changes
  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      const response = await apiClient.put('/auth/profile', data);
      const updatedUser = response.data.data.user;

      // Sync user profile state
      if (user) {
        setUser({
          ...user,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          displayName: updatedUser.displayName,
          phone: updatedUser.phone,
          avatar: updatedUser.avatar,
        });
      }

      addToast({
        title: 'Profile Updated',
        message: 'Your personal information has been saved successfully.',
        type: 'success',
      });
    } catch (error: any) {
      addToast({
        title: 'Update Failed',
        message: error.message || 'Something went wrong.',
        type: 'error',
      });
    }
  };

  // Submit password change
  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      addToast({
        title: 'Password Changed',
        message: 'Your password was successfully updated. You have been logged out of all devices for security.',
        type: 'success',
      });

      // Force logout after password change
      setTimeout(() => {
        clearAuth();
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      addToast({
        title: 'Change Password Failed',
        message: error.message || 'Incorrect current password or strength validation failed.',
        type: 'error',
      });
    }
  };

  // Revoke session
  const handleRevokeSession = async (sessionId: string, sessionToken: string) => {
    try {
      await apiClient.delete(`/auth/session/${sessionId}`);
      
      // If we revoke our current session, we log out
      if (sessionToken === currentRefreshToken) {
        addToast({ title: 'Session Ended', message: 'Current session terminated. Logging out...', type: 'warning' });
        setTimeout(() => {
          clearAuth();
          navigate('/login');
        }, 1200);
        return;
      }

      addToast({
        title: 'Session Revoked',
        message: 'Selected device session was successfully terminated.',
        type: 'success',
      });
      
      // Refresh session list
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (e: any) {
      addToast({ title: 'Revocation Failed', message: e.message || 'Could not terminate session.', type: 'error' });
    }
  };

  // Logout of all sessions
  const handleLogoutAll = async () => {
    try {
      await apiClient.delete('/auth/logout-all');
      addToast({
        title: 'Logged Out Everywhere',
        message: 'All sessions successfully terminated. Redirecting to login...',
        type: 'warning',
      });
      setTimeout(() => {
        clearAuth();
        navigate('/login');
      }, 1500);
    } catch (e: any) {
      addToast({ title: 'Logout Failed', message: 'Could not invalidate sessions.', type: 'error' });
    }
  };

  // Get Device Icon for session row
  const getDeviceIcon = (device: string | null) => {
    if (!device) return <Laptop className="h-5 w-5 text-muted-foreground" />;
    const d = device.toLowerCase();
    if (d.includes('mobile') || d.includes('phone') || d.includes('ipod')) {
      return <Smartphone className="h-5 w-5 text-muted-foreground" />;
    }
    if (d.includes('tablet') || d.includes('ipad')) {
      return <Tablet className="h-5 w-5 text-muted-foreground" />;
    }
    return <Laptop className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Profile"
        description="Manage your enterprise account details, password, and security sessions."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Profile Summary Card */}
        <Card className="lg:col-span-1 border border-border shadow-sm bg-card overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/10 to-primary/30" />
          <div className="flex flex-col items-center p-6 -mt-12 select-none">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.displayName || user.username}
                className="h-20 w-20 rounded-full border-4 border-card object-cover bg-accent shadow-sm"
              />
            ) : (
              <div className="h-20 w-20 rounded-full border-4 border-card bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl shadow-sm">
                {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : user?.username?.slice(0, 2).toUpperCase()}
              </div>
            )}

            <h3 className="mt-3 text-lg font-bold text-foreground">
              {user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">@{user?.username}</p>
            <p className="text-xs font-medium text-primary mt-1.5">{user?.email}</p>

            <div className="w-full border-t border-border mt-5 pt-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-semibold text-success flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Active
                </span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-xs text-muted-foreground">Assigned Roles:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {user?.roles.map((role) => (
                    <Badge key={role} variant={role === 'SUPER_ADMIN' || role === 'ADMIN' ? 'primary' : 'secondary'} className="text-[10px] px-2 py-0.5 font-bold">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Side: Tab Interface Card */}
        <Card className="lg:col-span-3 border border-border shadow-sm bg-card">
          {/* Custom Navigation Tabs */}
          <div className="flex border-b border-border bg-accent/20 px-4 pt-2 overflow-x-auto gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-4 w-4" /> Account Details
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'security'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Lock className="h-4 w-4" /> Password & Security
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'sessions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Laptop className="h-4 w-4" /> Active Sessions
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'logs'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity className="h-4 w-4" /> Activity History
            </button>
          </div>

          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {/* TAB 1: Profile Details */}
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Profile Details</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Update your personal information. These details will be visible on receipts and logs.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        placeholder="Michael"
                        error={profileErrors.firstName?.message}
                        {...registerProfile('firstName')}
                      />
                      <Input
                        label="Last Name"
                        placeholder="Scott"
                        error={profileErrors.lastName?.message}
                        {...registerProfile('lastName')}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Display Name"
                        placeholder="Manager Michael"
                        error={profileErrors.displayName?.message}
                        {...registerProfile('displayName')}
                      />
                      <Input
                        label="Contact Phone"
                        placeholder="+1234567890"
                        error={profileErrors.phone?.message}
                        {...registerProfile('phone')}
                      />
                    </div>
                    <Input
                      label="Avatar Image URL"
                      placeholder="https://example.com/avatar.png"
                      error={profileErrors.avatar?.message}
                      {...registerProfile('avatar')}
                    />

                    <div className="flex justify-end pt-3">
                      <Button type="submit" isLoading={profileSubmitting} className="h-10 px-6">
                        Save Profile Details
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* TAB 2: Password Change */}
              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Change Password</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Modify your account password. Changing your password forces a logout on all active devices.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4 max-w-xl">
                    <div className="relative">
                      <Input
                        label="Current Password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="Enter your current password"
                        error={passwordErrors.currentPassword?.message}
                        leftIcon={<Lock className="h-4 w-4" />}
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="focus:outline-none text-muted-foreground hover:text-foreground cursor-pointer flex items-center h-full pr-1"
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                        {...registerPassword('currentPassword')}
                      />
                    </div>

                    <div className="relative">
                      <Input
                        label="New Secure Password"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Min 8 chars, mixed case, symbols"
                        error={passwordErrors.newPassword?.message}
                        leftIcon={<Lock className="h-4 w-4" />}
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="focus:outline-none text-muted-foreground hover:text-foreground cursor-pointer flex items-center h-full pr-1"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                        {...registerPassword('newPassword')}
                      />
                    </div>

                    {/* Password Strength Indicator */}
                    {newPasswordVal && (
                      <div className="flex flex-col gap-1.5 px-0.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                          <span>Password Strength:</span>
                          <span className="text-foreground">{passwordStrength.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <Input
                        label="Confirm New Password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter new password to verify"
                        error={passwordErrors.confirmNewPassword?.message}
                        leftIcon={<Lock className="h-4 w-4" />}
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="focus:outline-none text-muted-foreground hover:text-foreground cursor-pointer flex items-center h-full pr-1"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                        {...registerPassword('confirmNewPassword')}
                      />
                    </div>

                    <div className="pt-3">
                      <Button type="submit" isLoading={passwordSubmitting} className="h-10 px-6">
                        Update Password & Logout
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* TAB 3: Active Sessions */}
              {activeTab === 'sessions' && (
                <motion.div
                  key="sessions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Active Login Sessions</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        These devices are currently logged into your account. You can revoke any session at any time.
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      onClick={handleLogoutAll}
                      className="flex items-center gap-1.5 h-10 self-start md:self-auto"
                    >
                      <LogOut className="h-4 w-4" /> Logout Everywhere
                    </Button>
                  </div>

                  {loadingSessions ? (
                    <div className="flex flex-col items-center py-12 gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      <span className="text-sm text-muted-foreground">Retrieving active sessions...</span>
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-border rounded-xl">
                      <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No active sessions found.</p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-border text-left">
                        <thead className="bg-accent/40 text-xs font-bold text-muted-foreground uppercase">
                          <tr>
                            <th className="px-6 py-3">Device & Browser</th>
                            <th className="px-6 py-3">IP Address</th>
                            <th className="px-6 py-3">Logged In</th>
                            <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card text-sm">
                          {sessions.map((session) => (
                            <tr key={session.id} className="hover:bg-accent/10">
                              <td className="px-6 py-4 flex items-center gap-3">
                                <div className="p-2 bg-accent rounded-lg">
                                  {getDeviceIcon(session.device)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground">
                                    {session.os || 'Unknown OS'} • {session.browser || 'Unknown Browser'}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate max-w-xs">
                                    {session.userAgent}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-medium text-foreground">
                                {session.ipAddress || 'Local Address'}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleRevokeSession(session.id, session.token)}
                                  className="text-destructive hover:bg-destructive/10 p-2 rounded-lg cursor-pointer transition-colors"
                                  title="Revoke session"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 4: Activity logs */}
              {activeTab === 'logs' && (
                <motion.div
                  key="logs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Security Activity History</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Review recent changes, authentication events, and profile updates registered on your account.
                    </p>
                  </div>

                  {loadingLogs ? (
                    <div className="flex flex-col items-center py-12 gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      <span className="text-sm text-muted-foreground">Generating activity timeline...</span>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-border rounded-xl">
                      <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No recent activity detected.</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-border ml-4 pl-6 space-y-6 py-2">
                      {logs.map((log) => (
                        <div key={log.id} className="relative">
                          {/* Dot connector */}
                          <div className="absolute -left-[31px] top-1.5 p-1 bg-card rounded-full border-2 border-border text-primary flex items-center justify-center">
                            <Clock className="h-3 w-3" />
                          </div>

                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm uppercase tracking-wide">
                                {log.action.replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {log.details && (
                              <p className="text-xs text-muted-foreground bg-accent/20 p-2 rounded-lg inline-block self-start max-w-xl">
                                {log.details}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold mt-0.5">
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" /> {log.ipAddress || 'unknown ip'}
                              </span>
                              <span>
                                {log.os || 'Unknown OS'} • {log.browser || 'Unknown Browser'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
