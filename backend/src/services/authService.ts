import { config } from '../config/environment';
import { userRepository } from '../repositories/userRepository';
import { organizerRepository } from '../repositories/organizerRepository';
import { AppError } from '../utils/errors';
import { AuthUser, UserRole } from '../types';
import { hashPassword, comparePassword, signJwt, verifyJwt } from '../utils/cryptoShim';

export const authService = {
  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    organizationName?: string;
  }): Promise<{ user: AuthUser; token: string }> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw AppError.badRequest('An account with this email already exists', 'DUPLICATE_REQUEST');
    }

    if (!data.password || data.password.length < 6) {
      throw AppError.badRequest('Password must be at least 6 characters long');
    }

    const passwordHash = await hashPassword(data.password);
    const role: UserRole = data.role || 'ATTENDEE';

    const user = await userRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role,
    });

    let organizerId: string | null = null;
    if (role === 'ORGANIZER') {
      const org = await organizerRepository.create({
        organizationName: data.organizationName || `${data.name}'s Organization`,
        ownerUserId: user.id,
      });
      organizerId = org.id;
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizerId,
    };

    const token = signJwt(authUser, config.jwtSecret, config.jwtExpiresIn);

    return { user: authUser, token };
  },

  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    let organizerId: string | null = null;
    if (user.role === 'ORGANIZER') {
      const org = await organizerRepository.findByOwnerUserId(user.id);
      if (org) {
        if (org.status === 'SUSPENDED') {
          throw AppError.forbidden('Your organizer account is suspended. Contact administration.');
        }
        organizerId = org.id;
      }
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizerId,
    };

    const token = signJwt(authUser, config.jwtSecret, config.jwtExpiresIn);

    return { user: authUser, token };
  },

  verifyToken(token: string): AuthUser {
    try {
      const decoded = verifyJwt(token, config.jwtSecret) as AuthUser;
      return decoded;
    } catch {
      throw AppError.unauthorized('Invalid or expired authentication token');
    }
  },
};
