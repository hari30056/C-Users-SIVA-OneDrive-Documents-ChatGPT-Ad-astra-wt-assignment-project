import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config/environment';

export const createApp = (): Application => {
  const app = express();

  // Security Headers
  app.use(helmet());

  // Allowed CORS Origins
  const allowedOrigins = [
    config.frontendUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ].filter(Boolean);

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app') ||
          process.env.NODE_ENV !== 'production'
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate Limiter for general endpoints
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
      },
    },
  });
  app.use(generalLimiter);

  // Logging
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // API Routes (mounted on /api and root to support standard and rewritten serverless invocations)
  app.use('/api', routes);
  app.use(routes);

  // 404 Route Handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
