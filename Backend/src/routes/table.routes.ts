import { Router } from 'express';
import { TableController } from '../controllers/table.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();
const controller = new TableController();

router.use(authenticate);

router.get('/', requirePermission('Table.View'), controller.getTables);
router.post('/', requirePermission('Table.Create'), controller.createTable);
router.put('/:id', requirePermission('Table.Edit'), controller.updateTable);
router.delete('/:id', requirePermission('Table.Delete'), controller.deleteTable);

// Sessions
router.post('/sessions/open', requirePermission('Restaurant.Manage'), controller.openSession);
router.post('/sessions/close', requirePermission('Restaurant.Manage'), controller.closeSession);

// Merges & Splits & Transfers
router.post('/merge', requirePermission('Table.Merge'), controller.mergeTables);
router.post('/split', requirePermission('Table.Split'), controller.splitTables);
router.post('/transfer', requirePermission('Table.Transfer'), controller.transferTable);

export default router;
