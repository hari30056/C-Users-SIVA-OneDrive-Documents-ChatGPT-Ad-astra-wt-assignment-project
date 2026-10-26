export type UserRole = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';
export type OrganizerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type ReservationStatus = 'ACTIVE' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type TicketStatus = 'ACTIVE' | 'USED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizerId?: string | null;
}

export interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  description?: string | null;
  price: number;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
}

export interface Event {
  id: string;
  organizerId: string;
  organizerName?: string;
  title: string;
  description: string;
  venue: string;
  location: string;
  category: string;
  eventDate: string;
  salesStartDate: string;
  salesCutoffDate: string;
  status: EventStatus;
  imageUrl?: string | null;
  ticketTiers: TicketTier[];
}

export interface ReservationItem {
  id: string;
  reservationId: string;
  ticketTierId: string;
  tierName?: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
}

export interface Reservation {
  id?: string;
  reservationId: string;
  eventId: string;
  eventTitle?: string;
  eventDate?: string;
  eventVenue?: string;
  status: ReservationStatus;
  expiresAt: string;
  remainingSeconds: number;
  remainingTime: string;
  totalAmount: number;
  items: ReservationItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  ticketTierId: string;
  tierName?: string;
  quantity: number;
  unitPrice: number;
}

export interface Ticket {
  id: string;
  orderId: string;
  ticketTierId: string;
  ticketCode: string;
  status: TicketStatus;
  issuedAt: string;
  tierName?: string;
  eventTitle?: string;
  eventDate?: string;
  eventVenue?: string;
  eventLocation?: string;
  orderNumber?: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  transactionReference: string;
  amount: number;
  status: PaymentStatus;
  gatewayResponse?: any;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  reservationId: string;
  orderNumber: string;
  subtotal: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  eventTitle?: string;
  eventDate?: string;
  eventVenue?: string;
  organizerName?: string;
  items: OrderItem[];
  tickets: Ticket[];
  transactions: PaymentTransaction[];
}

export interface OrganizerAnalytics {
  totalRevenue: number;
  ticketsSold: number;
  ticketsReserved: number;
  availableTickets: number;
  totalOrders: number;
  successfulPayments: number;
  failedPayments: number;
  conversionRate: number;
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
