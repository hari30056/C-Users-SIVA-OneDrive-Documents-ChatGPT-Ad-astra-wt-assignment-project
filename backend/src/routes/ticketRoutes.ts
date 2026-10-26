import { Router } from 'express';
import { ticketController } from '../controllers/ticketController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/me', ticketController.getMyTickets);
router.get('/:id', ticketController.getTicketById);
router.post('/:id/verify', ticketController.verifyTicket);

export default router;
