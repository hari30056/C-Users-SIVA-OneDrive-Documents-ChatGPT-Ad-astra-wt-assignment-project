import { seedDatabase } from '../backend/src/utils/seed';
import { authService } from '../backend/src/services/authService';
import { eventService } from '../backend/src/services/eventService';
import { reservationService } from '../backend/src/services/reservationService';
import { reservationRepository } from '../backend/src/repositories/reservationRepository';
import { ticketTierRepository } from '../backend/src/repositories/ticketTierRepository';

describe('Reservation Engine & 10-Minute Hold System', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('Successfully creates a 10-minute hold with countdown and inventory decrement', async () => {
    const attendee = await authService.login('attendee1@example.com', 'Password123!');
    const events = await eventService.getPublicEvents({});
    const event = events[0];
    const tier = event.ticketTiers[0];

    const initialAvailable = tier.availableQuantity;
    const initialReserved = tier.reservedQuantity;

    const reservation = await reservationService.createHold(attendee.user, event.id, [
      { ticketTierId: tier.id, quantity: 2 },
    ]);

    expect(reservation.status).toBe('ACTIVE');
    expect(reservation.items.length).toBe(1);
    expect(reservation.items[0].quantity).toBe(2);
    expect(reservation.remainingSeconds).toBeGreaterThan(590); // ~600 seconds (10 minutes)
    expect(reservation.remainingTime).toMatch(/^\d{2}:\d{2}$/);

    const updatedTier = await ticketTierRepository.findById(tier.id);
    expect(updatedTier!.availableQuantity).toBe(initialAvailable - 2);
    expect(updatedTier!.reservedQuantity).toBe(initialReserved + 2);

    // Cancel reservation and verify inventory restoration
    await reservationService.cancelReservation(reservation.reservationId, attendee.user);
    const restoredTier = await ticketTierRepository.findById(tier.id);
    expect(restoredTier!.availableQuantity).toBe(initialAvailable);
    expect(restoredTier!.reservedQuantity).toBe(initialReserved);
  });

  it('Rejects reservation when requested quantity exceeds available inventory', async () => {
    const attendee = await authService.login('attendee1@example.com', 'Password123!');
    const events = await eventService.getPublicEvents({});
    const event = events[0];
    const tier = event.ticketTiers[0];

    await expect(
      reservationService.createHold(attendee.user, event.id, [
        { ticketTierId: tier.id, quantity: tier.availableQuantity + 999 },
      ])
    ).rejects.toThrow();
  });

  it('Idempotently releases expired reservation inventory', async () => {
    const attendee = await authService.login('attendee2@example.com', 'Password123!');
    const events = await eventService.getPublicEvents({});
    const event = events[0];
    const tier = event.ticketTiers[0];

    const beforeAvail = (await ticketTierRepository.findById(tier.id))!.availableQuantity;

    const res = await reservationService.createHold(attendee.user, event.id, [
      { ticketTierId: tier.id, quantity: 3 },
    ]);

    const duringAvail = (await ticketTierRepository.findById(tier.id))!.availableQuantity;
    expect(duringAvail).toBe(beforeAvail - 3);

    // Trigger expiration release
    const releasedFirstTime = await reservationRepository.releaseExpiredReservation(res.reservationId);
    expect(releasedFirstTime).toBe(true);

    const afterAvail = (await ticketTierRepository.findById(tier.id))!.availableQuantity;
    expect(afterAvail).toBe(beforeAvail);

    // Call release a second time to verify IDEMPOTENCY (must not release inventory twice!)
    const releasedSecondTime = await reservationRepository.releaseExpiredReservation(res.reservationId);
    expect(releasedSecondTime).toBe(false);

    const finalAvail = (await ticketTierRepository.findById(tier.id))!.availableQuantity;
    expect(finalAvail).toBe(beforeAvail);
  });
});
