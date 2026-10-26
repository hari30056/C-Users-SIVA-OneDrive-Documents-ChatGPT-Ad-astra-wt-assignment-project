import { prisma, pgPool, isDbConnected } from '../config/database';
import { inMemoryDb, TicketTierEntity } from './dbStore';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/errors';

export const ticketTierRepository = {
  async findById(id: string): Promise<TicketTierEntity | null> {
    if (isDbConnected) {
      const tier = await prisma.ticketTier.findUnique({ where: { id } });
      if (!tier) return null;
      return {
        id: tier.id,
        eventId: tier.eventId,
        name: tier.name,
        description: tier.description,
        price: Number(tier.price),
        totalQuantity: tier.totalQuantity,
        availableQuantity: tier.availableQuantity,
        reservedQuantity: tier.reservedQuantity,
        soldQuantity: tier.soldQuantity,
        createdAt: tier.createdAt,
        updatedAt: tier.updatedAt,
      };
    }
    return inMemoryDb.ticketTiers.get(id) || null;
  },

  async findByEventId(eventId: string): Promise<TicketTierEntity[]> {
    if (isDbConnected) {
      const list = await prisma.ticketTier.findMany({
        where: { eventId },
        orderBy: { price: 'asc' },
      });
      return list.map((t) => ({
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
      }));
    }
    return Array.from(inMemoryDb.ticketTiers.values())
      .filter((t) => t.eventId === eventId)
      .sort((a, b) => a.price - b.price);
  },

  async create(data: {
    eventId: string;
    name: string;
    description?: string;
    price: number;
    totalQuantity: number;
  }): Promise<TicketTierEntity> {
    if (isDbConnected) {
      const created = await prisma.ticketTier.create({
        data: {
          eventId: data.eventId,
          name: data.name,
          description: data.description || null,
          price: data.price,
          totalQuantity: data.totalQuantity,
          availableQuantity: data.totalQuantity,
          reservedQuantity: 0,
          soldQuantity: 0,
        },
      });
      return {
        id: created.id,
        eventId: created.eventId,
        name: created.name,
        description: created.description,
        price: Number(created.price),
        totalQuantity: created.totalQuantity,
        availableQuantity: created.availableQuantity,
        reservedQuantity: created.reservedQuantity,
        soldQuantity: created.soldQuantity,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    }

    const tier: TicketTierEntity = {
      id: uuidv4(),
      eventId: data.eventId,
      name: data.name,
      description: data.description || null,
      price: data.price,
      totalQuantity: data.totalQuantity,
      availableQuantity: data.totalQuantity,
      reservedQuantity: 0,
      soldQuantity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryDb.ticketTiers.set(tier.id, tier);
    return tier;
  },

  async update(id: string, data: Partial<Omit<TicketTierEntity, 'id' | 'createdAt'>>): Promise<TicketTierEntity | null> {
    if (isDbConnected) {
      const updated = await prisma.ticketTier.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
      });
      return {
        id: updated.id,
        eventId: updated.eventId,
        name: updated.name,
        description: updated.description,
        price: Number(updated.price),
        totalQuantity: updated.totalQuantity,
        availableQuantity: updated.availableQuantity,
        reservedQuantity: updated.reservedQuantity,
        soldQuantity: updated.soldQuantity,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    }

    const tier = inMemoryDb.ticketTiers.get(id);
    if (!tier) return null;
    const updated = { ...tier, ...data, updatedAt: new Date() };
    inMemoryDb.ticketTiers.set(id, updated);
    return updated;
  },
};
