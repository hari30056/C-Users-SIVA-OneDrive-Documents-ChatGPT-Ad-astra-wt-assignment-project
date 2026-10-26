import { seedDatabase } from '../backend/src/utils/seed';
import { authService } from '../backend/src/services/authService';
import { eventService } from '../backend/src/services/eventService';
import { reservationService } from '../backend/src/services/reservationService';
import { ticketTierRepository } from '../backend/src/repositories/ticketTierRepository';

describe('Concurrency & Inventory Protection Engine', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('PREVENTS OVERSELLING: When 10 concurrent users request 2 tickets for a pool of 10, exactly 5 succeed and 5 fail safely', async () => {
    // 1. Organizer logs in and creates a flash sale event with limited inventory
    const organizerAuth = await authService.login('organizer1@example.com', 'Password123!');
    const event = await eventService.createEvent(organizerAuth.user, {
      title: 'Ultra Rare Masterclass (Strict Limit)',
      description: 'Exclusive 10-seat masterclass for testing extreme concurrency',
      venue: 'Private Boardroom',
      location: 'San Francisco, CA',
      eventDate: new Date('2026-11-20T10:00:00Z'),
      salesStartDate: new Date('2026-01-01T00:00:00Z'),
      salesCutoffDate: new Date('2026-11-19T23:59:59Z'),
      ticketTiers: [
        {
          name: 'Flash VIP',
          price: 150.00,
          quantity: 10, // Total inventory is exactly 10 tickets
        },
      ],
    });

    const tierId = event.ticketTiers[0].id;

    // 2. Register 10 distinct simulated attendee users
    const attendees = await Promise.all(
      Array.from({ length: 10 }).map((_, idx) =>
        authService.register({
          name: `Concurrent User ${idx + 1}`,
          email: `concurrent_user_${idx + 1}_${Date.now()}@example.com`,
          password: 'Password123!',
          role: 'ATTENDEE',
        })
      )
    );

    // 3. Fire 10 simultaneous reservation requests at the exact same time
    // Each attendee attempts to reserve 2 tickets. 10 users * 2 = 20 tickets requested (double the pool!)
    const reservationPromises = attendees.map((attendee) =>
      reservationService
        .createHold(attendee.user, event.id, [{ ticketTierId: tierId, quantity: 2 }])
        .then((res) => ({ success: true, reservation: res, error: null }))
        .catch((err) => ({ success: false, reservation: null, error: err }))
    );

    const results = await Promise.all(reservationPromises);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    // 4. Verify exact concurrency invariants
    expect(successful.length).toBe(5);
    expect(failed.length).toBe(5);

    // Check that every failure had INSUFFICIENT_TICKETS error code
    failed.forEach((f) => {
      expect(f.error?.code).toBe('INSUFFICIENT_TICKETS');
    });

    // 5. Inspect database inventory source of truth
    const updatedTier = await ticketTierRepository.findById(tierId);
    expect(updatedTier).not.toBeNull();
    expect(updatedTier!.availableQuantity).toBe(0);
    expect(updatedTier!.reservedQuantity).toBe(10);
    expect(updatedTier!.soldQuantity).toBe(0);
    expect(updatedTier!.availableQuantity).toBeGreaterThanOrEqual(0); // Never negative!
    expect(updatedTier!.reservedQuantity + updatedTier!.availableQuantity).toBe(updatedTier!.totalQuantity);
  });
});
