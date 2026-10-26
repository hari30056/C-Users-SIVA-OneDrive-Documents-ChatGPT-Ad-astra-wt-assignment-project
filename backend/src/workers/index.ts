import { initRedis } from '../config/redis';
import { initDatabase } from '../config/database';
import { initReservationQueue } from '../queues/reservationQueue';
import { initPaymentQueue } from '../queues/paymentQueue';
import { startReservationWorker, stopReservationWorker } from './reservationWorker';
import { startPaymentWorker, stopPaymentWorker } from './paymentWorker';

export const startAllWorkers = async (): Promise<void> => {
  console.log('🚀 Initializing background workers...');
  await initRedis();
  await initDatabase();

  initReservationQueue();
  initPaymentQueue();

  startReservationWorker();
  startPaymentWorker();

  console.log('⚡ All background workers operational');
};

export const stopAllWorkers = async (): Promise<void> => {
  console.log('🛑 Shutting down workers...');
  await stopReservationWorker();
  await stopPaymentWorker();
};

if (require.main === module) {
  startAllWorkers().catch((err) => {
    console.error('Fatal error starting workers:', err);
    process.exit(1);
  });

  process.on('SIGINT', async () => {
    await stopAllWorkers();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await stopAllWorkers();
    process.exit(0);
  });
}
