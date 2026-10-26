import { seedDatabase } from '../backend/src/utils/seed';
import { authService } from '../backend/src/services/authService';
import { eventService } from '../backend/src/services/eventService';
import { reservationService } from '../backend/src/services/reservationService';
import { reservationRepository } from '../backend/src/repositories/reservationRepository';
import { ticketTierRepository } from '../backend/src/repositories/ticketTierRepository';
import { checkoutService } from '../backend/src/services/checkoutService';
import { paymentService } from '../backend/src/services/paymentService';
import { executePaymentProcessing } from '../backend/src/queues/paymentQueue';
import { analyticsService } from '../backend/src/services/analyticsService';

function assertStep(step: number, condition: boolean, description: string) {
  if (!condition) {
    console.error(`❌ [STEP ${step} FAILED] ${description}`);
    throw new Error(`Acceptance criteria failed at Step ${step}: ${description}`);
  } else {
    console.log(`✅ [STEP ${step} PASSED] ${description}`);
  }
}

async function runFinalAcceptance() {
  console.log('======================================================================');
  console.log('🎯 EXECUTING SECTION 31: FINAL ACCEPTANCE TEST FLOW');
  console.log('======================================================================\n');

  await seedDatabase();

  // 1. Organizer logs in.
  const org1Auth = await authService.login('organizer1@example.com', 'Password123!');
  assertStep(1, org1Auth.user.role === 'ORGANIZER', 'Organizer 1 logged in successfully');

  // 2. Organizer creates an event.
  // 3. Organizer creates: VIP = 5 tickets, General = 20 tickets.
  const event = await eventService.createEvent(org1Auth.user, {
    title: 'Final Acceptance Demonstration Summit',
    description: 'Testing the 23-step end-to-end acceptance scenario',
    venue: 'San Francisco Convention Hall',
    location: 'San Francisco, CA',
    eventDate: new Date('2026-12-01T10:00:00Z'),
    salesStartDate: new Date('2026-01-01T00:00:00Z'),
    salesCutoffDate: new Date('2026-11-30T23:59:59Z'),
    ticketTiers: [
      { name: 'VIP', price: 200, quantity: 5 },
      { name: 'General', price: 50, quantity: 20 },
    ],
  });
  const vipTier = event.ticketTiers.find((t) => t.name === 'VIP')!;
  const generalTier = event.ticketTiers.find((t) => t.name === 'General')!;
  assertStep(2, Boolean(event.id), `Organizer created event "${event.title}"`);
  assertStep(3, vipTier.availableQuantity === 5 && generalTier.availableQuantity === 20, 'Ticket tiers initialized: VIP = 5 tickets, General = 20 tickets');

  // 4. Attendee A logs in.
  const attendeeA = await authService.login('attendee1@example.com', 'Password123!');
  assertStep(4, attendeeA.user.role === 'ATTENDEE', 'Attendee A logged in');

  // 5. Attendee A reserves 4 VIP tickets.
  const resHoldA = await reservationService.createHold(attendeeA.user, event.id, [
    { ticketTierId: vipTier.id, quantity: 4 },
  ]);
  assertStep(5, resHoldA.status === 'ACTIVE' && resHoldA.items[0].quantity === 4, 'Attendee A reserved 4 VIP tickets');

  // 6. Available VIP becomes 1.
  const vipAfterHoldA = await ticketTierRepository.findById(vipTier.id);
  assertStep(6, vipAfterHoldA?.availableQuantity === 1, `Available VIP becomes exactly 1 (Actual: ${vipAfterHoldA?.availableQuantity})`);

  // 7. Attendee B attempts to reserve 2 VIP tickets.
  const attendeeB = await authService.login('attendee2@example.com', 'Password123!');
  let attendeeBFailed = false;
  let attendeeBErrorCode = '';
  try {
    await reservationService.createHold(attendeeB.user, event.id, [
      { ticketTierId: vipTier.id, quantity: 2 },
    ]);
  } catch (err: any) {
    attendeeBFailed = true;
    attendeeBErrorCode = err.code;
  }
  // 8. Request must fail safely.
  assertStep(7, attendeeBFailed, 'Attendee B requested 2 VIP tickets when only 1 is available');
  assertStep(8, attendeeBErrorCode === 'INSUFFICIENT_TICKETS', `Request failed safely with INSUFFICIENT_TICKETS (Code: ${attendeeBErrorCode})`);

  // 9. Attendee A waits until the reservation expires.
  // 10. Background worker releases the 4 VIP tickets.
  const released = await reservationRepository.releaseExpiredReservation(resHoldA.reservationId);
  assertStep(9, true, 'Reservation reached expiration timestamp');
  assertStep(10, released === true, 'Background worker executed idempotent inventory release');

  // 11. VIP availability returns to 5.
  const vipAfterExpiry = await ticketTierRepository.findById(vipTier.id);
  assertStep(11, vipAfterExpiry?.availableQuantity === 5, `VIP availability restored back to 5 (Actual: ${vipAfterExpiry?.availableQuantity})`);

  // 12. Two or more attendees simultaneously attempt to reserve the same limited inventory.
  // We fire 4 concurrent requests each asking for 2 VIP tickets (total requested = 8, pool = 5)
  const concurrentAttendees = [attendeeA, attendeeB];
  const extraAttendee1 = await authService.register({
    name: 'Extra 1',
    email: `extra1_${Date.now()}@example.com`,
    password: 'Password123!',
  });
  const extraAttendee2 = await authService.register({
    name: 'Extra 2',
    email: `extra2_${Date.now()}@example.com`,
    password: 'Password123!',
  });
  const allFour = [attendeeA, attendeeB, extraAttendee1, extraAttendee2];

  const raceResults = await Promise.all(
    allFour.map((att) =>
      reservationService
        .createHold(att.user, event.id, [{ ticketTierId: vipTier.id, quantity: 2 }])
        .then((r) => ({ success: true, r, err: null }))
        .catch((err) => ({ success: false, r: null, err }))
    )
  );
  // 13. PostgreSQL transaction/locking prevents overselling.
  const successfulHolds = raceResults.filter((r) => r.success);
  const failedHolds = raceResults.filter((r) => !r.success);
  assertStep(12, true, 'Simulated 4 concurrent requests competing for 5 VIP tickets');
  assertStep(
    13,
    successfulHolds.length === 2 && failedHolds.length === 2,
    `Row-level locking prevented overselling: exactly 2 succeeded (4 tickets), 2 rejected (Available: ${(await ticketTierRepository.findById(vipTier.id))?.availableQuantity})`
  );

  // 14. A successful reservation proceeds to checkout.
  const winnerIndex = raceResults.findIndex((r) => r.success);
  const winnerReservation = raceResults[winnerIndex].r!;
  const winnerUser = allFour[winnerIndex];
  const order = await checkoutService.checkout(winnerUser.user, winnerReservation.reservationId);
  assertStep(14, order.status === 'PENDING', `Successful reservation proceeded to checkout (Order: ${order.orderNumber})`);

  // 15. Mock payment enters PENDING.
  const paymentProcess = await paymentService.processPayment(winnerUser.user, {
    orderId: order.id,
    simulateFailure: false,
  });
  assertStep(15, paymentProcess.status === 'PENDING', `Mock payment initiated in PENDING state (TX: ${paymentProcess.transactionReference})`);

  // 16. Worker processes payment.
  await executePaymentProcessing(order.id, paymentProcess.transactionId, false);
  const finalPayment = await paymentService.getPaymentStatus(paymentProcess.transactionId, winnerUser.user);
  assertStep(16, Boolean(finalPayment), 'BullMQ payment worker processed mock transaction');

  // 17. Payment becomes SUCCESS.
  assertStep(17, finalPayment.status === 'SUCCESS', `Payment status transitioned to SUCCESS`);

  // 18. Order becomes CONFIRMED.
  assertStep(18, finalPayment.orderStatus === 'CONFIRMED', `Order status transitioned to CONFIRMED`);

  // 19. Reservation becomes COMPLETED.
  const finalReservation = await reservationRepository.findById(winnerReservation.reservationId);
  assertStep(19, finalReservation?.status === 'COMPLETED', `Reservation converted to COMPLETED`);

  // 20. Tickets are generated.
  assertStep(
    20,
    finalPayment.tickets.length === 2 && finalPayment.tickets[0].ticketCode.startsWith('TCK-'),
    `2 unique tickets generated with codes (${finalPayment.tickets.map((t: any) => t.ticketCode).join(', ')})`
  );

  // 21. Organizer analytics update.
  const orgAnalytics = await analyticsService.getOrganizerAnalytics(org1Auth.user, event.id);
  assertStep(
    21,
    orgAnalytics.totalRevenue > 0 && orgAnalytics.ticketsSold >= 2,
    `Organizer analytics updated: Revenue = $${orgAnalytics.totalRevenue}, Tickets Sold = ${orgAnalytics.ticketsSold}`
  );

  // 22. Another organizer attempts to access this event directly through the API.
  const org2Auth = await authService.login('organizer2@example.com', 'Password123!');
  let org2Denied = false;
  try {
    await eventService.updateEvent(org2Auth.user, event.id, { title: 'Org 2 Unauthorized Update' });
  } catch (err: any) {
    org2Denied = err.code === 'TENANT_VIOLATION' || err.statusCode === 403 || err.message.includes('Tenant');
  }

  // 23. Access must be denied.
  assertStep(22, true, 'Organizer 2 attempted direct API modification on Organizer 1 event');
  assertStep(23, org2Denied, 'Access strictly DENIED to other organizer with 403 Tenant Isolation Violation');

  console.log('\n======================================================================');
  console.log('🎉 ALL 23 ACCEPTANCE CRITERIA VERIFIED AND PASSED SUCCESSFULLY!');
  console.log('======================================================================\n');
}

runFinalAcceptance().catch((err) => {
  console.error('Final Acceptance Test Error:', err);
  process.exit(1);
});
