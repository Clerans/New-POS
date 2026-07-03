import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();
const controller = new InventoryController();

router.use(authenticate);

// Dashboard & Reports
router.get('/dashboard', requirePermission('Inventory.View'), controller.getDashboard);
router.get('/reports', requirePermission('Inventory.View'), controller.getReports);

// Ingredients
router.get('/ingredients', requirePermission('Inventory.View'), controller.getIngredients);
router.post('/ingredients', requirePermission('Inventory.Create'), controller.createIngredient);
router.put('/ingredients/:id', requirePermission('Inventory.Edit'), controller.updateIngredient);
router.delete('/ingredients/:id', requirePermission('Inventory.Delete'), controller.deleteIngredient);

// Goods Receiving (GRN)
router.post('/receiving', requirePermission('Inventory.Create'), controller.createGoodsReceipt);

// Stock Operations
router.post('/adjustments', requirePermission('Inventory.Edit'), controller.createStockAdjustment);
router.post('/transfers', requirePermission('Inventory.Edit'), controller.createStockTransfer);
router.post('/waste', requirePermission('Inventory.Edit'), controller.createWaste);

export default router;
