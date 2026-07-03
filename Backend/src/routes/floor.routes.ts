import { Router } from 'express';
import { FloorController } from '../controllers/floor.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();
const controller = new FloorController();

router.use(authenticate);

router.get('/', requirePermission('Floor.View'), controller.getFloors);
router.post('/', requirePermission('Floor.Create'), controller.createFloor);
router.put('/:id', requirePermission('Floor.Edit'), controller.updateFloor);
router.delete('/:id', requirePermission('Floor.Delete'), controller.deleteFloor);

export default router;
