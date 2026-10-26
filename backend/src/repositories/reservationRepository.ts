import { prisma, pgPool, isDbConnected } from '../config/database';
import { inMemoryDb, ReservationEntity, ReservationItemEntity } from './dbStore';
import { v4 as uuidv4 } from 'uuid';
import { ReservationStatus } from '../types';
import { AppError } from '../utils/errors';

export interface ReservationWithDetails extends ReservationEntity {
  eventTitle?: string;
  eventDate?: Date;
  eventVenue?: string;
  items: Array<ReservationItemEntity & { tierName?: string }>;
  totalAmount: number;
}

export const reservationRepository = {
  async findById(id: string): Promise<ReservationWithDetails | null> {
    if (isDbConnected) {
      const res = await prisma.reservation.findUnique({
        where: { id },
        include: {
          event: true,
          items: {
            include: { ticketTier: true },
          },
        },
      });
      if (!res) return null;

      let total = 0;
      const items = res.items.map((i) => {
        const itemTotal = Number(i.unitPrice) * i.quantity;
        total += itemTotal;
        return {
          id: i.id,
          reservationId: i.reservationId,
          ticketTierId: i.ticketTierId,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          tierName: i.ticketTier.name,
        };
      });

      return {
        id: res.id,
        userId: res.userId,
        eventId: res.eventId,
        status: res.status as ReservationStatus,
        expiresAt: res.expiresAt,
        createdAt: res.createdAt,
        updatedAt: res.updatedAt,
        eventTitle: res.event.title,
        eventDate: res.event.eventDate,
        eventVenue: res.event.venue,
        items,
        totalAmount: total,
      };
    }

    const res = inMemoryDb.reservations.get(id);
    if (!res) return null;

    const event = inMemoryDb.events.get(res.eventId);
    const items = Array.from(inMemoryDb.reservationItems.values())
      .filter((i) => i.reservationId === id)
      .map((i) => {
        const tier = inMemoryDb.ticketTiers.get(i.ticketTierId);
        return {
          ...i,
          tierName: tier?.name || 'Standard',
        };
      });

    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
      ...res,
      eventTitle: event?.title,
      eventDate: event?.eventDate,
      eventVenue: event?.venue,
      items,
      totalAmount: total,
    };
  },

  async findByUserId(userId: string): Promise<ReservationWithDetails[]> {
    if (isDbConnected) {
      const list = await prisma.reservation.findMany({
        where: { userId },
        include: {
          event: true,
          items: { include: { ticketTier: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return list.map((res) => {
        let total = 0;
        const items = res.items.map((i) => {
          total += Number(i.unitPrice) * i.quantity;
          return {
            id: i.id,
            reservationId: i.reservationId,
            ticketTierId: i.ticketTierId,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            tierName: i.ticketTier.name,
          };
        });
        return {
          id: res.id,
          userId: res.userId,
          eventId: res.eventId,
          status: res.status as ReservationStatus,
          expiresAt: res.expiresAt,
          createdAt: res.createdAt,
          updatedAt: res.updatedAt,
          eventTitle: res.event.title,
          eventDate: res.event.eventDate,
          eventVenue: res.event.venue,
          items,
          totalAmount: total,
        };
      });
    }

    const list = Array.from(inMemoryDb.reservations.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return list.map((res) => {
      const event = inMemoryDb.events.get(res.eventId);
      const items = Array.from(inMemoryDb.reservationItems.values())
        .filter((i) => i.reservationId === res.id)
        .map((i) => {
          const tier = inMemoryDb.ticketTiers.get(i.ticketTierId);
          return {
            ...i,
            tierName: tier?.name || 'Standard',
          };
        });
      const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      return {
        ...res,
        eventTitle: event?.title,
        eventDate: event?.eventDate,
        eventVenue: event?.venue,
        items,
        totalAmount: total,
      };
    });
  },

  async findByEventId(eventId: string): Promise<ReservationWithDetails[]> {
    if (isDbConnected) {
      const list = await prisma.reservation.findMany({
        where: { eventId },
        include: {
          event: true,
          items: { include: { ticketTier: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return list.map((res) => {
        let total = 0;
        const items = res.items.map((i) => {
          total += Number(i.unitPrice) * i.quantity;
          return {
            id: i.id,
            reservationId: i.reservationId,
            ticketTierId: i.ticketTierId,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            tierName: i.ticketTier.name,
          };
        });
        return {
          id: res.id,
          userId: res.userId,
          eventId: res.eventId,
          status: res.status as ReservationStatus,
          expiresAt: res.expiresAt,
          createdAt: res.createdAt,
          updatedAt: res.updatedAt,
          eventTitle: res.event.title,
          eventDate: res.event.eventDate,
          eventVenue: res.event.venue,
          items,
          totalAmount: total,
        };
      });
    }

    const list = Array.from(inMemoryDb.reservations.values())
      .filter((r) => r.eventId === eventId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return list.map((res) => {
      const event = inMemoryDb.events.get(res.eventId);
      const items = Array.from(inMemoryDb.reservationItems.values())
        .filter((i) => i.reservationId === res.id)
        .map((i) => {
          const tier = inMemoryDb.ticketTiers.get(i.ticketTierId);
          return {
            ...i,
            tierName: tier?.name || 'Standard',
          };
        });
      const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      return {
        ...res,
        eventTitle: event?.title,
        eventDate: event?.eventDate,
        eventVenue: event?.venue,
        items,
        totalAmount: total,
      };
    });
  },

  /**
   * ATOMIC CONCURRENT RESERVATION WITH ROW-LEVEL LOCKING
   */
  async createHoldWithLocking(
    userId: string,
    eventId: string,
    items: Array<{ ticketTierId: string; quantity: number }>,
    holdMinutes: number = 10
  ): Promise<ReservationWithDetails> {
    if (items.length === 0) {
      throw AppError.badRequest('At least one ticket tier must be selected');
    }

    // Sort requested tiers by ID to ensure deadlock-free lock acquisition order
    const sortedItems = [...items].sort((a, b) => a.ticketTierId.localeCompare(b.ticketTierId));
    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

    // --- CASE 1: REAL POSTGRESQL POOL WITH ROW LOCKING ---
    if (isDbConnected && pgPool) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');

        // Check active event exists
        const eventRes = await client.query('SELECT id, status, "salesCutoffDate" FROM "Event" WHERE id = $1', [eventId]);
        if (eventRes.rowCount === 0) {
          throw AppError.notFound('Event');
        }
        const event = eventRes.rows[0];
        if (event.status !== 'PUBLISHED') {
          throw AppError.badRequest('Event is not currently open for reservations', 'EVENT_SALES_CLOSED');
        }
        if (new Date(event.salesCutoffDate) < new Date()) {
          throw AppError.badRequest('Ticket sales have ended for this event', 'EVENT_SALES_CLOSED');
        }

        const tierDetails: Array<{ id: string; name: string; price: number; quantity: number }> = [];

        // Lock each ticket tier with SELECT ... FOR UPDATE
        for (const item of sortedItems) {
          const tierRes = await client.query(
            'SELECT id, name, price, "totalQuantity", "availableQuantity", "reservedQuantity" FROM "TicketTier" WHERE id = $1 AND "eventId" = $2 FOR UPDATE',
            [item.ticketTierId, eventId]
          );

          if (tierRes.rowCount === 0) {
            throw AppError.notFound(`Ticket Tier (${item.ticketTierId})`);
          }

          const tier = tierRes.rows[0];
          const available = parseInt(tier.availableQuantity, 10);
          if (available < item.quantity) {
            throw AppError.insufficientTickets(
              `Not enough tickets available for ${tier.name}. Requested ${item.quantity}, but only ${available} remaining.`
            );
          }

          // Atomically update inventory
          await client.query(
            'UPDATE "TicketTier" SET "availableQuantity" = "availableQuantity" - $1, "reservedQuantity" = "reservedQuantity" + $1, "updatedAt" = NOW() WHERE id = $2',
            [item.quantity, item.ticketTierId]
          );

          tierDetails.push({
            id: tier.id,
            name: tier.name,
            price: parseFloat(tier.price),
            quantity: item.quantity,
          });
        }

        // Create reservation
        const reservationId = uuidv4();
        await client.query(
          'INSERT INTO "Reservation" (id, "userId", "eventId", status, "expiresAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
          [reservationId, userId, eventId, 'ACTIVE', expiresAt]
        );

        // Create reservation items
        const resItems: ReservationItemEntity[] = [];
        let total = 0;
        for (const tier of tierDetails) {
          const itemId = uuidv4();
          await client.query(
            'INSERT INTO "ReservationItem" (id, "reservationId", "ticketTierId", quantity, "unitPrice") VALUES ($1, $2, $3, $4, $5)',
            [itemId, reservationId, tier.id, tier.quantity, tier.price]
          );
          resItems.push({
            id: itemId,
            reservationId,
            ticketTierId: tier.id,
            quantity: tier.quantity,
            unitPrice: tier.price,
          });
          total += tier.price * tier.quantity;
        }

        await client.query('COMMIT');

        return {
          id: reservationId,
          userId,
          eventId,
          status: 'ACTIVE',
          expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: resItems.map((ri) => ({
            ...ri,
            tierName: tierDetails.find((t) => t.id === ri.ticketTierId)?.name,
          })),
          totalAmount: total,
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // --- CASE 2: IN-MEMORY ATOMIC ROW-LOCKING ENGINE ---
    const releaseFns: Array<() => void> = [];

    try {
      // Acquire locks sequentially in sorted ID order
      for (const item of sortedItems) {
        const release = await inMemoryDb.acquireLock(`ticket_tier:${item.ticketTierId}`);
        releaseFns.push(release);
      }

      // Check event
      const event = inMemoryDb.events.get(eventId);
      if (!event) throw AppError.notFound('Event');
      if (event.status !== 'PUBLISHED') {
        throw AppError.badRequest('Event is not currently open for reservations', 'EVENT_SALES_CLOSED');
      }
      if (event.salesCutoffDate < new Date()) {
        throw AppError.badRequest('Ticket sales have ended for this event', 'EVENT_SALES_CLOSED');
      }

      const verifiedTiers: Array<{ tier: any; quantity: number }> = [];

      for (const item of sortedItems) {
        const tier = inMemoryDb.ticketTiers.get(item.ticketTierId);
        if (!tier || tier.eventId !== eventId) {
          throw AppError.notFound(`Ticket Tier (${item.ticketTierId})`);
        }

        if (tier.availableQuantity < item.quantity) {
          throw AppError.insufficientTickets(
            `Not enough tickets available for ${tier.name}. Requested ${item.quantity}, but only ${tier.availableQuantity} remaining.`
          );
        }

        verifiedTiers.push({ tier, quantity: item.quantity });
      }

      // Apply inventory mutations
      for (const { tier, quantity } of verifiedTiers) {
        tier.availableQuantity -= quantity;
        tier.reservedQuantity += quantity;
        tier.updatedAt = new Date();
      }

      // Create reservation
      const reservationId = uuidv4();
      const newReservation: ReservationEntity = {
        id: reservationId,
        userId,
        eventId,
        status: 'ACTIVE',
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryDb.reservations.set(reservationId, newReservation);

      // Create reservation items
      const createdItems: ReservationItemEntity[] = [];
      let total = 0;
      for (const { tier, quantity } of verifiedTiers) {
        const itemId = uuidv4();
        const resItem: ReservationItemEntity = {
          id: itemId,
          reservationId,
          ticketTierId: tier.id,
          quantity,
          unitPrice: tier.price,
        };
        inMemoryDb.reservationItems.set(itemId, resItem);
        createdItems.push(resItem);
        total += tier.price * quantity;
      }

      return {
        ...newReservation,
        items: createdItems.map((i) => ({
          ...i,
          tierName: verifiedTiers.find((t) => t.tier.id === i.ticketTierId)?.tier.name,
        })),
        totalAmount: total,
      };
    } finally {
      // Release all acquired row locks in reverse order
      for (const release of releaseFns.reverse()) {
        release();
      }
    }
  },

  /**
   * ATOMIC IDEMPOTENT EXPIRY RELEASE OF RESERVATION INVENTORY
   */
  async releaseExpiredReservation(reservationId: string): Promise<boolean> {
    if (isDbConnected && pgPool) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');

        // Row-lock reservation
        const resResult = await client.query(
          'SELECT id, status, "expiresAt" FROM "Reservation" WHERE id = $1 FOR UPDATE',
          [reservationId]
        );

        if (resResult.rowCount === 0) {
          await client.query('ROLLBACK');
          return false;
        }

        const reservation = resResult.rows[0];

        // Must still be ACTIVE and expired (or cancelled) to release
        if (reservation.status !== 'ACTIVE') {
          // Already completed, expired, or cancelled -> idempotent exit
          await client.query('COMMIT');
          return false;
        }

        // Fetch reservation items
        const itemsResult = await client.query(
          'SELECT "ticketTierId", quantity FROM "ReservationItem" WHERE "reservationId" = $1',
          [reservationId]
        );

        // Sort by ticketTierId to lock in deterministic order
        const sortedItems = itemsResult.rows.sort((a, b) => a.ticketTierId.localeCompare(b.ticketTierId));

        for (const item of sortedItems) {
          // Row lock the ticket tier
          await client.query(
            'SELECT id FROM "TicketTier" WHERE id = $1 FOR UPDATE',
            [item.ticketTierId]
          );

          // Restore inventory
          await client.query(
            'UPDATE "TicketTier" SET "availableQuantity" = "availableQuantity" + $1, "reservedQuantity" = GREATEST(0, "reservedQuantity" - $1), "updatedAt" = NOW() WHERE id = $2',
            [item.quantity, item.ticketTierId]
          );
        }

        // Mark reservation EXPIRED
        await client.query(
          'UPDATE "Reservation" SET status = $1, "updatedAt" = NOW() WHERE id = $2',
          ['EXPIRED', reservationId]
        );

        await client.query('COMMIT');
        return true;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory fallback with mutex locking
    const releaseReservationLock = await inMemoryDb.acquireLock(`reservation:${reservationId}`);
    try {
      const reservation = inMemoryDb.reservations.get(reservationId);
      if (!reservation || reservation.status !== 'ACTIVE') {
        return false;
      }

      const items = Array.from(inMemoryDb.reservationItems.values()).filter(
        (i) => i.reservationId === reservationId
      );

      for (const item of items) {
        const releaseTierLock = await inMemoryDb.acquireLock(`ticket_tier:${item.ticketTierId}`);
        try {
          const tier = inMemoryDb.ticketTiers.get(item.ticketTierId);
          if (tier) {
            tier.availableQuantity += item.quantity;
            tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
            tier.updatedAt = new Date();
          }
        } finally {
          releaseTierLock();
        }
      }

      reservation.status = 'EXPIRED';
      reservation.updatedAt = new Date();
      return true;
    } finally {
      releaseReservationLock();
    }
  },

  async cancelReservation(reservationId: string, userId: string): Promise<boolean> {
    if (isDbConnected && pgPool) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const resResult = await client.query(
          'SELECT id, "userId", status FROM "Reservation" WHERE id = $1 FOR UPDATE',
          [reservationId]
        );
        if (resResult.rowCount === 0) {
          throw AppError.notFound('Reservation');
        }
        const reservation = resResult.rows[0];
        if (reservation.userId !== userId) {
          throw AppError.forbidden('You can only cancel your own reservation');
        }
        if (reservation.status !== 'ACTIVE') {
          throw AppError.badRequest(`Cannot cancel reservation with status ${reservation.status}`);
        }

        const itemsResult = await client.query(
          'SELECT "ticketTierId", quantity FROM "ReservationItem" WHERE "reservationId" = $1',
          [reservationId]
        );

        for (const item of itemsResult.rows) {
          await client.query(
            'UPDATE "TicketTier" SET "availableQuantity" = "availableQuantity" + $1, "reservedQuantity" = GREATEST(0, "reservedQuantity" - $1), "updatedAt" = NOW() WHERE id = $2',
            [item.quantity, item.ticketTierId]
          );
        }

        await client.query('UPDATE "Reservation" SET status = $1, "updatedAt" = NOW() WHERE id = $2', [
          'CANCELLED',
          reservationId,
        ]);

        await client.query('COMMIT');
        return true;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const releaseLock = await inMemoryDb.acquireLock(`reservation:${reservationId}`);
    try {
      const reservation = inMemoryDb.reservations.get(reservationId);
      if (!reservation) throw AppError.notFound('Reservation');
      if (reservation.userId !== userId) {
        throw AppError.forbidden('You can only cancel your own reservation');
      }
      if (reservation.status !== 'ACTIVE') {
        throw AppError.badRequest(`Cannot cancel reservation with status ${reservation.status}`);
      }

      const items = Array.from(inMemoryDb.reservationItems.values()).filter(
        (i) => i.reservationId === reservationId
      );

      for (const item of items) {
        const tier = inMemoryDb.ticketTiers.get(item.ticketTierId);
        if (tier) {
          tier.availableQuantity += item.quantity;
          tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
          tier.updatedAt = new Date();
        }
      }

      reservation.status = 'CANCELLED';
      reservation.updatedAt = new Date();
      return true;
    } finally {
      releaseLock();
    }
  },
};
