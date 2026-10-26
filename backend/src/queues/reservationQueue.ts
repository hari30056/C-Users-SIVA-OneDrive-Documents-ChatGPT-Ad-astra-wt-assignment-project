import { Queue } from 'bullmq';
import { redisClient, isRedisConnected, cacheService } from '../config/redis';
import { config } from '../config/environment';
import { reservationRepository } from '../repositories/reservationRepository';

export const RESERVATION_QUEUE_NAME = 'reservation-expiry';

export let reservationQueue: Queue | null = null;

// In-memory timer fallback
const memoryTimers = new Map<string, NodeJS.Timeout>();

export const initReservationQueue = () => {
  if (isRedisConnected && redisClient) {
    try {
      reservationQueue = new Queue(RESERVATION_QUEUE_NAME, {
        connection: redisClient as any,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      });
      console.log('✅ BullMQ Reservation Queue initialized');
    } catch (err) {
      console.warn('⚠️ BullMQ Queue init error, using timer scheduler:', err);
      reservationQueue = null;
    }
  }
};

export const scheduleReservationExpiry = async (
  reservationId: string,
  eventId: string,
  delayMs: number = config.reservationHoldMinutes * 60 * 1000
): Promise<void> => {
  if (reservationQueue && isRedisConnected) {
    try {
      await reservationQueue.add(
        'expire',
        { reservationId, eventId },
        {
          delay: delayMs,
          jobId: `reservation-expiry-${reservationId}`,
        }
      );
      return;
    } catch (err) {
      console.warn('⚠️ BullMQ add error, falling back to timer:', err);
    }
  }

  // Clear existing timer if any
  if (memoryTimers.has(reservationId)) {
    clearTimeout(memoryTimers.get(reservationId)!);
  }

  const timer = setTimeout(async () => {
    try {
      await executeReservationExpiry(reservationId, eventId);
    } catch (err) {
      console.error(`Error expiring reservation ${reservationId}:`, err);
    } finally {
      memoryTimers.delete(reservationId);
    }
  }, delayMs);

  memoryTimers.set(reservationId, timer);
};

export const cancelReservationExpirySchedule = async (reservationId: string): Promise<void> => {
  if (reservationQueue && isRedisConnected) {
    try {
      const job = await reservationQueue.getJob(`reservation-expiry-${reservationId}`);
      if (job) await job.remove();
    } catch {
      // ignore
    }
  }

  if (memoryTimers.has(reservationId)) {
    clearTimeout(memoryTimers.get(reservationId)!);
    memoryTimers.delete(reservationId);
  }
};

export const executeReservationExpiry = async (reservationId: string, eventId: string): Promise<boolean> => {
  console.log(`⏱️ [Worker] Checking expiry for reservation ${reservationId}...`);
  const released = await reservationRepository.releaseExpiredReservation(reservationId);
  if (released) {
    console.log(`🔄 [Worker] Reservation ${reservationId} expired and inventory returned to pool.`);
    // Invalidate Redis cache for this event
    await cacheService.del(`event:${eventId}`);
    await cacheService.del(`event:${eventId}:availability`);
    await cacheService.delPrefix('public:events');
  } else {
    console.log(`ℹ️ [Worker] Reservation ${reservationId} was not ACTIVE or already handled.`);
  }
  return released;
};
