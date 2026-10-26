import { Response, NextFunction } from 'express';
import { ticketRepository } from '../repositories/ticketRepository';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../utils/errors';

export const ticketController = {
  async getMyTickets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tickets = await ticketRepository.findByUserId(req.user!.id);
      res.status(200).json({
        success: true,
        count: tickets.length,
        data: tickets,
      });
    } catch (err) {
      next(err);
    }
  },

  async getTicketById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await ticketRepository.findById(req.params.id);
      if (!ticket) {
        throw AppError.notFound('Ticket');
      }
      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await ticketRepository.findById(req.params.id);
      if (!ticket) {
        throw AppError.notFound('Ticket');
      }

      if (ticket.status === 'USED') {
        res.status(200).json({
          success: false,
          valid: false,
          message: 'Ticket has already been used.',
          data: ticket,
        });
        return;
      }

      const updated = await ticketRepository.updateStatus(ticket.id, 'USED');
      res.status(200).json({
        success: true,
        valid: true,
        message: 'Ticket verified and marked as USED.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },
};
