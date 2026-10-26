import { orderRepository, OrderWithDetails } from '../repositories/orderRepository';
import { AppError } from '../utils/errors';
import { AuthUser } from '../types';

export const checkoutService = {
  async checkout(user: AuthUser, reservationId: string): Promise<OrderWithDetails> {
    if (!reservationId) {
      throw AppError.badRequest('Reservation ID is required for checkout');
    }

    const order = await orderRepository.createOrderFromReservation(user.id, reservationId);
    return order;
  },

  async getOrderById(orderId: string, user: AuthUser): Promise<OrderWithDetails> {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order');
    }

    // Role-based tenant & attendee security
    if (user.role === 'ATTENDEE' && order.userId !== user.id) {
      throw AppError.forbidden('You can only view your own orders');
    }

    return order;
  },

  async getUserOrders(userId: string): Promise<OrderWithDetails[]> {
    return orderRepository.findByUserId(userId);
  },

  async getOrganizerOrders(user: AuthUser): Promise<OrderWithDetails[]> {
    if (!user.organizerId) {
      throw AppError.forbidden('User does not have an organizer profile');
    }
    return orderRepository.findByOrganizerId(user.organizerId);
  },

  async getAllOrdersAdmin(): Promise<OrderWithDetails[]> {
    return orderRepository.findAllAdmin();
  },
};
