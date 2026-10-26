import { Pool, PoolClient } from 'pg';
import { PrismaClient } from '@prisma/client';
import { config } from './environment';

export let prisma: PrismaClient = new PrismaClient();
export let pgPool: Pool | null = null;
export let isDbConnected = false;

export const initDatabase = async (): Promise<boolean> => {
  try {
    const pool = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 2000,
      max: 20,
    });

    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    pgPool = pool;
    isDbConnected = true;
    console.log('✅ Connected to PostgreSQL at', config.databaseUrl);

    // Also connect prisma
    await prisma.$connect();
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️ PostgreSQL not available (${message}) - using transactional state engine with row-locking`);
    isDbConnected = false;
    pgPool = null;
    return false;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (pgPool) {
    await pgPool.end();
  }
  await prisma.$disconnect();
};
