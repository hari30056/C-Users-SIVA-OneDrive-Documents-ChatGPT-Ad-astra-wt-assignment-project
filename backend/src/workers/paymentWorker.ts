import { Worker, Job } from 'bullmq';
import { redisClient, isRedisConnected } from '../config/redis';
import { PAYMENT_QUEUE_NAME, executePaymentProcessing } from '../queues/paymentQueue';

export let paymentWorker: Worker | null = null;

export const startPaymentWorker = (): void => {
  if (!isRedisConnected || !redisClient) {
    console.log('ℹ️ Running mock payments via async worker process.');
    return;
  }

  try {
    paymentWorker = new Worker(
      PAYMENT_QUEUE_NAME,
      async (job: Job<{ orderId: string; transactionId: string; simulateFailure?: boolean }>) => {
        const { orderId, transactionId, simulateFailure } = job.data;
        await executePaymentProcessing(orderId, transactionId, simulateFailure);
      },
      {
        connection: redisClient as any,
        concurrency: 5,
      }
    );

    paymentWorker.on('completed', (job) => {
      console.log(`✅ [BullMQ Payment] Job ${job.id} completed`);
    });

    paymentWorker.on('failed', (job, err) => {
      console.error(`❌ [BullMQ Payment] Job ${job?.id} failed:`, err);
    });

    console.log('✅ BullMQ Payment Worker started');
  } catch (err) {
    console.warn('⚠️ BullMQ payment worker start error, running fallback:', err);
  }
};

export const stopPaymentWorker = async (): Promise<void> => {
  if (paymentWorker) {
    await paymentWorker.close();
  }
};
