import { prisma, isDbConnected } from '../config/database';
import { inMemoryDb, EventEntity, TicketTierEntity } from './dbStore';
import { v4 as uuidv4 } from 'uuid';
import { EventStatus } from '../types';

export interface EventWithTiers extends EventEntity {
  organizerName?: string;
  ticketTiers: TicketTierEntity[];
  minPrice?: number;
  totalAvailable?: number;
}

export const eventRepository = {
  async findById(id: string): Promise<EventWithTiers | null> {
    if (isDbConnected) {
      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          ticketTiers: { orderBy: { price: 'asc' } },
          organizer: true,
        },
      });
      if (!event) return null;
      return {
        id: event.id,
        organizerId: event.organizerId,
        title: event.title,
        description: event.description,
        venue: event.venue,
        location: event.location,
        category: event.category,
        eventDate: event.eventDate,
        salesStartDate: event.salesStartDate,
        salesCutoffDate: event.salesCutoffDate,
        status: event.status as EventStatus,
        imageUrl: event.imageUrl,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        organizerName: event.organizer?.organizationName,
        ticketTiers: event.ticketTiers.map((t) => ({
          id: t.id,
          eventId: t.eventId,
          name: t.name,
          description: t.description,
          price: Number(t.price),
          totalQuantity: t.totalQuantity,
          availableQuantity: t.availableQuantity,
          reservedQuantity: t.reservedQuantity,
          soldQuantity: t.soldQuantity,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      };
    }

    const event = inMemoryDb.events.get(id);
    if (!event) return null;

    const org = inMemoryDb.organizers.get(event.organizerId);
    const tiers = Array.from(inMemoryDb.ticketTiers.values())
      .filter((t) => t.eventId === id)
      .sort((a, b) => a.price - b.price);

    return {
      ...event,
      organizerName: org?.organizationName,
      ticketTiers: tiers,
    };
  },

  async findByOrganizerId(organizerId: string): Promise<EventWithTiers[]> {
    if (isDbConnected) {
      const list = await prisma.event.findMany({
        where: { organizerId },
        include: {
          ticketTiers: { orderBy: { price: 'asc' } },
          organizer: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return list.map((event) => ({
        id: event.id,
        organizerId: event.organizerId,
        title: event.title,
        description: event.description,
        venue: event.venue,
        location: event.location,
        category: event.category,
        eventDate: event.eventDate,
        salesStartDate: event.salesStartDate,
        salesCutoffDate: event.salesCutoffDate,
        status: event.status as EventStatus,
        imageUrl: event.imageUrl,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        organizerName: event.organizer?.organizationName,
        ticketTiers: event.ticketTiers.map((t) => ({
          id: t.id,
          eventId: t.eventId,
          name: t.name,
          description: t.description,
          price: Number(t.price),
          totalQuantity: t.totalQuantity,
          availableQuantity: t.availableQuantity,
          reservedQuantity: t.reservedQuantity,
          soldQuantity: t.soldQuantity,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      }));
    }

    const list = Array.from(inMemoryDb.events.values()).filter((e) => e.organizerId === organizerId);
    return list.map((event) => {
      const org = inMemoryDb.organizers.get(event.organizerId);
      const tiers = Array.from(inMemoryDb.ticketTiers.values())
        .filter((t) => t.eventId === event.id)
        .sort((a, b) => a.price - b.price);
      return {
        ...event,
        organizerName: org?.organizationName,
        ticketTiers: tiers,
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findAllPublic(filters: {
    search?: string;
    location?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<EventWithTiers[]> {
    let all: EventWithTiers[] = [];

    if (isDbConnected) {
      const list = await prisma.event.findMany({
        where: { status: 'PUBLISHED' },
        include: {
          ticketTiers: { orderBy: { price: 'asc' } },
          organizer: true,
        },
        orderBy: { eventDate: 'asc' },
      });
      all = list.map((event) => ({
        id: event.id,
        organizerId: event.organizerId,
        title: event.title,
        description: event.description,
        venue: event.venue,
        location: event.location,
        category: event.category,
        eventDate: event.eventDate,
        salesStartDate: event.salesStartDate,
        salesCutoffDate: event.salesCutoffDate,
        status: event.status as EventStatus,
        imageUrl: event.imageUrl,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        organizerName: event.organizer?.organizationName,
        ticketTiers: event.ticketTiers.map((t) => ({
          id: t.id,
          eventId: t.eventId,
          name: t.name,
          description: t.description,
          price: Number(t.price),
          totalQuantity: t.totalQuantity,
          availableQuantity: t.availableQuantity,
          reservedQuantity: t.reservedQuantity,
          soldQuantity: t.soldQuantity,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      }));
    } else {
      all = Array.from(inMemoryDb.events.values())
        .filter((e) => e.status === 'PUBLISHED')
        .map((event) => {
          const org = inMemoryDb.organizers.get(event.organizerId);
          const tiers = Array.from(inMemoryDb.ticketTiers.values())
            .filter((t) => t.eventId === event.id)
            .sort((a, b) => a.price - b.price);
          return {
            ...event,
            organizerName: org?.organizationName,
            ticketTiers: tiers,
          };
        })
        .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
    }

    return all.filter((ev) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(s);
        const matchesDesc = ev.description.toLowerCase().includes(s);
        const matchesVenue = ev.venue.toLowerCase().includes(s);
        const matchesOrg = ev.organizerName?.toLowerCase().includes(s);
        if (!matchesTitle && !matchesDesc && !matchesVenue && !matchesOrg) return false;
      }

      if (filters.location && !ev.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      if (filters.category && filters.category !== 'All' && ev.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }

      if (filters.startDate) {
        const start = new Date(filters.startDate);
        if (ev.eventDate < start) return false;
      }

      if (filters.endDate) {
        const end = new Date(filters.endDate);
        if (ev.eventDate > end) return false;
      }

      const minTierPrice = ev.ticketTiers.length > 0 ? Math.min(...ev.ticketTiers.map((t) => t.price)) : 0;
      if (filters.minPrice !== undefined && minTierPrice < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && minTierPrice > filters.maxPrice) return false;

      return true;
    });
  },

  async findAllAdmin(): Promise<EventWithTiers[]> {
    if (isDbConnected) {
      const list = await prisma.event.findMany({
        include: {
          ticketTiers: { orderBy: { price: 'asc' } },
          organizer: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return list.map((event) => ({
        id: event.id,
        organizerId: event.organizerId,
        title: event.title,
        description: event.description,
        venue: event.venue,
        location: event.location,
        category: event.category,
        eventDate: event.eventDate,
        salesStartDate: event.salesStartDate,
        salesCutoffDate: event.salesCutoffDate,
        status: event.status as EventStatus,
        imageUrl: event.imageUrl,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        organizerName: event.organizer?.organizationName,
        ticketTiers: event.ticketTiers.map((t) => ({
          id: t.id,
          eventId: t.eventId,
          name: t.name,
          description: t.description,
          price: Number(t.price),
          totalQuantity: t.totalQuantity,
          availableQuantity: t.availableQuantity,
          reservedQuantity: t.reservedQuantity,
          soldQuantity: t.soldQuantity,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      }));
    }

    return Array.from(inMemoryDb.events.values()).map((event) => {
      const org = inMemoryDb.organizers.get(event.organizerId);
      const tiers = Array.from(inMemoryDb.ticketTiers.values())
        .filter((t) => t.eventId === event.id)
        .sort((a, b) => a.price - b.price);
      return {
        ...event,
        organizerName: org?.organizationName,
        ticketTiers: tiers,
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async create(data: {
    organizerId: string;
    title: string;
    description: string;
    venue: string;
    location: string;
    category?: string;
    eventDate: Date;
    salesStartDate: Date;
    salesCutoffDate: Date;
    imageUrl?: string | null;
  }): Promise<EventEntity> {
    if (isDbConnected) {
      const ev = await prisma.event.create({
        data: {
          organizerId: data.organizerId,
          title: data.title,
          description: data.description,
          venue: data.venue,
          location: data.location,
          category: data.category || 'General',
          eventDate: data.eventDate,
          salesStartDate: data.salesStartDate,
          salesCutoffDate: data.salesCutoffDate,
          status: 'PUBLISHED',
          imageUrl: data.imageUrl || null,
        },
      });
      return ev as EventEntity;
    }

    const ev: EventEntity = {
      id: uuidv4(),
      organizerId: data.organizerId,
      title: data.title,
      description: data.description,
      venue: data.venue,
      location: data.location,
      category: data.category || 'General',
      eventDate: data.eventDate,
      salesStartDate: data.salesStartDate,
      salesCutoffDate: data.salesCutoffDate,
      status: 'PUBLISHED',
      imageUrl: data.imageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryDb.events.set(ev.id, ev);
    return ev;
  },

  async update(id: string, data: Partial<Omit<EventEntity, 'id' | 'createdAt'>>): Promise<EventEntity | null> {
    if (isDbConnected) {
      const ev = await prisma.event.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
      });
      return ev as EventEntity;
    }

    const ev = inMemoryDb.events.get(id);
    if (!ev) return null;
    const updated = { ...ev, ...data, updatedAt: new Date() };
    inMemoryDb.events.set(id, updated);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    if (isDbConnected) {
      await prisma.event.delete({ where: { id } });
      return true;
    }
    return inMemoryDb.events.delete(id);
  },
};
