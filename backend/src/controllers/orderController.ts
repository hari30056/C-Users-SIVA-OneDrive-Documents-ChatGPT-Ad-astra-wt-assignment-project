import { Response, NextFunction } from 'express';
import { checkoutService } from '../services/checkoutService';
import { AuthenticatedRequest } from '../types';

export const orderController = {
  async checkout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reservationId } = req.body;
      const order = await checkoutService.checkout(req.user!, reservationId);

      res.status(201).json({
        success: true,
        message: 'Order created successfully. Proceed to payment.',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  },

  async getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await checkoutService.getOrderById(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await checkoutService.getUserOrders(req.user!.id);
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  },

  async getOrganizerOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await checkoutService.getOrganizerOrders(req.user!);
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  },
};
