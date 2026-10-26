import { Response, NextFunction } from 'express';
import { userRepository } from '../repositories/userRepository';
import { organizerRepository } from '../repositories/organizerRepository';
import { eventRepository } from '../repositories/eventRepository';
import { orderRepository } from '../repositories/orderRepository';
import { paymentRepository } from '../repositories/paymentRepository';
import { isDbConnected } from '../config/database';
import { isRedisConnected } from '../config/redis';
import { AuthenticatedRequest } from '../types';

export const adminController = {
  async getAllUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userRepository.findAll();
      const sanitized = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      }));

      res.status(200).json({
        success: true,
        count: sanitized.length,
        data: sanitized,
      });
    } catch (err) {
      next(err);
    }
  },

  async getAllOrganizers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizers = await organizerRepository.findAll();
      res.status(200).json({
        success: true,
        count: organizers.length,
        data: organizers,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateOrganizerStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body;
      const updated = await organizerRepository.updateStatus(req.params.id, status);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async getAllEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await eventRepository.findAllAdmin();
      res.status(200).json({
        success: true,
        count: events.length,
        data: events,
      });
    } catch (err) {
      next(err);
    }
  },

  async getAllOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await orderRepository.findAllAdmin();
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  },

  async getAllTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const txs = await paymentRepository.findAllAdmin();
      res.status(200).json({
        success: true,
        count: txs.length,
        data: txs,
      });
    } catch (err) {
      next(err);
    }
  },

  async getHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    const status = {
      status: 'ok',
      database: isDbConnected ? 'connected' : 'memory-fallback (isolated ACID locks)',
      redis: isRedisConnected ? 'connected' : 'memory-fallback (delayed timer scheduler)',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    res.status(200).json(status);
  },
};
