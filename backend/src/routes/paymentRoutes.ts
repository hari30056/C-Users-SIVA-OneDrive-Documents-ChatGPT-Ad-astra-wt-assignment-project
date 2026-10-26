import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/process', paymentController.processPayment);
router.get('/:id', paymentController.getPaymentStatus);

export default router;
