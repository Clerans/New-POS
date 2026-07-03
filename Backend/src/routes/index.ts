import { Router } from 'express';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import floorRoutes from './floor.routes.js';
import tableRoutes from './table.routes.js';
import reservationRoutes from './reservation.routes.js';
import orderRoutes from './order.routes.js';
import cashShiftRoutes from './cashShift.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import customerRoutes from './customer.routes.js';
import inventoryRoutes from './inventory.routes.js';
import recipeRoutes from './recipe.routes.js';
import supplierRoutes from './supplier.routes.js';
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
router.use('/dashboard', dashboardRoutes);
router.use('/floors', floorRoutes);
router.use('/tables', tableRoutes);
router.use('/reservations', reservationRoutes);
router.use('/orders', orderRoutes);
router.use('/cash-shifts', cashShiftRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/customers', customerRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/recipes', recipeRoutes);
router.use('/suppliers', supplierRoutes);

export default router;
