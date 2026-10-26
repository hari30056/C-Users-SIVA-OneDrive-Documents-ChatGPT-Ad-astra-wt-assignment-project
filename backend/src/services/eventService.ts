import { eventRepository, EventWithTiers } from '../repositories/eventRepository';
import { ticketTierRepository } from '../repositories/ticketTierRepository';
import { cacheService } from '../config/redis';
import { AppError } from '../utils/errors';
import { AuthUser, EventEntity } from '../types';

export const eventService = {
  async getPublicEvents(filters: {
    search?: string;
    location?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<EventWithTiers[]> {
    const cacheKey = `public:events:${JSON.stringify(filters)}`;
    const cached = await cacheService.get<EventWithTiers[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const events = await eventRepository.findAllPublic(filters);
    // Cache for 60 seconds
    await cacheService.set(cacheKey, events, 60);
    return events;
  },

  async getEventById(eventId: string): Promise<EventWithTiers> {
    const cacheKey = `event:${eventId}`;
    const cached = await cacheService.get<EventWithTiers>(cacheKey);
    if (cached) {
      return cached;
    }

    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw AppError.notFound('Event');
    }

    // Cache for 30 seconds
    await cacheService.set(cacheKey, event, 30);
    return event;
  },

  async getEventAvailability(eventId: string): Promise<{ eventId: string; tiers: Array<{ id: string; name: string; availableQuantity: number; price: number }> }> {
    const cacheKey = `event:${eventId}:availability`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const event = await eventRepository.findById(eventId);
    if (!event) throw AppError.notFound('Event');

    const result = {
      eventId,
      tiers: event.ticketTiers.map((t) => ({
        id: t.id,
        name: t.name,
        availableQuantity: t.availableQuantity,
        price: t.price,
      })),
    };

    await cacheService.set(cacheKey, result, 10);
    return result;
  },

  async getOrganizerEvents(user: AuthUser): Promise<EventWithTiers[]> {
    if (!user.organizerId) {
      throw AppError.forbidden('User does not have an active organizer profile');
    }
    return eventRepository.findByOrganizerId(user.organizerId);
  },

  async createEvent(
    user: AuthUser,
    data: {
      title: string;
      description: string;
      venue: string;
      location: string;
      category?: string;
      eventDate: string | Date;
      salesStartDate: string | Date;
      salesCutoffDate: string | Date;
      imageUrl?: string;
      ticketTiers: Array<{
        name: string;
        description?: string;
        price: number;
        quantity: number;
      }>;
    }
  ): Promise<EventWithTiers> {
    if (!user.organizerId) {
      throw AppError.forbidden('Must be an organizer to create events');
    }

    const eventDate = new Date(data.eventDate);
    const salesStartDate = new Date(data.salesStartDate);
    const salesCutoffDate = new Date(data.salesCutoffDate);

    // Business validations from requirement 16:
    // - sales cutoff cannot be after event date
    // - quantities must be positive
    // - prices cannot be negative
    // - event date must be valid
    // - sales start must be before cutoff
    if (isNaN(eventDate.getTime())) {
      throw AppError.badRequest('Invalid event date');
    }
    if (salesCutoffDate > eventDate) {
      throw AppError.badRequest('Sales cutoff date cannot be after the event date');
    }
    if (salesStartDate >= salesCutoffDate) {
      throw AppError.badRequest('Sales start date must be before the sales cutoff date');
    }

    if (!data.ticketTiers || data.ticketTiers.length === 0) {
      throw AppError.badRequest('Event must have at least one ticket tier');
    }

    for (const tier of data.ticketTiers) {
      if (tier.quantity <= 0 || !Number.isInteger(tier.quantity)) {
        throw AppError.badRequest(`Quantity for tier "${tier.name}" must be a positive integer`);
      }
      if (tier.price < 0) {
        throw AppError.badRequest(`Price for tier "${tier.name}" cannot be negative`);
      }
    }

    const createdEvent = await eventRepository.create({
      organizerId: user.organizerId,
      title: data.title,
      description: data.description,
      venue: data.venue,
      location: data.location,
      category: data.category || 'General',
      eventDate,
      salesStartDate,
      salesCutoffDate,
      imageUrl: data.imageUrl,
    });

    for (const tier of data.ticketTiers) {
      await ticketTierRepository.create({
        eventId: createdEvent.id,
        name: tier.name,
        description: tier.description,
        price: tier.price,
        totalQuantity: tier.quantity,
      });
    }

    // Invalidate public lists cache
    await cacheService.delPrefix('public:events');

    const fullEvent = await eventRepository.findById(createdEvent.id);
    if (!fullEvent) throw AppError.internal('Failed to retrieve created event');
    return fullEvent;
  },

  async updateEvent(
    user: AuthUser,
    eventId: string,
    data: Partial<{
      title: string;
      description: string;
      venue: string;
      location: string;
      category: string;
      eventDate: string | Date;
      salesStartDate: string | Date;
      salesCutoffDate: string | Date;
      status: any;
      imageUrl: string;
    }>
  ): Promise<EventWithTiers> {
    const existing = await eventRepository.findById(eventId);
    if (!existing) {
      throw AppError.notFound('Event');
    }

    // Multi-tenant check: Admin has global access; Organizer can only modify their own!
    if (user.role !== 'ADMIN' && existing.organizerId !== user.organizerId) {
      throw AppError.forbidden('Tenant Isolation Violation: You cannot modify events belonging to another organizer');
    }

    const updatePayload: any = { ...data };
    if (data.eventDate) updatePayload.eventDate = new Date(data.eventDate);
    if (data.salesStartDate) updatePayload.salesStartDate = new Date(data.salesStartDate);
    if (data.salesCutoffDate) updatePayload.salesCutoffDate = new Date(data.salesCutoffDate);

    await eventRepository.update(eventId, updatePayload);

    // Invalidate caches
    await cacheService.del(`event:${eventId}`);
    await cacheService.del(`event:${eventId}:availability`);
    await cacheService.delPrefix('public:events');

    const updated = await eventRepository.findById(eventId);
    if (!updated) throw AppError.internal('Failed to retrieve updated event');
    return updated;
  },

  async deleteEvent(user: AuthUser, eventId: string): Promise<boolean> {
    const existing = await eventRepository.findById(eventId);
    if (!existing) {
      throw AppError.notFound('Event');
    }

    // Multi-tenant check
    if (user.role !== 'ADMIN' && existing.organizerId !== user.organizerId) {
      throw AppError.forbidden('Tenant Isolation Violation: You cannot delete events belonging to another organizer');
    }

    await eventRepository.delete(eventId);

    // Invalidate caches
    await cacheService.del(`event:${eventId}`);
    await cacheService.del(`event:${eventId}:availability`);
    await cacheService.delPrefix('public:events');

    return true;
  },

  async addTicketTier(
    user: AuthUser,
    eventId: string,
    tierData: { name: string; description?: string; price: number; quantity: number }
  ) {
    const existing = await eventRepository.findById(eventId);
    if (!existing) throw AppError.notFound('Event');

    if (user.role !== 'ADMIN' && existing.organizerId !== user.organizerId) {
      throw AppError.forbidden('Tenant Isolation Violation: Cannot add tiers to another organizer\'s event');
    }

    if (tierData.quantity <= 0) throw AppError.badRequest('Quantity must be greater than zero');
    if (tierData.price < 0) throw AppError.badRequest('Price cannot be negative');

    const tier = await ticketTierRepository.create({
      eventId,
      name: tierData.name,
      description: tierData.description,
      price: tierData.price,
      totalQuantity: tierData.quantity,
    });

    await cacheService.del(`event:${eventId}`);
    await cacheService.del(`event:${eventId}:availability`);
    await cacheService.delPrefix('public:events');

    return tier;
  },
};
