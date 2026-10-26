import { Router } from 'express';
import { reservationController } from '../controllers/reservationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/me', reservationController.getMyReservations);
router.get('/:id', reservationController.getReservation);
router.delete('/:id', reservationController.cancelReservation);

export default router;
