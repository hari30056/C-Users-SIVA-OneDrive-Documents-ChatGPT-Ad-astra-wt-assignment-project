import { seedDatabase } from '../backend/src/utils/seed';
import { authService } from '../backend/src/services/authService';
import { eventService } from '../backend/src/services/eventService';
import { analyticsService } from '../backend/src/services/analyticsService';

describe('Multi-Tenant Isolation & Role-Based Access Control', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('Strictly isolates tenant data: Organizer 2 cannot edit or access Organizer 1 events', async () => {
    const org1 = await authService.login('organizer1@example.com', 'Password123!');
    const org2 = await authService.login('organizer2@example.com', 'Password123!');
    const admin = await authService.login('admin@example.com', 'Password123!');

    // Org 1 creates an event
    const event = await eventService.createEvent(org1.user, {
      title: 'Org 1 Private Summit',
      description: 'Strictly owned by Organizer 1',
      venue: 'Org 1 Hall',
      location: 'San Francisco, CA',
      eventDate: new Date('2026-11-30T10:00:00Z'),
      salesStartDate: new Date('2026-01-01T00:00:00Z'),
      salesCutoffDate: new Date('2026-11-29T23:59:59Z'),
      ticketTiers: [{ name: 'Member', price: 50, quantity: 20 }],
    });

    // Organizer 2 attempts to modify Organizer 1's event
    await expect(
      eventService.updateEvent(org2.user, event.id, { title: 'Hacked Title By Org 2' })
    ).rejects.toThrow();

    // Organizer 2 attempts to add ticket tiers to Organizer 1's event
    await expect(
      eventService.addTicketTier(org2.user, event.id, {
        name: 'Malicious Tier',
        price: 1,
        quantity: 10,
      })
    ).rejects.toThrow();

    // Organizer 2 attempts to view Organizer 1's private analytics
    await expect(
      analyticsService.getOrganizerAnalytics(org2.user, event.id)
    ).rejects.toThrow();

    // Admin CAN update and moderate any event
    const adminUpdate = await eventService.updateEvent(admin.user, event.id, {
      title: 'Moderated by Platform Admin',
    });
    expect(adminUpdate.title).toBe('Moderated by Platform Admin');
  });
});
