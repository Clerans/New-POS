import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();
const controller = new DashboardController();

// All dashboard endpoints require authentication
router.use(authenticate);

router.get('/summary', requirePermission('Dashboard.View'), controller.getSummary);
router.get('/sales', requirePermission('Dashboard.Analytics'), controller.getSalesAnalytics);
router.get('/orders', requirePermission('Dashboard.Analytics'), controller.getOrderAnalytics);
router.get('/customers', requirePermission('Dashboard.Analytics'), controller.getCustomerAnalytics);
router.get('/products', requirePermission('Dashboard.Analytics'), controller.getProductAnalytics);
router.get('/inventory', requirePermission('Dashboard.Inventory'), controller.getInventorySummary);
router.get('/finance', requirePermission('Dashboard.Finance'), controller.getFinancialSummary);
router.get('/kitchen', requirePermission('Dashboard.Kitchen'), controller.getLiveStatus);
router.get('/reservations', requirePermission('Dashboard.View'), controller.getReservationSummary);
router.get('/activities', requirePermission('Dashboard.View'), controller.getRecentOrders);
router.get('/notifications', requirePermission('Dashboard.View'), controller.getNotifications);

// Simulated POS interaction actions
router.post('/mock-order', requirePermission('Orders.Create'), controller.createMockOrder);
router.post('/restock/:id', requirePermission('Inventory.Edit'), controller.restockProduct);

export default router;
