import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { useNavigate, Link } from 'react-router-dom';

const schema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export const ResetPassword: React.FC = () => {
  const { addToast } = useNotificationStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (_data: FormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    addToast({
      title: 'Password updated',
      message: 'Your password has been reset successfully. Please log in with your new password.',
      type: 'success',
    });
    navigate('/login');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold">New Password</h2>
        <p className="text-sm text-muted-foreground">Enter a new secure password for your account</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="New Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm New Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
          Update Password
        </Button>
      </form>
      <div className="text-center mt-2">
        <Link to="/login" className="text-sm text-primary font-semibold hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
};
export default ResetPassword;
