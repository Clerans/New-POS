import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();
const controller = new ProductController();

router.use(authenticate);

// Tags
router.get('/tags', requirePermission('Products.View'), controller.getTags);
router.post('/tags', requirePermission('Products.Create'), controller.createTag);

// Modifiers
router.get('/modifiers', requirePermission('Products.View'), controller.getModifierGroups);
router.get('/modifiers/:id', requirePermission('Products.View'), controller.getModifierGroupById);
router.post('/modifiers', requirePermission('Products.Create'), controller.createModifierGroup);
router.put('/modifiers/:id', requirePermission('Products.Edit'), controller.updateModifierGroup);
router.delete('/modifiers/:id', requirePermission('Products.Delete'), controller.deleteModifierGroup);

// Import & Export
router.get('/export', requirePermission('Products.View'), controller.exportProducts);
router.get('/import-logs', requirePermission('Products.View'), controller.getImportLogs);
router.post('/import', requirePermission('Products.Create'), controller.importProducts);

// Core Products
router.get('/', requirePermission('Products.View'), controller.getProducts);
router.get('/:id', requirePermission('Products.View'), controller.getProductById);
router.post('/', requirePermission('Products.Create'), controller.createProduct);
router.put('/:id', requirePermission('Products.Edit'), controller.updateProduct);
router.delete('/:id', requirePermission('Products.Delete'), controller.deleteProduct);

export default router;
