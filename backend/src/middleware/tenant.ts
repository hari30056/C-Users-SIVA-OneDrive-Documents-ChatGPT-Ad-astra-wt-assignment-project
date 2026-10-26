import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { eventRepository } from '../repositories/eventRepository';
import { AppError } from '../utils/errors';

export const requireTenantEventOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    // Admins bypass tenant checks
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (req.user.role !== 'ORGANIZER' || !req.user.organizerId) {
      return next(AppError.forbidden('Only organizers can manage event resources'));
    }

    const eventId = req.params.eventId || req.params.id;
    if (!eventId) {
      return next();
    }

    const event = await eventRepository.findById(eventId);
    if (!event) {
      return next(AppError.notFound('Event'));
    }

    if (event.organizerId !== req.user.organizerId) {
      return next(
        new AppError('TENANT_VIOLATION', 'Tenant Isolation Violation: Access denied to events of other organizers', 403)
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};
