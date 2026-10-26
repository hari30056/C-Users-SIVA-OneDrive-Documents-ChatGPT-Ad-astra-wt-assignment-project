import { Queue } from 'bullmq';
import { redisClient, isRedisConnected, cacheService } from '../config/redis';
import { config } from '../config/environment';
import { orderRepository } from '../repositories/orderRepository';
import { paymentRepository } from '../repositories/paymentRepository';

export const PAYMENT_QUEUE_NAME = 'payment-processing';

export let paymentQueue: Queue | null = null;

export const initPaymentQueue = () => {
  if (isRedisConnected && redisClient) {
    try {
      paymentQueue = new Queue(PAYMENT_QUEUE_NAME, {
        connection: redisClient as any,
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'fixed', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      });
      console.log('✅ BullMQ Payment Queue initialized');
    } catch (err) {
      console.warn('⚠️ BullMQ Payment Queue init error:', err);
      paymentQueue = null;
    }
  }
};

export const enqueuePaymentJob = async (payload: {
  orderId: string;
  transactionId: string;
  simulateFailure?: boolean;
  delayMs?: number;
}): Promise<void> => {
  const delay = payload.delayMs ?? config.paymentSimulationDelay;

  if (paymentQueue && isRedisConnected) {
    try {
      await paymentQueue.add('process-payment', payload, {
        delay,
        jobId: `payment-${payload.transactionId}`,
      });
      return;
    } catch (err) {
      console.warn('⚠️ BullMQ add error, executing via async timer:', err);
    }
  }

  // Fallback asynchronous execution with configurable delay
  setTimeout(async () => {
    try {
      await executePaymentProcessing(payload.orderId, payload.transactionId, payload.simulateFailure);
    } catch (err) {
      console.error(`Error processing payment ${payload.transactionId}:`, err);
    }
  }, delay);
};

export const executePaymentProcessing = async (
  orderId: string,
  transactionId: string,
  simulateFailure?: boolean
): Promise<void> => {
  console.log(`💳 [Payment Worker] Processing transaction ${transactionId} for order ${orderId}...`);

  const order = await orderRepository.findById(orderId);
  if (!order) {
    console.error(`Order ${orderId} not found during payment processing`);
    return;
  }

  // Check if order is already resolved
  if (order.status !== 'PENDING') {
    console.log(`Order ${orderId} already in status ${order.status}. Skipping payment processing.`);
    return;
  }

  // Deterministic failure triggers:
  // 1. Explicit simulateFailure flag in request
  // 2. Specific test amounts (e.g. 999.99 or 0.01)
  // 3. User email containing 'fail' or 'decline'
  let outcome: 'SUCCESS' | 'FAILED' = 'SUCCESS';

  if (
    simulateFailure === true ||
    order.totalAmount === 999.99 ||
    order.userEmail?.toLowerCase().includes('fail') ||
    order.userEmail?.toLowerCase().includes('decline')
  ) {
    outcome = 'FAILED';
  }

  const gatewayResponse = {
    processor: 'MockPaymentGateway-v1',
    timestamp: new Date().toISOString(),
    transactionId,
    orderId,
    status: outcome,
    amount: order.totalAmount,
    currency: 'USD',
    responseCode: outcome === 'SUCCESS' ? 'AUTH_200_APPROVED' : 'AUTH_402_DECLINED',
    declineReason: outcome === 'FAILED' ? 'Simulated card decline or insufficient funds' : null,
  };

  const finalizedOrder = await orderRepository.finalizeOrderTransaction(
    orderId,
    transactionId,
    outcome,
    gatewayResponse
  );

  console.log(`✅ [Payment Worker] Transaction ${transactionId} marked ${outcome}. Order is now ${finalizedOrder.status}`);

  // Invalidate cache for the event
  await cacheService.del(`event:${order.eventId}`);
  await cacheService.del(`event:${order.eventId}:availability`);
  await cacheService.delPrefix('public:events');
  await cacheService.delPrefix('organizer:analytics');
};
