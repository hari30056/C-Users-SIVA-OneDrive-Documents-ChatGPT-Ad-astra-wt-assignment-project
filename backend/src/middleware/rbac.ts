import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { AppError } from '../utils/errors';

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`Access restricted to roles: [${roles.join(', ')}]. Current role: ${req.user.role}`)
      );
    }

    next();
  };
};

export const requireAdmin = requireRole('ADMIN');
export const requireOrganizer = requireRole('ORGANIZER', 'ADMIN');
export const requireAttendee = requireRole('ATTENDEE', 'ADMIN', 'ORGANIZER');
