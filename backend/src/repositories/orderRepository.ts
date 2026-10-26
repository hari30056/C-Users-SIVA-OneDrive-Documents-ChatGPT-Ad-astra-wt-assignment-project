import { prisma, pgPool, isDbConnected } from '../config/database';
import { inMemoryDb, OrderEntity, OrderItemEntity, TicketEntity, PaymentTransactionEntity } from './dbStore';
import { v4 as uuidv4 } from 'uuid';
import { OrderStatus, PaymentStatus } from '../types';
import { AppError } from '../utils/errors';

export interface OrderWithDetails extends OrderEntity {
  eventTitle?: string;
  eventDate?: Date;
  eventVenue?: string;
  organizerName?: string;
  userName?: string;
  userEmail?: string;
  items: Array<OrderItemEntity & { tierName?: string }>;
  tickets: TicketEntity[];
  transactions: PaymentTransactionEntity[];
}

export const orderRepository = {
  async findById(id: string): Promise<OrderWithDetails | null> {
    if (isDbConnected) {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          event: { include: { organizer: true } },
          user: true,
          items: { include: { ticketTier: true } },
          tickets: true,
          transactions: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (!order) return null;

      return {
        id: order.id,
        userId: order.userId,
        eventId: order.eventId,
        reservationId: order.reservationId,
        orderNumber: order.orderNumber,
        subtotal: Number(order.subtotal),
        totalAmount: Number(order.totalAmount),
        status: order.status as OrderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        eventTitle: order.event.title,
        eventDate: order.event.eventDate,
        eventVenue: order.event.venue,
        organizerName: order.event.organizer?.organizationName,
        userName: order.user?.name,
        userEmail: order.user?.email,
        items: order.items.map((i) => ({
          id: i.id,
          orderId: i.orderId,
          ticketTierId: i.ticketTierId,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          tierName: i.ticketTier.name,
        })),
        tickets: order.tickets.map((t) => ({
          id: t.id,
          orderId: t.orderId,
          ticketTierId: t.ticketTierId,
          ticketCode: t.ticketCode,
          status: t.status as any,
          issuedAt: t.issuedAt,
        })),
        transactions: order.transactions.map((tx) => ({
          id: tx.id,
          orderId: tx.orderId,
          transactionReference: tx.transactionReference,
          amount: Number(tx.amount),
          status: tx.status as PaymentStatus,
          gatewayResponse: tx.gatewayResponse,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
        })),
      };
    }

    const order = inMemoryDb.orders.get(id);
    if (!order) return null;

    const event = inMemoryDb.events.get(order.eventId);
    const org = event ? inMemoryDb.organizers.get(event.organizerId) : undefined;
    const user = inMemoryDb.users.get(order.userId);
    const items = Array.from(inMemoryDb.orderItems.values())
      .filter((i) => i.orderId === id)
      .map((i) => {
        const tier = inMemoryDb.ticketTiers.get(i.ticketTierId);
        return {
          ...i,
          tierName: tier?.name || 'Ticket',
        };
      });
    const tickets = Array.from(inMemoryDb.tickets.values()).filter((t) => t.orderId === id);
    const transactions = Array.from(inMemoryDb.paymentTransactions.values())
      .filter((tx) => tx.orderId === id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      ...order,
      eventTitle: event?.title,
      eventDate: event?.eventDate,
      eventVenue: event?.venue,
      organizerName: org?.organizationName,
      userName: user?.name,
      userEmail: user?.email,
      items,
      tickets,
      transactions,
    };
  },

  async findByReservationId(reservationId: string): Promise<OrderEntity | null> {
    if (isDbConnected) {
      const order = await prisma.order.findUnique({ where: { reservationId } });
      if (!order) return null;
      return {
        id: order.id,
        userId: order.userId,
        eventId: order.eventId,
        reservationId: order.reservationId,
        orderNumber: order.orderNumber,
        subtotal: Number(order.subtotal),
        totalAmount: Number(order.totalAmount),
        status: order.status as OrderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    }

    for (const order of inMemoryDb.orders.values()) {
      if (order.reservationId === reservationId) return order;
    }
    return null;
  },

  async findByUserId(userId: string): Promise<OrderWithDetails[]> {
    if (isDbConnected) {
      const list = await prisma.order.findMany({
        where: { userId },
        include: {
          event: { include: { organizer: true } },
          items: { include: { ticketTier: true } },
          tickets: true,
          transactions: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return list.map((order) => ({
        id: order.id,
        userId: order.userId,
        eventId: order.eventId,
        reservationId: order.reservationId,
        orderNumber: order.orderNumber,
        subtotal: Number(order.subtotal),
        totalAmount: Number(order.totalAmount),
        status: order.status as OrderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        eventTitle: order.event.title,
        eventDate: order.event.eventDate,
        eventVenue: order.event.venue,
        organizerName: order.event.organizer?.organizationName,
        items: order.items.map((i) => ({
          id: i.id,
          orderId: i.orderId,
          ticketTierId: i.ticketTierId,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          tierName: i.ticketTier.name,
        })),
        tickets: order.tickets.map((t) => ({
          id: t.id,
          orderId: t.orderId,
          ticketTierId: t.ticketTierId,
          ticketCode: t.ticketCode,
          status: t.status as any,
          issuedAt: t.issuedAt,
        })),
        transactions: order.transactions.map((tx) => ({
          id: tx.id,
          orderId: tx.orderId,
          transactionReference: tx.transactionReference,
          amount: Number(tx.amount),
          status: tx.status as PaymentStatus,
          gatewayResponse: tx.gatewayResponse,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
        })),
      }));
    }

    const list = Array.from(inMemoryDb.orders.values())
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return list.map((order) => {
      const event = inMemoryDb.events.get(order.eventId);
      const org = event ? inMemoryDb.organizers.get(event.organizerId) : undefined;
      const items = Array.from(inMemoryDb.orderItems.values())
        .filter((i) => i.orderId === order.id)
        .map((i) => {
          const tier = inMemoryDb.ticketTiers.get(i.ticketTierId);
          return {
            ...i,
            tierName: tier?.name || 'Ticket',
          };
        });
      const tickets = Array.from(inMemoryDb.tickets.values()).filter((t) => t.orderId === order.id);
      const transactions = Array.from(inMemoryDb.paymentTransactions.values())
        .filter((tx) => tx.orderId === order.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        ...order,
        eventTitle: event?.title,
        eventDate: event?.eventDate,
        eventVenue: event?.venue,
        organizerName: org?.organizationName,
        items,
        tickets,
        transactions,
      };
    });
  },

  async findByOrganizerId(organizerId: string): Promise<OrderWithDetails[]> {
    if (isDbConnected) {
      const list = await prisma.order.findMany({
        where: { event: { organizerId } },
        include: {
          event: { include: { organizer: true } },
          user: true,
          items: { include: { ticketTier: true } },
          tickets: true,
          transactions: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return list.map((order) => ({
        id: order.id,
        userId: order.userId,
        eventId: order.eventId,
        reservationId: order.reservationId,
        orderNumber: order.orderNumber,
        subtotal: Number(order.subtotal),
        totalAmount: Number(order.totalAmount),
        status: order.status as OrderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        eventTitle: order.event.title,
        eventDate: order.event.eventDate,
        eventVenue: order.event.venue,
        organizerName: order.event.organizer?.organizationName,
        userName: order.user?.name,
        userEmail: order.user?.email,
        items: order.items.map((i) => ({
          id: i.id,
          orderId: i.orderId,
          ticketTierId: i.ticketTierId,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          tierName: i.ticketTier.name,
        })),
        tickets: order.tickets.map((t) => ({
          id: t.id,
          orderId: t.orderId,
          ticketTierId: t.ticketTierId,
          ticketCode: t.ticketCode,
          status: t.status as any,
          issuedAt: t.issuedAt,
        })),
        transactions: order.transactions.map((tx) => ({
          id: tx.id,
          orderId: tx.orderId,
          transactionReference: tx.transactionReference,
          amount: Number(tx.amount),
          status: tx.status as PaymentStatus,
          gatewayResponse: tx.gatewayResponse,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
        })),
      }));
    }

    const orgEvents = new Set(
      Array.from(inMemoryDb.events.values())
        .filter((e) => e.organizerId === organizerId)
        .map((e) => e.id)
    );

    const list = Array.from(inMemoryDb.orders.values())
      .filter((o) => orgEvents.has(o.eventId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return list.map((order) => {
      const event = inMemoryDb.events.get(order.eventId);
      const user = inMemoryDb.users.get(order.userId);
      const items = Array.from(inMemoryDb.orderItems.values())
        .filter((i) => i.orderId === order.id)
        .map((i) => {
          const tier = inMemoryDb.ticketTiers.get(i.ticketTierId);
          return {
            ...i,
            tierName: tier?.name || 'Ticket',
          };
        });
      const tickets = Array.from(inMemoryDb.tickets.values()).filter((t) => t.orderId === order.id);
      const transactions = Array.from(inMemoryDb.paymentTransactions.values())
        .filter((tx) => tx.orderId === order.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        ...order,
        eventTitle: event?.title,
        eventDate: event?.eventDate,
        eventVenue: event?.venue,
        userName: user?.name,
        userEmail: user?.email,
        items,
        tickets,
        transactions,
      };
    });
  },

  async findAllAdmin(): Promise<OrderWithDetails[]> {
    if (isDbConnected) {
      const list = await prisma.order.findMany({
        include: {
          event: { include: { organizer: true } },
          user: true,
          items: { include: { ticketTier: true } },
          tickets: true,
          transactions: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return list.map((order) => ({
        id: order.id,
        userId: order.userId,
        eventId: order.eventId,
        reservationId: order.reservationId,
        orderNumber: order.orderNumber,
        subtotal: Number(order.subtotal),
        totalAmount: Number(order.totalAmount),
        status: order.status as OrderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        eventTitle: order.event.title,
        eventDate: order.event.eventDate,
        eventVenue: order.event.venue,
        organizerName: order.event.organizer?.organizationName,
        userName: order.user?.name,
        userEmail: order.user?.email,
        items: order.items.map((i) => ({
          id: i.id,
          orderId: i.orderId,
          ticketTierId: i.ticketTierId,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          tierName: i.ticketTier.name,
        })),
        tickets: order.tickets.map((t) => ({
          id: t.id,
          orderId: t.orderId,
          ticketTierId: t.ticketTierId,
          ticketCode: t.ticketCode,
          status: t.status as any,
          issuedAt: t.issuedAt,
        })),
        transactions: order.transactions.map((tx) => ({
          id: tx.id,
          orderId: tx.orderId,
          transactionReference: tx.transactionReference,
          amount: Number(tx.amount),
          status: tx.status as PaymentStatus,
          gatewayResponse: tx.gatewayResponse,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
        })),
      }));
    }

    const list = Array.from(inMemoryDb.orders.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return list.map((order) => {
      const event = inMemoryDb.events.get(order.eventId);
      const user = inMemoryDb.users.get(order.userId);
      const org = event ? inMemoryDb.organizers.get(event.organizerId) : undefined;
      const items = Array.from(inMemoryDb.orderItems.values())
        .filter((i) => i.orderId === order.id)
        .map((i) => {
          const tier = inMemoryDb.ticketTiers.get(i.ticketTierId);
          return {
            ...i,
            tierName: tier?.name || 'Ticket',
          };
        });
      const tickets = Array.from(inMemoryDb.tickets.values()).filter((t) => t.orderId === order.id);
      const transactions = Array.from(inMemoryDb.paymentTransactions.values())
        .filter((tx) => tx.orderId === order.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        ...order,
        eventTitle: event?.title,
        eventDate: event?.eventDate,
        eventVenue: event?.venue,
        organizerName: org?.organizationName,
        userName: user?.name,
        userEmail: user?.email,
        items,
        tickets,
        transactions,
      };
    });
  },

  /**
   * ATOMIC ORDER CREATION FROM ACTIVE RESERVATION
   */
  async createOrderFromReservation(userId: string, reservationId: string): Promise<OrderWithDetails> {
    if (isDbConnected && pgPool) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');

        // Check for existing order for this reservation
        const existingOrder = await client.query('SELECT id FROM "Order" WHERE "reservationId" = $1', [reservationId]);
        if (existingOrder.rowCount > 0) {
          await client.query('ROLLBACK');
          const details = await orderRepository.findById(existingOrder.rows[0].id);
          if (details) return details;
          throw AppError.duplicateRequest('An order already exists for this reservation');
        }

        // Row lock reservation
        const resQuery = await client.query(
          'SELECT id, "userId", "eventId", status, "expiresAt" FROM "Reservation" WHERE id = $1 FOR UPDATE',
          [reservationId]
        );

        if (resQuery.rowCount === 0) {
          throw AppError.notFound('Reservation');
        }

        const res = resQuery.rows[0];
        if (res.userId !== userId) {
          throw AppError.forbidden('You can only checkout your own reservation');
        }
        if (res.status !== 'ACTIVE') {
          throw AppError.badRequest(`Reservation is ${res.status.toLowerCase()} and cannot be checked out`, 'RESERVATION_EXPIRED');
        }
        if (new Date(res.expiresAt) < new Date()) {
          throw AppError.reservationExpired('Reservation hold has expired. Please reserve tickets again.');
        }

        // Fetch reservation items
        const itemsQuery = await client.query(
          'SELECT ri.id, ri."ticketTierId", ri.quantity, ri."unitPrice", tt.name as "tierName" FROM "ReservationItem" ri JOIN "TicketTier" tt ON ri."ticketTierId" = tt.id WHERE ri."reservationId" = $1',
          [reservationId]
        );

        let subtotal = 0;
        for (const item of itemsQuery.rows) {
          subtotal += parseFloat(item.unitPrice) * parseInt(item.quantity, 10);
        }

        const orderId = uuidv4();
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

        await client.query(
          'INSERT INTO "Order" (id, "userId", "eventId", "reservationId", "orderNumber", subtotal, "totalAmount", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
          [orderId, userId, res.eventId, reservationId, orderNumber, subtotal, subtotal, 'PENDING']
        );

        for (const item of itemsQuery.rows) {
          await client.query(
            'INSERT INTO "OrderItem" (id, "orderId", "ticketTierId", quantity, "unitPrice") VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), orderId, item.ticketTierId, item.quantity, item.unitPrice]
          );
        }

        await client.query('COMMIT');

        const fullOrder = await orderRepository.findById(orderId);
        if (!fullOrder) throw AppError.internal('Failed to retrieve created order');
        return fullOrder;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory atomic fallback
    const releaseLock = await inMemoryDb.acquireLock(`reservation:${reservationId}`);
    try {
      const existing = await orderRepository.findByReservationId(reservationId);
      if (existing) {
        const details = await orderRepository.findById(existing.id);
        if (details) return details;
      }

      const res = inMemoryDb.reservations.get(reservationId);
      if (!res) throw AppError.notFound('Reservation');
      if (res.userId !== userId) {
        throw AppError.forbidden('You can only checkout your own reservation');
      }
      if (res.status !== 'ACTIVE') {
        throw AppError.badRequest(`Reservation is ${res.status.toLowerCase()} and cannot be checked out`, 'RESERVATION_EXPIRED');
      }
      if (res.expiresAt < new Date()) {
        throw AppError.reservationExpired('Reservation hold has expired. Please reserve tickets again.');
      }

      const items = Array.from(inMemoryDb.reservationItems.values()).filter(
        (i) => i.reservationId === reservationId
      );

      let subtotal = 0;
      for (const item of items) {
        subtotal += item.unitPrice * item.quantity;
      }

      const orderId = uuidv4();
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder: OrderEntity = {
        id: orderId,
        userId,
        eventId: res.eventId,
        reservationId,
        orderNumber,
        subtotal,
        totalAmount: subtotal,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryDb.orders.set(orderId, newOrder);

      for (const item of items) {
        const orderItemId = uuidv4();
        inMemoryDb.orderItems.set(orderItemId, {
          id: orderItemId,
          orderId,
          ticketTierId: item.ticketTierId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }

      const details = await orderRepository.findById(orderId);
      if (!details) throw AppError.internal('Failed to retrieve created order');
      return details;
    } finally {
      releaseLock();
    }
  },

  /**
   * ATOMIC ORDER AND INVENTORY FINALIZATION (UPON PAYMENT SUCCESS OR FAILURE)
   */
  async finalizeOrderTransaction(
    orderId: string,
    transactionId: string,
    outcome: 'SUCCESS' | 'FAILED',
    gatewayResponse?: any
  ): Promise<OrderWithDetails> {
    const responseStr = gatewayResponse ? JSON.stringify(gatewayResponse) : null;

    if (isDbConnected && pgPool) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');

        // Row lock order
        const orderQuery = await client.query('SELECT * FROM "Order" WHERE id = $1 FOR UPDATE', [orderId]);
        if (orderQuery.rowCount === 0) throw AppError.notFound('Order');
        const order = orderQuery.rows[0];

        // Row lock transaction
        await client.query('SELECT id FROM "PaymentTransaction" WHERE id = $1 FOR UPDATE', [transactionId]);

        // Row lock reservation
        await client.query('SELECT id FROM "Reservation" WHERE id = $1 FOR UPDATE', [order.reservationId]);

        if (outcome === 'SUCCESS') {
          // 1. Update Payment Transaction
          await client.query(
            'UPDATE "PaymentTransaction" SET status = $1, "gatewayResponse" = $2, "updatedAt" = NOW() WHERE id = $3',
            ['SUCCESS', responseStr, transactionId]
          );

          // 2. Update Order
          await client.query('UPDATE "Order" SET status = $1, "updatedAt" = NOW() WHERE id = $2', [
            'CONFIRMED',
            orderId,
          ]);

          // 3. Update Reservation to COMPLETED
          await client.query('UPDATE "Reservation" SET status = $1, "updatedAt" = NOW() WHERE id = $2', [
            'COMPLETED',
            order.reservationId,
          ]);

          // 4. Update Inventory: decrease reserved, increase sold
          const orderItems = await client.query('SELECT * FROM "OrderItem" WHERE "orderId" = $1', [orderId]);
          for (const item of orderItems.rows) {
            await client.query('SELECT id FROM "TicketTier" WHERE id = $1 FOR UPDATE', [item.ticketTierId]);
            await client.query(
              'UPDATE "TicketTier" SET "reservedQuantity" = GREATEST(0, "reservedQuantity" - $1), "soldQuantity" = "soldQuantity" + $1, "updatedAt" = NOW() WHERE id = $2',
              [item.quantity, item.ticketTierId]
            );

            // 5. Generate Individual Tickets with Unique Ticket Codes
            for (let i = 0; i < item.quantity; i++) {
              const ticketCode = `TCK-${order.eventId.slice(0, 4).toUpperCase()}-${uuidv4().slice(0, 8).toUpperCase()}`;
              await client.query(
                'INSERT INTO "Ticket" (id, "orderId", "ticketTierId", "ticketCode", status, "issuedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
                [uuidv4(), orderId, item.ticketTierId, ticketCode, 'ACTIVE']
              );
            }
          }
        } else {
          // Outcome: FAILED
          // 1. Update Payment Transaction
          await client.query(
            'UPDATE "PaymentTransaction" SET status = $1, "gatewayResponse" = $2, "updatedAt" = NOW() WHERE id = $3',
            ['FAILED', responseStr, transactionId]
          );

          // 2. Update Order
          await client.query('UPDATE "Order" SET status = $1, "updatedAt" = NOW() WHERE id = $2', [
            'FAILED',
            orderId,
          ]);

          // 3. Update Reservation to CANCELLED
          await client.query('UPDATE "Reservation" SET status = $1, "updatedAt" = NOW() WHERE id = $2', [
            'CANCELLED',
            order.reservationId,
          ]);

          // 4. Release Inventory: restore available, decrease reserved
          const orderItems = await client.query('SELECT * FROM "OrderItem" WHERE "orderId" = $1', [orderId]);
          for (const item of orderItems.rows) {
            await client.query('SELECT id FROM "TicketTier" WHERE id = $1 FOR UPDATE', [item.ticketTierId]);
            await client.query(
              'UPDATE "TicketTier" SET "availableQuantity" = "availableQuantity" + $1, "reservedQuantity" = GREATEST(0, "reservedQuantity" - $1), "updatedAt" = NOW() WHERE id = $2',
              [item.quantity, item.ticketTierId]
            );
          }
        }

        await client.query('COMMIT');

        const updatedOrder = await orderRepository.findById(orderId);
        if (!updatedOrder) throw AppError.internal('Failed to retrieve finalized order');
        return updatedOrder;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory atomic fallback
    const releaseOrderLock = await inMemoryDb.acquireLock(`order:${orderId}`);
    try {
      const order = inMemoryDb.orders.get(orderId);
      if (!order) throw AppError.notFound('Order');

      const tx = inMemoryDb.paymentTransactions.get(transactionId);
      const res = inMemoryDb.reservations.get(order.reservationId);

      const items = Array.from(inMemoryDb.orderItems.values()).filter((i) => i.orderId === orderId);

      if (outcome === 'SUCCESS') {
        if (tx) {
          tx.status = 'SUCCESS';
          tx.gatewayResponse = responseStr;
          tx.updatedAt = new Date();
        }
        order.status = 'CONFIRMED';
        order.updatedAt = new Date();

        if (res) {
          res.status = 'COMPLETED';
          res.updatedAt = new Date();
        }

        for (const item of items) {
          const tier = inMemoryDb.ticketTiers.get(item.ticketTierId);
          if (tier) {
            tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
            tier.soldQuantity += item.quantity;
            tier.updatedAt = new Date();
          }

          // Generate tickets
          for (let i = 0; i < item.quantity; i++) {
            const ticketId = uuidv4();
            const ticketCode = `TCK-${order.eventId.slice(0, 4).toUpperCase()}-${uuidv4().slice(0, 8).toUpperCase()}`;
            inMemoryDb.tickets.set(ticketId, {
              id: ticketId,
              orderId,
              ticketTierId: item.ticketTierId,
              ticketCode,
              status: 'ACTIVE',
              issuedAt: new Date(),
            });
          }
        }
      } else {
        if (tx) {
          tx.status = 'FAILED';
          tx.gatewayResponse = responseStr;
          tx.updatedAt = new Date();
        }
        order.status = 'FAILED';
        order.updatedAt = new Date();

        if (res) {
          res.status = 'CANCELLED';
          res.updatedAt = new Date();
        }

        for (const item of items) {
          const tier = inMemoryDb.ticketTiers.get(item.ticketTierId);
          if (tier) {
            tier.availableQuantity += item.quantity;
            tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
            tier.updatedAt = new Date();
          }
        }
      }

      const updated = await orderRepository.findById(orderId);
      if (!updated) throw AppError.internal('Failed to retrieve finalized order');
      return updated;
    } finally {
      releaseOrderLock();
    }
  },
};
