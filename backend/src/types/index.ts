import { Request } from 'express';

export type UserRole = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';
export type OrganizerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type ReservationStatus = 'ACTIVE' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type TicketStatus = 'ACTIVE' | 'USED' | 'CANCELLED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizerId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface ReservationHoldRequest {
  items: Array<{
    ticketTierId: string;
    quantity: number;
  }>;
}

export interface CheckoutRequest {
  reservationId: string;
}

export interface PaymentProcessRequest {
  orderId: string;
  paymentMethod?: string;
  simulateFailure?: boolean;
}

export interface OrganizerAnalytics {
  totalRevenue: number;
  ticketsSold: number;
  ticketsReserved: number;
  availableTickets: number;
  totalOrders: number;
  successfulPayments: number;
  failedPayments: number;
  conversionRate: number; // (completed purchases / total reservations) * 100
  revenueOverTime: Array<{ date: string; revenue: number }>;
  ticketSalesOverTime: Array<{ date: string; count: number }>;
  salesByTicketTier: Array<{ tierName: string; sold: number; revenue: number; available: number }>;
}

export interface PlatformAnalytics extends OrganizerAnalytics {
  totalOrganizers: number;
  activeOrganizers: number;
  totalEvents: number;
  totalUsers: number;
}
