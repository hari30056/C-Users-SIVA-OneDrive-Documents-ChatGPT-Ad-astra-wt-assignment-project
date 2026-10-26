import { prisma, isDbConnected } from '../config/database';
import { inMemoryDb, OrganizerEntity } from './dbStore';
import { v4 as uuidv4 } from 'uuid';
import { OrganizerStatus } from '../types';

export const organizerRepository = {
  async findById(id: string): Promise<OrganizerEntity | null> {
    if (isDbConnected) {
      const org = await prisma.organizer.findUnique({ where: { id } });
      return org as OrganizerEntity | null;
    }
    return inMemoryDb.organizers.get(id) || null;
  },

  async findByOwnerUserId(ownerUserId: string): Promise<OrganizerEntity | null> {
    if (isDbConnected) {
      const org = await prisma.organizer.findUnique({ where: { ownerUserId } });
      return org as OrganizerEntity | null;
    }
    for (const org of inMemoryDb.organizers.values()) {
      if (org.ownerUserId === ownerUserId) return org;
    }
    return null;
  },

  async create(data: { organizationName: string; ownerUserId: string; status?: OrganizerStatus }): Promise<OrganizerEntity> {
    if (isDbConnected) {
      const org = await prisma.organizer.create({
        data: {
          organizationName: data.organizationName,
          ownerUserId: data.ownerUserId,
          status: data.status || 'ACTIVE',
        },
      });
      return org as OrganizerEntity;
    }

    const org: OrganizerEntity = {
      id: uuidv4(),
      organizationName: data.organizationName,
      ownerUserId: data.ownerUserId,
      status: data.status || 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryDb.organizers.set(org.id, org);
    return org;
  },

  async findAll(): Promise<(OrganizerEntity & { ownerEmail?: string; ownerName?: string })[]> {
    if (isDbConnected) {
      const list = await prisma.organizer.findMany({
        include: { owner: true },
        orderBy: { createdAt: 'desc' },
      });
      return list.map((item) => ({
        id: item.id,
        organizationName: item.organizationName,
        ownerUserId: item.ownerUserId,
        status: item.status as OrganizerStatus,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        ownerEmail: item.owner?.email,
        ownerName: item.owner?.name,
      }));
    }

    return Array.from(inMemoryDb.organizers.values()).map((org) => {
      const owner = inMemoryDb.users.get(org.ownerUserId);
      return {
        ...org,
        ownerEmail: owner?.email,
        ownerName: owner?.name,
      };
    });
  },

  async updateStatus(id: string, status: OrganizerStatus): Promise<OrganizerEntity | null> {
    if (isDbConnected) {
      const updated = await prisma.organizer.update({
        where: { id },
        data: { status, updatedAt: new Date() },
      });
      return updated as OrganizerEntity;
    }
    const org = inMemoryDb.organizers.get(id);
    if (!org) return null;
    org.status = status;
    org.updatedAt = new Date();
    return org;
  },
};
