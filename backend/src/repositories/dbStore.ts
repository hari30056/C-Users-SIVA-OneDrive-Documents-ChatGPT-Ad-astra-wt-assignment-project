import { v4 as uuidv4 } from 'uuid';
import { pgPool, prisma, isDbConnected } from '../config/database';
import { UserRole, OrganizerStatus, EventStatus, ReservationStatus, OrderStatus, PaymentStatus, TicketStatus } from '../types';

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizerEntity {
  id: string;
  organizationName: string;
  ownerUserId: string;
  status: OrganizerStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventEntity {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  venue: string;
  location: string;
  category: string;
  eventDate: Date;
  salesStartDate: Date;
  salesCutoffDate: Date;
  status: EventStatus;
  imageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketTierEntity {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  price: number;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationEntity {
  id: string;
  userId: string;
  eventId: string;
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationItemEntity {
  id: string;
  reservationId: string;
  ticketTierId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderEntity {
  id: string;
  userId: string;
  eventId: string;
  reservationId: string;
  orderNumber: string;
  subtotal: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemEntity {
  id: string;
  orderId: string;
  ticketTierId: string;
  quantity: number;
  unitPrice: number;
}

export interface PaymentTransactionEntity {
  id: string;
  orderId: string;
  transactionReference: string;
  amount: number;
  status: PaymentStatus;
  gatewayResponse: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketEntity {
  id: string;
  orderId: string;
  ticketTierId: string;
  ticketCode: string;
  status: TicketStatus;
  issuedAt: Date;
}

// In-Memory Database Store for environments without active Postgres daemon
export class InMemoryDb {
  users = new Map<string, UserEntity>();
  organizers = new Map<string, OrganizerEntity>();
  events = new Map<string, EventEntity>();
  ticketTiers = new Map<string, TicketTierEntity>();
  reservations = new Map<string, ReservationEntity>();
  reservationItems = new Map<string, ReservationItemEntity>();
  orders = new Map<string, OrderEntity>();
  orderItems = new Map<string, OrderItemEntity>();
  paymentTransactions = new Map<string, PaymentTransactionEntity>();
  tickets = new Map<string, TicketEntity>();

  // Mutex for row-level locking simulation
  private rowLocks = new Map<string, Promise<void>>();

  async acquireLock(resourceId: string): Promise<() => void> {
    while (this.rowLocks.has(resourceId)) {
      await this.rowLocks.get(resourceId);
    }

    let releaseLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = () => {
        this.rowLocks.delete(resourceId);
        resolve();
      };
    });

    this.rowLocks.set(resourceId, lockPromise);
    return releaseLock;
  }

  clear() {
    this.users.clear();
    this.organizers.clear();
    this.events.clear();
    this.ticketTiers.clear();
    this.reservations.clear();
    this.reservationItems.clear();
    this.orders.clear();
    this.orderItems.clear();
    this.paymentTransactions.clear();
    this.tickets.clear();
    this.rowLocks.clear();
  }
}

export const inMemoryDb = new InMemoryDb();
