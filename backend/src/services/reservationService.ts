import { reservationRepository, ReservationWithDetails } from '../repositories/reservationRepository';
import { scheduleReservationExpiry, cancelReservationExpirySchedule } from '../queues/reservationQueue';
import { cacheService } from '../config/redis';
import { config } from '../config/environment';
import { AppError } from '../utils/errors';
import { AuthUser } from '../types';

export interface ReservationHoldResponse {
  reservationId: string;
  eventId: string;
  status: string;
  expiresAt: string;
  remainingSeconds: number;
  remainingTime: string;
  totalAmount: number;
  items: Array<{
    ticketTierId: string;
    tierName?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export const reservationService = {
  async createHold(
    user: AuthUser,
    eventId: string,
    items: Array<{ ticketTierId: string; quantity: number }>
  ): Promise<ReservationHoldResponse> {
    if (!items || items.length === 0) {
      throw AppError.badRequest('At least one ticket tier must be selected');
    }

    for (const item of items) {
      if (!item.ticketTierId) {
        throw AppError.badRequest('Ticket tier ID is required');
      }
      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        throw AppError.badRequest('Quantity must be a positive whole number');
      }
      if (item.quantity > 20) {
        throw AppError.badRequest('Maximum 20 tickets allowed per reservation');
      }
    }

    // 1. Transaction-safe inventory reservation with row-level locking
    const hold = await reservationRepository.createHoldWithLocking(
      user.id,
      eventId,
      items,
      config.reservationHoldMinutes
    );

    // 2. Schedule 10-minute delayed background job for auto-expiry
    const delayMs = config.reservationHoldMinutes * 60 * 1000;
    await scheduleReservationExpiry(hold.id, eventId, delayMs);

    // 3. Invalidate Redis cache
    await cacheService.del(`event:${eventId}`);
    await cacheService.del(`event:${eventId}:availability`);
    await cacheService.delPrefix('public:events');

    // 4. Calculate countdown
    const remainingMs = Math.max(0, new Date(hold.expiresAt).getTime() - Date.now());
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const remainingFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return {
      reservationId: hold.id,
      eventId: hold.eventId,
      status: hold.status,
      expiresAt: hold.expiresAt.toISOString(),
      remainingSeconds,
      remainingTime: remainingFormatted,
      totalAmount: hold.totalAmount,
      items: hold.items.map((i) => ({
        ticketTierId: i.ticketTierId,
        tierName: i.tierName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.unitPrice * i.quantity,
      })),
    };
  },

  async getReservationById(id: string, user: AuthUser): Promise<ReservationHoldResponse> {
    const reservation = await reservationRepository.findById(id);
    if (!reservation) {
      throw AppError.notFound('Reservation');
    }

    // Security check: only owner, admin, or the event's organizer can view
    if (user.role === 'ATTENDEE' && reservation.userId !== user.id) {
      throw AppError.forbidden('You can only view your own reservations');
    }

    const now = Date.now();
    const expiresMs = new Date(reservation.expiresAt).getTime();
    const remainingMs = Math.max(0, expiresMs - now);
    const remainingSeconds = Math.floor(remainingMs / 1000);

    // If active but time has passed, trigger expiration
    let currentStatus = reservation.status;
    if (currentStatus === 'ACTIVE' && remainingSeconds === 0) {
      currentStatus = 'EXPIRED';
      // Asynchronously trigger release
      reservationRepository.releaseExpiredReservation(id).catch(console.error);
    }

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const remainingFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return {
      reservationId: reservation.id,
      eventId: reservation.eventId,
      status: currentStatus,
      expiresAt: reservation.expiresAt.toISOString(),
      remainingSeconds,
      remainingTime: remainingFormatted,
      totalAmount: reservation.totalAmount,
      items: reservation.items.map((i) => ({
        ticketTierId: i.ticketTierId,
        tierName: i.tierName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.unitPrice * i.quantity,
      })),
    };
  },

  async getUserReservations(userId: string): Promise<ReservationWithDetails[]> {
    return reservationRepository.findByUserId(userId);
  },

  async cancelReservation(id: string, user: AuthUser): Promise<boolean> {
    const reservation = await reservationRepository.findById(id);
    if (!reservation) {
      throw AppError.notFound('Reservation');
    }

    if (user.role !== 'ADMIN' && reservation.userId !== user.id) {
      throw AppError.forbidden('You can only cancel your own reservation');
    }

    await cancelReservationExpirySchedule(id);
    const success = await reservationRepository.cancelReservation(id, reservation.userId);

    // Invalidate Redis cache
    await cacheService.del(`event:${reservation.eventId}`);
    await cacheService.del(`event:${reservation.eventId}:availability`);
    await cacheService.delPrefix('public:events');

    return success;
  },
};
