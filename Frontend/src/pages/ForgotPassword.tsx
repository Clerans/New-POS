import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useNotificationStore } from '../store/notificationStore.js';
import apiClient from '../api/apiClient.js';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

export const ForgotPassword: React.FC = () => {
  const { addToast } = useNotificationStore();
  const [success, setSuccess] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', {
        email: data.email,
      });

      setSuccess(true);
      if (response.data.data?.devToken) {
        setDevToken(response.data.data.devToken);
      }

      addToast({
        title: 'Recovery code generated',
        message: 'A password reset token has been processed.',
        type: 'success',
      });
    } catch (error: any) {
      addToast({
        title: 'Request Failed',
        message: error.message || 'Something went wrong. Please check your connection.',
        type: 'error',
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-4"
    >
      <div className="text-center mb-1">
        <h2 className="text-xl font-bold tracking-tight">Forgot Password</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Enter your registered email below to receive instructions to reset your password.
        </p>
      </div>

      {!success ? (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="admin@cafechai.com"
            error={errors.email?.message}
            leftIcon={<Mail className="h-4 w-4" />}
            {...register('email')}
          />
          <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
            Generate Reset Link
          </Button>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground">
            If this email is registered in our database, a recovery token has been initialized.
            Please check your console or server logs for the mock email dispatch.
          </div>

          {devToken && (
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg flex flex-col gap-2">
              <span className="text-xs font-bold text-warning flex items-center gap-1.5 uppercase tracking-wider">
                <KeyRound className="h-3.5 w-3.5" /> Development Mode Override
              </span>
              <p className="text-xs text-muted-foreground">
                We detected that your environment is running in development mode. You can click the link below to bypass email checking:
              </p>
              <Link
                to={`/reset-password?token=${devToken}`}
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Go to Reset Password screen →
              </Link>
            </div>
          )}
        </motion.div>
      )}

      <div className="text-center mt-2 flex items-center justify-center">
        <Link
          to="/login"
          className="text-sm text-muted-foreground font-semibold hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
      </div>
    </motion.div>
  );
};

export default ForgotPassword;
