import { Response, NextFunction } from 'express';
import { reservationService } from '../services/reservationService';
import { AuthenticatedRequest } from '../types';

export const reservationController = {
  async createReservation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.params.eventId;
      const { items } = req.body;

      const reservation = await reservationService.createHold(req.user!, eventId, items);

      res.status(201).json({
        success: true,
        message: 'Tickets reserved successfully for 10 minutes.',
        data: reservation,
      });
    } catch (err) {
      next(err);
    }
  },

  async getReservation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reservation = await reservationService.getReservationById(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: reservation,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyReservations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await reservationService.getUserReservations(req.user!.id);
      res.status(200).json({
        success: true,
        count: list.length,
        data: list,
      });
    } catch (err) {
      next(err);
    }
  },

  async cancelReservation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await reservationService.cancelReservation(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        message: 'Reservation cancelled and inventory released',
      });
    } catch (err) {
      next(err);
    }
  },
};
