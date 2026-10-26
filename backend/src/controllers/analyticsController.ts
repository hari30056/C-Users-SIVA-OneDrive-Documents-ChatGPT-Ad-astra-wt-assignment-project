import { Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService';
import { AuthenticatedRequest } from '../types';

export const analyticsController = {
  async getOrganizerAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await analyticsService.getOrganizerAnalytics(req.user!);
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (err) {
      next(err);
    }
  },

  async getEventAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await analyticsService.getOrganizerAnalytics(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (err) {
      next(err);
    }
  },

  async getPlatformAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await analyticsService.getPlatformAnalytics();
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (err) {
      next(err);
    }
  },
};
