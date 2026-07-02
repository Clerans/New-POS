import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { Checkbox } from '../components/ui/Checkbox.js';
import { useAuthStore } from '../store/authStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import apiClient from '../api/apiClient.js';

const loginSchema = z.object({
  emailOrUsername: z.string().min(3, 'Email or username must be at least 3 characters'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuthStore();
  const { addToast } = useNotificationStore();
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: localStorage.getItem('cafechai-remembered-email') || '',
      rememberMe: !!localStorage.getItem('cafechai-remembered-email'),
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const response = await apiClient.post('/auth/login', {
        emailOrUsername: data.emailOrUsername,
        password: data.password,
      });

      const { user, accessToken, refreshToken } = response.data.data;

      // Handle Remember Me
      if (data.rememberMe) {
        localStorage.setItem('cafechai-remembered-email', data.emailOrUsername);
      } else {
        localStorage.removeItem('cafechai-remembered-email');
      }

      // Store credentials and set authenticated
      login(user, accessToken, refreshToken);

      addToast({
        title: 'Logged in successfully',
        message: `Welcome back, ${user.displayName || user.firstName || 'User'}!`,
        type: 'success',
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      const msg = error.message || 'Invalid credentials. Please try again.';
      addToast({
        title: 'Authentication Failed',
        message: msg,
        type: 'error',
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
        ease: 'easeOut',
        staggerChildren: 0.08,
      },
    },
  } as any;

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 },
  } as any;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-1"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Email or Username Input */}
        <motion.div variants={itemVariants}>
          <Input
            label="Email or Username"
            type="text"
            placeholder="e.g. admin or admin@cafechai.com"
            error={errors.emailOrUsername?.message}
            leftIcon={<Mail className="h-4 w-4" />}
            {...register('emailOrUsername')}
          />
        </motion.div>

        {/* Password Input */}
        <motion.div variants={itemVariants} className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            error={errors.password?.message}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none hover:text-foreground cursor-pointer pointer-events-auto flex items-center justify-center h-full pr-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 hover:text-primary transition-colors" />
                ) : (
                  <Eye className="h-4 w-4 hover:text-primary transition-colors" />
                )}
              </button>
            }
            {...register('password')}
          />
        </motion.div>

        {/* Remember me & Forgot Password */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between mt-1"
        >
          <Checkbox
            label="Remember me"
            id="rememberMe"
            {...register('rememberMe')}
          />
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-primary hover:underline hover:text-primary/90 transition-colors"
          >
            Forgot password?
          </Link>
        </motion.div>

        {/* Action Button */}
        <motion.div variants={itemVariants} className="mt-2">
          <Button
            type="submit"
            className="w-full h-11"
            isLoading={isSubmitting}
          >
            Sign In
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
};

export default Login;
