import { prisma, isDbConnected } from '../config/database';
import { inMemoryDb, UserEntity } from './dbStore';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../types';

export const userRepository = {
  async findByEmail(email: string): Promise<UserEntity | null> {
    if (isDbConnected) {
      const user = await prisma.user.findUnique({ where: { email } });
      return user as UserEntity | null;
    }
    const normalized = email.toLowerCase().trim();
    for (const u of inMemoryDb.users.values()) {
      if (u.email.toLowerCase() === normalized) {
        return u;
      }
    }
    return null;
  },

  async findById(id: string): Promise<UserEntity | null> {
    if (isDbConnected) {
      const user = await prisma.user.findUnique({ where: { id } });
      return user as UserEntity | null;
    }
    return inMemoryDb.users.get(id) || null;
  },

  async create(data: { name: string; email: string; passwordHash: string; role: UserRole }): Promise<UserEntity> {
    if (isDbConnected) {
      const created = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase().trim(),
          passwordHash: data.passwordHash,
          role: data.role,
        },
      });
      return created as UserEntity;
    }

    const newUser: UserEntity = {
      id: uuidv4(),
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: data.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryDb.users.set(newUser.id, newUser);
    return newUser;
  },

  async findAll(): Promise<UserEntity[]> {
    if (isDbConnected) {
      const list = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
      return list as UserEntity[];
    }
    return Array.from(inMemoryDb.users.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },

  async update(id: string, data: Partial<Omit<UserEntity, 'id' | 'createdAt'>>): Promise<UserEntity | null> {
    if (isDbConnected) {
      const updated = await prisma.user.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
      });
      return updated as UserEntity;
    }
    const user = inMemoryDb.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...data, updatedAt: new Date() };
    inMemoryDb.users.set(id, updated);
    return updated;
  },
};
