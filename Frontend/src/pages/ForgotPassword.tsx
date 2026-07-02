import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { Link } from 'react-router-dom';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

export const ForgotPassword: React.FC = () => {
  const { addToast } = useNotificationStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    addToast({
      title: 'Reset link sent',
      message: `An email has been sent to ${data.email} with password reset instructions.`,
      type: 'success',
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold">Reset Password</h2>
        <p className="text-sm text-muted-foreground">Enter your email and we'll send you a link to reset your password</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="admin@cafechai.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
          Send Reset Link
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
export default ForgotPassword;
