import { Router } from 'express';
import { eventController } from '../controllers/eventController';
import { orderController } from '../controllers/orderController';
import { analyticsController } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';
import { requireOrganizer } from '../middleware/rbac';
import { requireTenantEventOwnership } from '../middleware/tenant';

const router = Router();

// All organizer routes require authentication & organizer role
router.use(authenticate, requireOrganizer);

router.get('/events', eventController.getOrganizerEvents);
router.post('/events', eventController.createEvent);

// Tenant-guarded event management
router.put('/events/:id', requireTenantEventOwnership, eventController.updateEvent);
router.delete('/events/:id', requireTenantEventOwnership, eventController.deleteEvent);
router.post('/events/:id/tiers', requireTenantEventOwnership, eventController.addTicketTier);

// Organizer orders & analytics
router.get('/orders', orderController.getOrganizerOrders);
router.get('/analytics', analyticsController.getOrganizerAnalytics);
router.get('/events/:id/analytics', requireTenantEventOwnership, analyticsController.getEventAnalytics);

export default router;
