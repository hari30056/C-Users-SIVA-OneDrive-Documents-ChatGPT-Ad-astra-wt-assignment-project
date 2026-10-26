import { Router } from 'express';
import { adminController } from '../controllers/adminController';

const router = Router();

router.get('/health', adminController.getHealth);

export default router;
