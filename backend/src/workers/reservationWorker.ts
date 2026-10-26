import { Worker, Job } from 'bullmq';
import { redisClient, isRedisConnected } from '../config/redis';
import { RESERVATION_QUEUE_NAME, executeReservationExpiry } from '../queues/reservationQueue';

export let reservationWorker: Worker | null = null;

export const startReservationWorker = (): void => {
  if (!isRedisConnected || !redisClient) {
    console.log('ℹ️ Running reservation expiry via lightweight in-process scheduler.');
    return;
  }

  try {
    reservationWorker = new Worker(
      RESERVATION_QUEUE_NAME,
      async (job: Job<{ reservationId: string; eventId: string }>) => {
        const { reservationId, eventId } = job.data;
        await executeReservationExpiry(reservationId, eventId);
      },
      {
        connection: redisClient as any,
        concurrency: 5,
      }
    );

    reservationWorker.on('completed', (job) => {
      console.log(`✅ [BullMQ] Job ${job.id} completed successfully`);
    });

    reservationWorker.on('failed', (job, err) => {
      console.error(`❌ [BullMQ] Job ${job?.id} failed with error:`, err);
    });

    console.log('✅ BullMQ Reservation Expiration Worker started');
  } catch (err) {
    console.warn('⚠️ BullMQ worker start error, running in-memory worker fallback:', err);
  }
};

export const stopReservationWorker = async (): Promise<void> => {
  if (reservationWorker) {
    await reservationWorker.close();
  }
};
