import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  JWT_REFRESH_SECRET: z.string().min(8, 'JWT_REFRESH_SECRET must be at least 8 characters'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid redis connection string'),
  CLOUDINARY_NAME: z.string().min(1, 'CLOUDINARY_NAME is required'),
  CLOUDINARY_KEY: z.string().min(1, 'CLOUDINARY_KEY is required'),
  CLOUDINARY_SECRET: z.string().min(1, 'CLOUDINARY_SECRET is required'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
