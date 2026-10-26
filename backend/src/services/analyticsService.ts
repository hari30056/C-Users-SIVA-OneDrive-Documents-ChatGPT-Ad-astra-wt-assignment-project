import { eventRepository } from '../repositories/eventRepository';
import { orderRepository } from '../repositories/orderRepository';
import { reservationRepository } from '../repositories/reservationRepository';
import { paymentRepository } from '../repositories/paymentRepository';
import { organizerRepository } from '../repositories/organizerRepository';
import { userRepository } from '../repositories/userRepository';
import { OrganizerAnalytics, PlatformAnalytics, AuthUser } from '../types';
import { AppError } from '../utils/errors';

export const analyticsService = {
  async getOrganizerAnalytics(user: AuthUser, eventId?: string): Promise<OrganizerAnalytics> {
    if (!user.organizerId) {
      throw AppError.forbidden('User does not have an organizer tenant profile');
    }

    const organizerId = user.organizerId;

    // Multi-tenant event filtering
    let events = await eventRepository.findByOrganizerId(organizerId);
    if (eventId) {
      events = events.filter((e) => e.id === eventId);
      if (events.length === 0) {
        throw AppError.forbidden('Tenant Isolation Violation: Event does not belong to your organization');
      }
    }

    const eventIds = new Set(events.map((e) => e.id));
    const allOrders = (await orderRepository.findByOrganizerId(organizerId)).filter((o) => eventIds.has(o.eventId));

    let totalRevenue = 0;
    let ticketsSold = 0;
    let ticketsReserved = 0;
    let availableTickets = 0;
    let successfulPayments = 0;
    let failedPayments = 0;

    // Aggregate ticket tier metrics
    const tierMap = new Map<string, { tierName: string; sold: number; revenue: number; available: number }>();

    for (const ev of events) {
      for (const tier of ev.ticketTiers) {
        ticketsSold += tier.soldQuantity;
        ticketsReserved += tier.reservedQuantity;
        availableTickets += tier.availableQuantity;

        const current = tierMap.get(tier.name) || {
          tierName: tier.name,
          sold: 0,
          revenue: 0,
          available: 0,
        };
        current.sold += tier.soldQuantity;
        current.revenue += tier.soldQuantity * tier.price;
        current.available += tier.availableQuantity;
        tierMap.set(tier.name, current);
      }
    }

    // Orders and payments metrics
    for (const order of allOrders) {
      if (order.status === 'CONFIRMED') {
        totalRevenue += order.totalAmount;
      }

      for (const tx of order.transactions) {
        if (tx.status === 'SUCCESS') successfulPayments++;
        if (tx.status === 'FAILED') failedPayments++;
      }
    }

    // Reservation attempts vs completions for conversion rate
    let totalReservationAttempts = 0;
    let completedReservations = 0;

    for (const ev of events) {
      const resList = await reservationRepository.findByEventId(ev.id);
      totalReservationAttempts += resList.length;
      completedReservations += resList.filter((r) => r.status === 'COMPLETED').length;
    }

    const conversionRate = totalReservationAttempts > 0
      ? Number(((completedReservations / totalReservationAttempts) * 100).toFixed(1))
      : 0;

    // Time-series generation (last 7 days)
    const dates: string[] = [];
    const revenueOverTimeMap = new Map<string, number>();
    const ticketSalesOverTimeMap = new Map<string, number>();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dates.push(key);
      revenueOverTimeMap.set(key, 0);
      ticketSalesOverTimeMap.set(key, 0);
    }

    for (const order of allOrders) {
      if (order.status === 'CONFIRMED') {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        if (revenueOverTimeMap.has(orderDate)) {
          revenueOverTimeMap.set(orderDate, (revenueOverTimeMap.get(orderDate) || 0) + order.totalAmount);
          const totalTix = order.items.reduce((sum, item) => sum + item.quantity, 0);
          ticketSalesOverTimeMap.set(orderDate, (ticketSalesOverTimeMap.get(orderDate) || 0) + totalTix);
        }
      }
    }

    const revenueOverTime = dates.map((date) => ({
      date,
      revenue: revenueOverTimeMap.get(date) || 0,
    }));

    const ticketSalesOverTime = dates.map((date) => ({
      date,
      count: ticketSalesOverTimeMap.get(date) || 0,
    }));

    return {
      totalRevenue,
      ticketsSold,
      ticketsReserved,
      availableTickets,
      totalOrders: allOrders.length,
      successfulPayments,
      failedPayments,
      conversionRate,
      revenueOverTime,
      ticketSalesOverTime,
      salesByTicketTier: Array.from(tierMap.values()),
    };
  },

  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    const allEvents = await eventRepository.findAllAdmin();
    const allOrders = await orderRepository.findAllAdmin();
    const allOrganizers = await organizerRepository.findAll();
    const allUsers = await userRepository.findAll();
    const allTransactions = await paymentRepository.findAllAdmin();

    let totalRevenue = 0;
    let ticketsSold = 0;
    let ticketsReserved = 0;
    let availableTickets = 0;

    const tierMap = new Map<string, { tierName: string; sold: number; revenue: number; available: number }>();

    for (const ev of allEvents) {
      for (const tier of ev.ticketTiers) {
        ticketsSold += tier.soldQuantity;
        ticketsReserved += tier.reservedQuantity;
        availableTickets += tier.availableQuantity;

        const current = tierMap.get(tier.name) || {
          tierName: tier.name,
          sold: 0,
          revenue: 0,
          available: 0,
        };
        current.sold += tier.soldQuantity;
        current.revenue += tier.soldQuantity * tier.price;
        current.available += tier.availableQuantity;
        tierMap.set(tier.name, current);
      }
    }

    let successfulPayments = 0;
    let failedPayments = 0;

    for (const tx of allTransactions) {
      if (tx.status === 'SUCCESS') successfulPayments++;
      if (tx.status === 'FAILED') failedPayments++;
    }

    for (const order of allOrders) {
      if (order.status === 'CONFIRMED') {
        totalRevenue += order.totalAmount;
      }
    }

    const completedOrders = allOrders.filter((o) => o.status === 'CONFIRMED').length;
    const conversionRate = allOrders.length > 0
      ? Number(((completedOrders / allOrders.length) * 100).toFixed(1))
      : 0;

    const dates: string[] = [];
    const revenueOverTimeMap = new Map<string, number>();
    const ticketSalesOverTimeMap = new Map<string, number>();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dates.push(key);
      revenueOverTimeMap.set(key, 0);
      ticketSalesOverTimeMap.set(key, 0);
    }

    for (const order of allOrders) {
      if (order.status === 'CONFIRMED') {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        if (revenueOverTimeMap.has(orderDate)) {
          revenueOverTimeMap.set(orderDate, (revenueOverTimeMap.get(orderDate) || 0) + order.totalAmount);
          const totalTix = order.items.reduce((sum, item) => sum + item.quantity, 0);
          ticketSalesOverTimeMap.set(orderDate, (ticketSalesOverTimeMap.get(orderDate) || 0) + totalTix);
        }
      }
    }

    return {
      totalRevenue,
      ticketsSold,
      ticketsReserved,
      availableTickets,
      totalOrders: allOrders.length,
      successfulPayments,
      failedPayments,
      conversionRate,
      revenueOverTime: dates.map((date) => ({ date, revenue: revenueOverTimeMap.get(date) || 0 })),
      ticketSalesOverTime: dates.map((date) => ({ date, count: ticketSalesOverTimeMap.get(date) || 0 })),
      salesByTicketTier: Array.from(tierMap.values()),
      totalOrganizers: allOrganizers.length,
      activeOrganizers: allOrganizers.filter((o) => o.status === 'ACTIVE').length,
      totalEvents: allEvents.length,
      totalUsers: allUsers.length,
    };
  },
};
