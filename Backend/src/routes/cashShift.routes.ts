import { Router } from 'express';
import { CashShiftController } from '../controllers/cashShift.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();
const controller = new CashShiftController();

router.use(authenticate);

router.get('/drawers', requirePermission('POS.CashDrawer'), controller.getDrawers);
router.get('/status', requirePermission('POS.CashDrawer'), controller.getShiftStatus);
router.post('/open', requirePermission('POS.CashDrawer'), controller.openShift);
router.post('/close', requirePermission('POS.CloseShift'), controller.closeShift);
router.post('/cash-in', requirePermission('POS.CashDrawer'), controller.cashIn);
router.post('/cash-out', requirePermission('POS.CashDrawer'), controller.cashOut);

export default router;
