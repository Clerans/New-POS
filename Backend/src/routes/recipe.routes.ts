import { Router } from 'express';
import { RecipeController } from '../controllers/recipe.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();
const controller = new RecipeController();

router.use(authenticate);

router.get('/', requirePermission('Inventory.View'), controller.getRecipes);
router.post('/', requirePermission('Inventory.Create'), controller.createRecipe);
router.put('/:id', requirePermission('Inventory.Edit'), controller.updateRecipe);
router.delete('/:id', requirePermission('Inventory.Delete'), controller.deleteRecipe);

export default router;
