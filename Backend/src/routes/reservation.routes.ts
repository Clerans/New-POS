import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();
const controller = new ReservationController();

router.use(authenticate);

router.get('/', requirePermission('Reservation.View'), controller.getReservations);
router.post('/', requirePermission('Reservation.Create'), controller.createReservation);
router.put('/:id', requirePermission('Reservation.Edit'), controller.updateReservation);
router.delete('/:id', requirePermission('Reservation.Delete'), controller.deleteReservation);

// Waitlist
router.get('/waitlist', requirePermission('Reservation.View'), controller.getWaitlist);
router.post('/waitlist', requirePermission('Waitlist.Manage'), controller.createWaitlistEntry);
router.post('/waitlist/seat', requirePermission('Waitlist.Manage'), controller.seatWaitlistEntry);

export default router;
