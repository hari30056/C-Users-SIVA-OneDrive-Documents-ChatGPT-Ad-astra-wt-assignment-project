import { Response, NextFunction } from 'express';
import { paymentService } from '../services/paymentService';
import { AuthenticatedRequest } from '../types';

export const paymentController = {
  async processPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId, simulateFailure, paymentMethod } = req.body;

      const result = await paymentService.processPayment(req.user!, {
        orderId,
        simulateFailure: simulateFailure === true,
        paymentMethod,
      });

      res.status(202).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async getPaymentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.getPaymentStatus(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
