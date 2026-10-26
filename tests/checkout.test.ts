import { seedDatabase } from '../backend/src/utils/seed';
import { authService } from '../backend/src/services/authService';
import { eventService } from '../backend/src/services/eventService';
import { reservationService } from '../backend/src/services/reservationService';
import { checkoutService } from '../backend/src/services/checkoutService';
import { paymentService } from '../backend/src/services/paymentService';
import { ticketTierRepository } from '../backend/src/repositories/ticketTierRepository';
import { executePaymentProcessing } from '../backend/src/queues/paymentQueue';

describe('Transactional Checkout & Asynchronous Mock Payment Flow', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('Completes end-to-end checkout, payment success, and ticket generation', async () => {
    const attendee = await authService.login('attendee1@example.com', 'Password123!');
    const events = await eventService.getPublicEvents({});
    const event = events[1]; // Startup Summit
    const tier = event.ticketTiers[0];

    // 1. Reserve 2 tickets
    const reservation = await reservationService.createHold(attendee.user, event.id, [
      { ticketTierId: tier.id, quantity: 2 },
    ]);

    // 2. Checkout -> Create Order
    const order = await checkoutService.checkout(attendee.user, reservation.reservationId);
    expect(order.status).toBe('PENDING');
    expect(order.totalAmount).toBe(tier.price * 2);

    // 3. Initiate Payment -> PENDING
    const paymentInit = await paymentService.processPayment(attendee.user, {
      orderId: order.id,
      simulateFailure: false,
    });
    expect(paymentInit.status).toBe('PENDING');

    // 4. Execute asynchronous payment processing (simulating worker)
    await executePaymentProcessing(order.id, paymentInit.transactionId, false);

    // 5. Verify payment status
    const paymentStatus = await paymentService.getPaymentStatus(paymentInit.transactionId, attendee.user);
    expect(paymentStatus.status).toBe('SUCCESS');
    expect(paymentStatus.orderStatus).toBe('CONFIRMED');

    // 6. Verify tickets generated
    expect(paymentStatus.tickets.length).toBe(2);
    expect(paymentStatus.tickets[0].ticketCode).toMatch(/^TCK-/);

    // 7. Verify inventory updated (sold quantity increased)
    const updatedTier = await ticketTierRepository.findById(tier.id);
    expect(updatedTier!.soldQuantity).toBeGreaterThanOrEqual(2);
  });

  it('Handles mock payment failure and safely restores reserved inventory', async () => {
    const attendee = await authService.login('attendee2@example.com', 'Password123!');
    const events = await eventService.getPublicEvents({});
    const event = events[2]; // Neon Nights
    const tier = event.ticketTiers[0];

    const initialAvail = (await ticketTierRepository.findById(tier.id))!.availableQuantity;

    // Reserve 2 tickets
    const reservation = await reservationService.createHold(attendee.user, event.id, [
      { ticketTierId: tier.id, quantity: 2 },
    ]);

    const order = await checkoutService.checkout(attendee.user, reservation.reservationId);

    // Initiate payment with simulateFailure = true
    const paymentInit = await paymentService.processPayment(attendee.user, {
      orderId: order.id,
      simulateFailure: true,
    });

    // Execute worker with failure simulation
    await executePaymentProcessing(order.id, paymentInit.transactionId, true);

    const paymentStatus = await paymentService.getPaymentStatus(paymentInit.transactionId, attendee.user);
    expect(paymentStatus.status).toBe('FAILED');
    expect(paymentStatus.orderStatus).toBe('FAILED');

    // Verify inventory restored back to available
    const restoredTier = await ticketTierRepository.findById(tier.id);
    expect(restoredTier!.availableQuantity).toBe(initialAvail);
  });
});
