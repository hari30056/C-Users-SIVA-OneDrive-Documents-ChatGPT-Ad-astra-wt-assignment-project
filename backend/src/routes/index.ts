import { Router } from 'express';
import authRoutes from './authRoutes';
import eventRoutes from './eventRoutes';
import organizerRoutes from './organizerRoutes';
import reservationRoutes from './reservationRoutes';
import orderRoutes from './orderRoutes';
import paymentRoutes from './paymentRoutes';
import ticketRoutes from './ticketRoutes';
import adminRoutes from './adminRoutes';
import healthRoutes from './healthRoutes';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/organizer', organizerRoutes);
router.use('/reservations', reservationRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/tickets', ticketRoutes);
router.use('/admin', adminRoutes);

export default router;
