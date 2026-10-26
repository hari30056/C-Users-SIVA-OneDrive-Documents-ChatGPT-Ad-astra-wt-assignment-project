import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/event_ticketing?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-dev-only-min-32-chars-long',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  paymentSimulationDelay: parseInt(process.env.PAYMENT_SIMULATION_DELAY || '2000', 10),
  frontendUrl: process.env.FRONTEND_URL || vercelUrl || 'http://localhost:5173',
  apiUrl: process.env.API_URL || (vercelUrl ? `${vercelUrl}/api` : 'http://localhost:5000/api'),
  reservationHoldMinutes: 10,
};
