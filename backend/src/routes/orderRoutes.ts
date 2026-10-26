import { Router } from 'express';
import { orderController } from '../controllers/orderController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', orderController.checkout);
router.get('/me', orderController.getMyOrders);
router.get('/:id', orderController.getOrderById);

export default router;
