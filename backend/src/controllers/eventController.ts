import { Response, NextFunction } from 'express';
import { eventService } from '../services/eventService';
import { AuthenticatedRequest } from '../types';

export const eventController = {
  async getPublicEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, location, category, startDate, endDate, minPrice, maxPrice } = req.query;

      const events = await eventService.getPublicEvents({
        search: search as string,
        location: location as string,
        category: category as string,
        startDate: startDate as string,
        endDate: endDate as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      });

      res.status(200).json({
        success: true,
        count: events.length,
        data: events,
      });
    } catch (err) {
      next(err);
    }
  },

  async getEventById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventService.getEventById(req.params.id);
      res.status(200).json({
        success: true,
        data: event,
      });
    } catch (err) {
      next(err);
    }
  },

  async getEventAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const availability = await eventService.getEventAvailability(req.params.id);
      res.status(200).json({
        success: true,
        data: availability,
      });
    } catch (err) {
      next(err);
    }
  },

  async getOrganizerEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await eventService.getOrganizerEvents(req.user!);
      res.status(200).json({
        success: true,
        count: events.length,
        data: events,
      });
    } catch (err) {
      next(err);
    }
  },

  async createEvent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventService.createEvent(req.user!, req.body);
      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateEvent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await eventService.updateEvent(req.user!, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteEvent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await eventService.deleteEvent(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async addTicketTier(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tier = await eventService.addTicketTier(req.user!, req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: tier,
      });
    } catch (err) {
      next(err);
    }
  },
};
