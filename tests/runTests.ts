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

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failed++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    passed++;
    console.log(`  ✅ PASSED: ${message}`);
  }
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('🧪 RUNNING MULTI-TENANT EVENT & TICKET RESERVATION SYSTEM TEST SUITE');
  console.log('======================================================================\n');

  // Step 0: Seed Database
  console.log('--- TEST 0: DATABASE INITIALIZATION & SEEDING ---');
  await seedDatabase();
  assert(true, 'Database seeded successfully with Admin, Organizers, and Attendees');
  console.log();

  // Test 1: Concurrency Protection Engine
  console.log('--- TEST 1: CONCURRENT BOOKING PROTECTION ENGINE ---');
  console.log('Scenario: 10 concurrent attendees simultaneously request 2 tickets from a limited pool of 10.');
  const org1Auth = await authService.login('organizer1@example.com', 'Password123!');
  const flashEvent = await eventService.createEvent(org1Auth.user, {
    title: 'Flash Concurrency Test Event',
    description: 'High concurrency simulation against limited ticket inventory',
    venue: 'San Francisco Arena',
    location: 'San Francisco, CA',
    eventDate: new Date('2026-11-20T10:00:00Z'),
    salesStartDate: new Date('2026-01-01T00:00:00Z'),
    salesCutoffDate: new Date('2026-11-19T23:59:59Z'),
    ticketTiers: [{ name: 'Flash VIP', price: 100, quantity: 10 }],
  });
  const limitedTierId = flashEvent.ticketTiers[0].id;

  const testUsers = await Promise.all(
    Array.from({ length: 10 }).map((_, idx) =>
      authService.register({
        name: `Tester ${idx + 1}`,
        email: `tester_${idx + 1}_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'ATTENDEE',
      })
    )
  );

  const concurrentRequests = testUsers.map((u) =>
    reservationService
      .createHold(u.user, flashEvent.id, [{ ticketTierId: limitedTierId, quantity: 2 }])
      .then((res) => ({ success: true, res, err: null }))
      .catch((err) => ({ success: false, res: null, err }))
  );

  const results = await Promise.all(concurrentRequests);
  const successList = results.filter((r) => r.success);
  const failureList = results.filter((r) => !r.success);

  assert(successList.length === 5, `Exactly 5 reservations succeeded out of 10 (Actual: ${successList.length})`);
  assert(failureList.length === 5, `Exactly 5 reservations failed safely (Actual: ${failureList.length})`);
  assert(
    failureList.every((f) => f.err?.code === 'INSUFFICIENT_TICKETS'),
    'All failed requests returned INSUFFICIENT_TICKETS error code'
  );

  const finalTier = await ticketTierRepository.findById(limitedTierId);
  assert(finalTier?.availableQuantity === 0, `Available tickets strictly equal to 0 (Actual: ${finalTier?.availableQuantity})`);
  assert(finalTier?.reservedQuantity === 10, `Reserved tickets strictly equal to 10 (Actual: ${finalTier?.reservedQuantity})`);
  assert(finalTier!.availableQuantity >= 0, 'Available quantity never dropped below zero (Overselling prevented)');
  console.log();

  // Test 2: 10-Minute Hold & Expiration Lifecycle
  console.log('--- TEST 2: 10-MINUTE HOLD & EXPIRATION LIFECYCLE ---');
  const attendee = await authService.login('attendee1@example.com', 'Password123!');
  const publicEvents = await eventService.getPublicEvents({});
  const sampleEvent = publicEvents[0];
  const sampleTier = sampleEvent.ticketTiers[0];
  const initialAvail = sampleTier.availableQuantity;

  const hold = await reservationService.createHold(attendee.user, sampleEvent.id, [
    { ticketTierId: sampleTier.id, quantity: 2 },
  ]);

  assert(hold.status === 'ACTIVE', 'Reservation created with status ACTIVE');
  assert(hold.remainingSeconds >= 595, `Countdown initialized to ~600 seconds (Actual: ${hold.remainingSeconds}s)`);
  assert(Boolean(hold.remainingTime.match(/^\d{2}:\d{2}$/)), `Remaining time formatted properly (${hold.remainingTime})`);

  const tierDuringHold = await ticketTierRepository.findById(sampleTier.id);
  assert(tierDuringHold?.availableQuantity === initialAvail - 2, 'Available inventory decremented by 2 during hold');

  // Trigger worker expiration release
  const released = await reservationRepository.releaseExpiredReservation(hold.reservationId);
  assert(released === true, 'Worker released expired reservation inventory');

  const tierAfterRelease = await ticketTierRepository.findById(sampleTier.id);
  assert(tierAfterRelease?.availableQuantity === initialAvail, 'Inventory returned to pool after expiration');

  // Verify Idempotency: calling release again must NOT double-release inventory
  const releasedAgain = await reservationRepository.releaseExpiredReservation(hold.reservationId);
  assert(releasedAgain === false, 'Expiry release is idempotent (second call returned false)');
  const tierAfterSecondRelease = await ticketTierRepository.findById(sampleTier.id);
  assert(tierAfterSecondRelease?.availableQuantity === initialAvail, 'Inventory remained unchanged on duplicate release');
  console.log();

  // Test 3: Transactional Checkout & Asynchronous Mock Payment
  console.log('--- TEST 3: TRANSACTIONAL CHECKOUT & ASYNC PAYMENT ---');
  const checkoutHold = await reservationService.createHold(attendee.user, sampleEvent.id, [
    { ticketTierId: sampleTier.id, quantity: 2 },
  ]);

  const order = await checkoutService.checkout(attendee.user, checkoutHold.reservationId);
  assert(order.status === 'PENDING', 'Order created with status PENDING');
  assert(order.totalAmount === sampleTier.price * 2, `Order total matches reserved tickets amount ($${order.totalAmount})`);

  // Initiate Payment -> PENDING
  const paymentInit = await paymentService.processPayment(attendee.user, {
    orderId: order.id,
    simulateFailure: false,
  });
  assert(paymentInit.status === 'PENDING', 'Payment initially enters PENDING state');

  // Background worker executes payment
  await executePaymentProcessing(order.id, paymentInit.transactionId, false);

  const paymentFinal = await paymentService.getPaymentStatus(paymentInit.transactionId, attendee.user);
  assert(paymentFinal.status === 'SUCCESS', 'Payment transitioned to SUCCESS after asynchronous processing');
  assert(paymentFinal.orderStatus === 'CONFIRMED', 'Order transitioned to CONFIRMED');
  assert(paymentFinal.tickets.length === 2, `Exactly 2 tickets issued (Actual: ${paymentFinal.tickets.length})`);
  assert(paymentFinal.tickets[0].ticketCode.startsWith('TCK-'), `Ticket code generated: ${paymentFinal.tickets[0].ticketCode}`);

  // Test Payment Failure Case
  const failHold = await reservationService.createHold(attendee.user, sampleEvent.id, [
    { ticketTierId: sampleTier.id, quantity: 1 },
  ]);
  const failOrder = await checkoutService.checkout(attendee.user, failHold.reservationId);
  const failPayment = await paymentService.processPayment(attendee.user, {
    orderId: failOrder.id,
    simulateFailure: true,
  });
  await executePaymentProcessing(failOrder.id, failPayment.transactionId, true);
  const failPaymentFinal = await paymentService.getPaymentStatus(failPayment.transactionId, attendee.user);
  assert(failPaymentFinal.status === 'FAILED', 'Simulated failed payment properly marked FAILED');
  assert(failPaymentFinal.orderStatus === 'FAILED', 'Order marked FAILED and reservation released');
  console.log();

  // Test 4: Multi-Tenant Isolation & Security
  console.log('--- TEST 4: MULTI-TENANT ISOLATION ---');
  const org2Auth = await authService.login('organizer2@example.com', 'Password123!');
  const adminAuth = await authService.login('admin@example.com', 'Password123!');

  // Org 2 attempts to modify Org 1's event
  let tenantViolationCaught = false;
  try {
    await eventService.updateEvent(org2Auth.user, flashEvent.id, { title: 'Illegally Updated Title' });
  } catch (err: any) {
    tenantViolationCaught = err.message.includes('Tenant') || err.code === 'TENANT_VIOLATION' || err.statusCode === 403;
  }
  assert(tenantViolationCaught, 'Tenant Isolation Violation: Organizer 2 rejected when attempting to edit Organizer 1 event');

  // Org 2 attempts to add ticket tier to Org 1's event
  let tierTenantViolationCaught = false;
  try {
    await eventService.addTicketTier(org2Auth.user, flashEvent.id, { name: 'Illegal Tier', price: 10, quantity: 5 });
  } catch (err: any) {
    tierTenantViolationCaught = err.message.includes('Tenant') || err.statusCode === 403;
  }
  assert(tierTenantViolationCaught, 'Tenant Isolation Violation: Organizer 2 rejected when adding tier to Organizer 1 event');

  // Org 2 attempts to read Org 1's analytics
  let analyticsTenantViolationCaught = false;
  try {
    await analyticsService.getOrganizerAnalytics(org2Auth.user, flashEvent.id);
  } catch (err: any) {
    analyticsTenantViolationCaught = err.message.includes('Tenant') || err.statusCode === 403;
  }
  assert(analyticsTenantViolationCaught, 'Tenant Isolation Violation: Organizer 2 rejected when querying Organizer 1 analytics');

  // Admin global access
  const adminUpdate = await eventService.updateEvent(adminAuth.user, flashEvent.id, {
    title: 'Admin Moderated Title',
  });
  assert(adminUpdate.title === 'Admin Moderated Title', 'Admin possesses global access to manage and moderate events');
  console.log();

  console.log('======================================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
