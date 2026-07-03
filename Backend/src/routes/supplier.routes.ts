import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();
const controller = new SupplierController();

router.use(authenticate);

// Utility lookups
router.get('/units', requirePermission('Inventory.View'), controller.getIngredientUnits);
router.get('/ingredient-categories', requirePermission('Inventory.View'), controller.getIngredientCategories);

// Stock Movements Ledger
router.get('/movements', requirePermission('Inventory.View'), controller.getStockMovements);

// Inventory Alerts
router.get('/alerts', requirePermission('Inventory.View'), controller.getInventoryAlerts);
router.put('/alerts/:id/resolve', requirePermission('Inventory.Edit'), controller.resolveAlert);

// Purchase Orders
router.get('/purchase-orders', requirePermission('Inventory.View'), controller.getPurchaseOrders);
router.post('/purchase-orders', requirePermission('Inventory.Create'), controller.createPurchaseOrder);
router.put('/purchase-orders/:id/status', requirePermission('Inventory.Edit'), controller.updatePurchaseOrderStatus);

// Goods Receipts
router.get('/goods-receipts', requirePermission('Inventory.View'), controller.getGoodsReceipts);

// Suppliers
router.get('/', requirePermission('Inventory.View'), controller.getSuppliers);
router.get('/:id', requirePermission('Inventory.View'), controller.getSupplierById);
router.post('/', requirePermission('Inventory.Create'), controller.createSupplier);
router.put('/:id', requirePermission('Inventory.Edit'), controller.updateSupplier);
router.delete('/:id', requirePermission('Inventory.Delete'), controller.deleteSupplier);

export default router;
