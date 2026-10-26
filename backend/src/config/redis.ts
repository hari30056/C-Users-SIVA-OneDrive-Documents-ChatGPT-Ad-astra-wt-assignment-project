import Redis from 'ioredis';
import { config } from './environment';

export let redisClient: Redis | null = null;
export let isRedisConnected = false;

// In-memory cache fallback for high-availability & zero-downtime development
const memoryCache = new Map<string, { value: string; expiry: number | null }>();

export const initRedis = async (): Promise<boolean> => {
  try {
    const client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: (times) => {
        if (times > 2) return null; // stop reconnecting if redis not running locally
        return 500;
      },
      lazyConnect: true,
    });

    client.on('error', (err) => {
      // suppress verbose connection refused logs in dev
      isRedisConnected = false;
    });

    client.on('connect', () => {
      isRedisConnected = true;
      console.log('✅ Connected to Redis at', config.redisUrl);
    });

    await client.connect();
    redisClient = client;
    isRedisConnected = true;
    return true;
  } catch (err) {
    console.warn('⚠️ Redis not available at', config.redisUrl, '- using in-memory cache & event dispatcher');
    redisClient = null;
    isRedisConnected = false;
    return false;
  }
};

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    if (redisClient && isRedisConnected) {
      try {
        const raw = await redisClient.get(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        // fallback to memory
      }
    }

    const item = memoryCache.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      memoryCache.delete(key);
      return null;
    }
    return JSON.parse(item.value);
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (redisClient && isRedisConnected) {
      try {
        if (ttlSeconds) {
          await redisClient.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await redisClient.set(key, serialized);
        }
        return;
      } catch {
        // fallback to memory
      }
    }

    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    memoryCache.set(key, { value: serialized, expiry });
  },

  async del(key: string): Promise<void> {
    if (redisClient && isRedisConnected) {
      try {
        await redisClient.del(key);
      } catch {
        // ignore
      }
    }
    memoryCache.delete(key);
  },

  async delPrefix(prefix: string): Promise<void> {
    if (redisClient && isRedisConnected) {
      try {
        const keys = await redisClient.keys(`${prefix}*`);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } catch {
        // ignore
      }
    }

    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  },

  clearMemory(): void {
    memoryCache.clear();
  }
};
