import { createApp } from '../backend/src/app';
import { initDatabase } from '../backend/src/config/database';
import { initRedis } from '../backend/src/config/redis';

const app = createApp();
let isInitialized = false;
let initPromise: Promise<void> | null = null;

const ensureInitialized = async () => {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await Promise.allSettled([initDatabase(), initRedis()]);
      } catch (err) {
        console.warn('Vercel initialization notice:', err);
      }
      isInitialized = true;
    })();
  }
  await initPromise;
};

export default async function handler(req: any, res: any) {
  await ensureInitialized();
  return app(req, res);
}
