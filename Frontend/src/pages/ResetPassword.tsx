import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useNotificationStore } from '../store/notificationStore.js';
import apiClient from '../api/apiClient.js';

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export const ResetPassword: React.FC = () => {
  const { addToast } = useNotificationStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'Weak', color: 'bg-destructive' });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const passwordVal = watch('password', '');

  // Calculate password strength dynamically
  useEffect(() => {
    let score = 0;
    if (!passwordVal) {
      setPasswordStrength({ score: 0, label: 'None', color: 'bg-border' });
      return;
    }

    if (passwordVal.length >= 8) score++;
    if (/[A-Z]/.test(passwordVal)) score++;
    if (/[a-z]/.test(passwordVal)) score++;
    if (/[0-9]/.test(passwordVal)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(passwordVal)) score++;

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
  }, [passwordVal]);

  const onSubmit = async (data: ResetFormValues) => {
    if (!token) {
      addToast({
        title: 'Error',
        message: 'Invalid or missing reset token. Please request another reset link.',
        type: 'error',
      });
      return;
    }

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password: data.password,
      });

      addToast({
        title: 'Password Updated',
        message: 'Your password has been changed successfully. You can now log in.',
        type: 'success',
      });

      // Auto redirect after delay
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error: any) {
      addToast({
        title: 'Reset Failed',
        message: error.message || 'The token is expired or invalid.',
        type: 'error',
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  if (!token) {
    return (
      <div className="text-center p-4">
        <div className="text-destructive font-bold text-lg mb-2">Invalid Token</div>
        <p className="text-sm text-muted-foreground mb-4">
          This password reset link is invalid or has expired. Please check your email or request a new reset link.
        </p>
        <Link to="/forgot-password">
          <Button variant="outline" className="w-full">
            Request New Link
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-4"
    >
      <div className="text-center mb-1">
        <h2 className="text-xl font-bold tracking-tight">New Password</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Create a strong, unique password with at least 8 characters.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* New Password Input */}
        <div className="relative">
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            error={errors.password?.message}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none hover:text-foreground cursor-pointer pointer-events-auto flex items-center justify-center h-full pr-1"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </button>
            }
            {...register('password')}
          />
        </div>

        {/* Strength Meter Bar */}
        {passwordVal && (
          <div className="flex flex-col gap-1.5 -mt-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
              <span>Password Strength:</span>
              <span className="text-foreground">{passwordStrength.label}</span>
            </div>
            <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed px-1 mt-0.5">
              Requires 8+ chars, uppercase, lowercase, numbers, and special symbols.
            </p>
          </div>
        )}

        {/* Confirm Password Input */}
        <div className="relative">
          <Input
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="focus:outline-none hover:text-foreground cursor-pointer pointer-events-auto flex items-center justify-center h-full pr-1"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </button>
            }
            {...register('confirmPassword')}
          />
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
          Reset Password
        </Button>
      </form>

      <div className="text-center mt-2">
        <Link
          to="/login"
          className="text-sm text-muted-foreground font-semibold hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
      </div>
    </motion.div>
  );
};

export default ResetPassword;
