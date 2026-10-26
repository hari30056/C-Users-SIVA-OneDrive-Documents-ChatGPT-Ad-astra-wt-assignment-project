import { prisma, isDbConnected } from '../config/database';
import { inMemoryDb, TicketEntity } from './dbStore';
import { TicketStatus } from '../types';

export interface TicketWithDetails extends TicketEntity {
  tierName?: string;
  eventTitle?: string;
  eventDate?: Date;
  eventVenue?: string;
  eventLocation?: string;
  orderNumber?: string;
}

export const ticketRepository = {
  async findById(id: string): Promise<TicketWithDetails | null> {
    if (isDbConnected) {
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          ticketTier: true,
          order: { include: { event: true } },
        },
      });
      if (!ticket) return null;
      return {
        id: ticket.id,
        orderId: ticket.orderId,
        ticketTierId: ticket.ticketTierId,
        ticketCode: ticket.ticketCode,
        status: ticket.status as TicketStatus,
        issuedAt: ticket.issuedAt,
        tierName: ticket.ticketTier.name,
        eventTitle: ticket.order.event.title,
        eventDate: ticket.order.event.eventDate,
        eventVenue: ticket.order.event.venue,
        eventLocation: ticket.order.event.location,
        orderNumber: ticket.order.orderNumber,
      };
    }

    const ticket = inMemoryDb.tickets.get(id);
    if (!ticket) return null;
    const tier = inMemoryDb.ticketTiers.get(ticket.ticketTierId);
    const order = inMemoryDb.orders.get(ticket.orderId);
    const event = order ? inMemoryDb.events.get(order.eventId) : undefined;

    return {
      ...ticket,
      tierName: tier?.name,
      eventTitle: event?.title,
      eventDate: event?.eventDate,
      eventVenue: event?.venue,
      eventLocation: event?.location,
      orderNumber: order?.orderNumber,
    };
  },

  async findByUserId(userId: string): Promise<TicketWithDetails[]> {
    if (isDbConnected) {
      const list = await prisma.ticket.findMany({
        where: { order: { userId } },
        include: {
          ticketTier: true,
          order: { include: { event: true } },
        },
        orderBy: { issuedAt: 'desc' },
      });
      return list.map((ticket) => ({
        id: ticket.id,
        orderId: ticket.orderId,
        ticketTierId: ticket.ticketTierId,
        ticketCode: ticket.ticketCode,
        status: ticket.status as TicketStatus,
        issuedAt: ticket.issuedAt,
        tierName: ticket.ticketTier.name,
        eventTitle: ticket.order.event.title,
        eventDate: ticket.order.event.eventDate,
        eventVenue: ticket.order.event.venue,
        eventLocation: ticket.order.event.location,
        orderNumber: ticket.order.orderNumber,
      }));
    }

    const userOrders = new Set(
      Array.from(inMemoryDb.orders.values())
        .filter((o) => o.userId === userId)
        .map((o) => o.id)
    );

    const list = Array.from(inMemoryDb.tickets.values())
      .filter((t) => userOrders.has(t.orderId))
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());

    return list.map((ticket) => {
      const tier = inMemoryDb.ticketTiers.get(ticket.ticketTierId);
      const order = inMemoryDb.orders.get(ticket.orderId);
      const event = order ? inMemoryDb.events.get(order.eventId) : undefined;
      return {
        ...ticket,
        tierName: tier?.name,
        eventTitle: event?.title,
        eventDate: event?.eventDate,
        eventVenue: event?.venue,
        eventLocation: event?.location,
        orderNumber: order?.orderNumber,
      };
    });
  },

  async findByOrderId(orderId: string): Promise<TicketWithDetails[]> {
    if (isDbConnected) {
      const list = await prisma.ticket.findMany({
        where: { orderId },
        include: {
          ticketTier: true,
          order: { include: { event: true } },
        },
      });
      return list.map((ticket) => ({
        id: ticket.id,
        orderId: ticket.orderId,
        ticketTierId: ticket.ticketTierId,
        ticketCode: ticket.ticketCode,
        status: ticket.status as TicketStatus,
        issuedAt: ticket.issuedAt,
        tierName: ticket.ticketTier.name,
        eventTitle: ticket.order.event.title,
        eventDate: ticket.order.event.eventDate,
        eventVenue: ticket.order.event.venue,
        eventLocation: ticket.order.event.location,
        orderNumber: ticket.order.orderNumber,
      }));
    }

    const list = Array.from(inMemoryDb.tickets.values()).filter((t) => t.orderId === orderId);
    return list.map((ticket) => {
      const tier = inMemoryDb.ticketTiers.get(ticket.ticketTierId);
      const order = inMemoryDb.orders.get(ticket.orderId);
      const event = order ? inMemoryDb.events.get(order.eventId) : undefined;
      return {
        ...ticket,
        tierName: tier?.name,
        eventTitle: event?.title,
        eventDate: event?.eventDate,
        eventVenue: event?.venue,
        eventLocation: event?.location,
        orderNumber: order?.orderNumber,
      };
    });
  },

  async updateStatus(id: string, status: TicketStatus): Promise<TicketWithDetails | null> {
    if (isDbConnected) {
      await prisma.ticket.update({
        where: { id },
        data: { status },
      });
      return ticketRepository.findById(id);
    }

    const ticket = inMemoryDb.tickets.get(id);
    if (!ticket) return null;
    ticket.status = status;
    return ticketRepository.findById(id);
  },
};
