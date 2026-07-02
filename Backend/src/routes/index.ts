import { Router } from 'express';
import authRoutes from './auth.routes.js';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { successResponse } from '../utils/response.js';

const router = Router();

// Health Check Endpoint
router.get('/health', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisStatus = redis ? redis.status : 'disconnected';

    res.status(200).json(
      successResponse('System operational', {
        database: 'connected',
        redis: redisStatus,
        uptime: process.uptime(),
        timestamp: new Date(),
      })
    );
  } catch (error) {
    next(error);
  }
});

// Register Subrouters
router.use('/auth', authRoutes);

export default router;
