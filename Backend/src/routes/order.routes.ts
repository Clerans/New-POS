import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();
const controller = new OrderController();

router.use(authenticate);

router.post('/', requirePermission('POS.Create'), controller.createOrder);
router.get('/', requirePermission('POS.View'), controller.getOrders);
router.get('/history', requirePermission('POS.View'), controller.getOrderHistory);
router.get('/held', requirePermission('POS.View'), controller.getHeldOrders);
router.get('/:id', requirePermission('POS.View'), controller.getOrderById);
router.post('/hold', requirePermission('POS.View'), controller.holdOrder);
router.post('/resume/:id', requirePermission('POS.View'), controller.resumeOrder);
router.post('/split', requirePermission('POS.SplitBill'), controller.splitOrder);
router.post('/merge', requirePermission('POS.MergeBill'), controller.mergeOrders);
router.post('/pay', requirePermission('POS.Payment'), controller.payOrder);
router.post('/refund', requirePermission('POS.Refund'), controller.refundOrder);
router.post('/duplicate/:id', requirePermission('POS.Create'), controller.duplicateOrder);

export default router;
