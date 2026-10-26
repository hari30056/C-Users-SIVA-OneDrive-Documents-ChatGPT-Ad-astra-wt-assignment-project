import { Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../utils/errors';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Authorization header with Bearer token is required');
    }

    const token = authHeader.split(' ')[1];
    const user = authService.verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuthenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const user = authService.verifyToken(token);
      req.user = user;
    }
  } catch {
    // optional, continue unauthenticated
  }
  next();
};
