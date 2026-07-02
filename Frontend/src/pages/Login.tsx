import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useAuthStore } from '../store/authStore.js';
import { useUserStore } from '../store/userStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { useNavigate, Link } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { setTokens } = useAuthStore();
  const { setUser } = useUserStore();
  const { addToast } = useNotificationStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setTokens('mock-access-token', 'mock-refresh-token');
      setUser({
        id: '1',
        email: data.email,
        firstName: 'Michael',
        lastName: 'POS Admin',
        roles: ['Admin'],
        permissions: ['*'],
      });

      addToast({
        title: 'Logged in successfully',
        message: 'Welcome back, Michael!',
        type: 'success',
      });

      navigate('/dashboard');
    } catch (e) {
      addToast({
        title: 'Login failed',
        message: 'Invalid credentials. Please try again.',
        type: 'error',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Email Address"
        type="email"
        placeholder="admin@cafechai.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <div className="flex flex-col gap-1.5">
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs text-primary font-semibold hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
      <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
        Sign In
      </Button>
    </form>
  );
};
export default Login;
