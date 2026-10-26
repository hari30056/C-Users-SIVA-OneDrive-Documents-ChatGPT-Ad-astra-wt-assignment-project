export type ErrorCode =
  | 'INSUFFICIENT_TICKETS'
  | 'RESERVATION_EXPIRED'
  | 'EVENT_SALES_CLOSED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'PAYMENT_FAILED'
  | 'DUPLICATE_REQUEST'
  | 'VALIDATION_ERROR'
  | 'TENANT_VIOLATION'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code: ErrorCode = 'VALIDATION_ERROR', details?: unknown) {
    return new AppError(code, message, 400, details);
  }

  static unauthorized(message: string = 'Authentication required') {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message: string = 'Access denied to this resource') {
    return new AppError('FORBIDDEN', message, 403);
  }

  static notFound(resource: string = 'Resource') {
    return new AppError('RESOURCE_NOT_FOUND', `${resource} not found`, 404);
  }

  static insufficientTickets(message: string = 'Not enough tickets available') {
    return new AppError('INSUFFICIENT_TICKETS', message, 409);
  }

  static reservationExpired(message: string = 'The reservation hold has expired') {
    return new AppError('RESERVATION_EXPIRED', message, 410);
  }

  static duplicateRequest(message: string = 'A request of this type is already pending or completed') {
    return new AppError('DUPLICATE_REQUEST', message, 409);
  }

  static paymentFailed(message: string = 'Payment processing failed') {
    return new AppError('PAYMENT_FAILED', message, 402);
  }

  static internal(message: string = 'An unexpected error occurred') {
    return new AppError('INTERNAL_ERROR', message, 500);
  }
}
