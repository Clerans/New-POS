import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();
const controller = new CategoryController();

router.use(authenticate);

router.get('/', requirePermission('Products.View'), controller.getCategories);
router.get('/:id', requirePermission('Products.View'), controller.getCategoryById);
router.post('/', requirePermission('Products.Create'), controller.createCategory);
router.put('/:id', requirePermission('Products.Edit'), controller.updateCategory);
router.delete('/:id', requirePermission('Products.Delete'), controller.deleteCategory);

export default router;
