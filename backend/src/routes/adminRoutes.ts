import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { analyticsController } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/users', adminController.getAllUsers);
router.get('/organizers', adminController.getAllOrganizers);
router.put('/organizers/:id/status', adminController.updateOrganizerStatus);
router.get('/events', adminController.getAllEvents);
router.get('/orders', adminController.getAllOrders);
router.get('/transactions', adminController.getAllTransactions);
router.get('/analytics', analyticsController.getPlatformAnalytics);

export default router;
