import { Router } from 'express';
import { eventController } from '../controllers/eventController';
import { reservationController } from '../controllers/reservationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', eventController.getPublicEvents);
router.get('/:id', eventController.getEventById);
router.get('/:id/availability', eventController.getEventAvailability);

// Reservation on event (Attendee)
router.post('/:eventId/reservations', authenticate, reservationController.createReservation);

export default router;
