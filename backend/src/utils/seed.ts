import { userRepository } from '../repositories/userRepository';
import { organizerRepository } from '../repositories/organizerRepository';
import { eventRepository } from '../repositories/eventRepository';
import { ticketTierRepository } from '../repositories/ticketTierRepository';
import { hashPassword } from './cryptoShim';

export const SEED_PASSWORD = 'Password123!';

export const seedDatabase = async (): Promise<void> => {
  const existingAdmin = await userRepository.findByEmail('admin@example.com');
  if (existingAdmin) {
    console.log('🌱 Seed data already initialized.');
    return;
  }

  console.log('🌱 Seeding initial users, organizers, and sample events...');

  const passwordHash = await hashPassword(SEED_PASSWORD);

  // 1. Admin
  await userRepository.create({
    name: 'Platform Administrator',
    email: 'admin@example.com',
    passwordHash,
    role: 'ADMIN',
  });

  // 2. Organizer 1: Apex Events Global
  const orgUser1 = await userRepository.create({
    name: 'Sarah Jenkins',
    email: 'organizer1@example.com',
    passwordHash,
    role: 'ORGANIZER',
  });
  const org1 = await organizerRepository.create({
    organizationName: 'Apex Events Global',
    ownerUserId: orgUser1.id,
    status: 'ACTIVE',
  });

  // 3. Organizer 2: Pulse Live Entertainment
  const orgUser2 = await userRepository.create({
    name: 'Marcus Chen',
    email: 'organizer2@example.com',
    passwordHash,
    role: 'ORGANIZER',
  });
  const org2 = await organizerRepository.create({
    organizationName: 'Pulse Live Entertainment',
    ownerUserId: orgUser2.id,
    status: 'ACTIVE',
  });

  // 4. Attendees
  await userRepository.create({
    name: 'Alice Johnson',
    email: 'attendee1@example.com',
    passwordHash,
    role: 'ATTENDEE',
  });

  await userRepository.create({
    name: 'Bob Smith',
    email: 'attendee2@example.com',
    passwordHash,
    role: 'ATTENDEE',
  });

  // 5. Sample Events & Ticket Tiers

  // Event 1: Tech Conference 2026 (Organizer 1)
  const event1 = await eventRepository.create({
    organizerId: org1.id,
    title: 'Global Tech Innovators Summit 2026',
    description: 'The premier conference for AI, distributed systems, and cloud architecture. Keynotes from industry leaders, hands-on masterclasses, and networking lounges.',
    venue: 'Moscone Convention Center',
    location: 'San Francisco, CA',
    category: 'Technology',
    eventDate: new Date('2026-11-15T09:00:00Z'),
    salesStartDate: new Date('2026-01-01T00:00:00Z'),
    salesCutoffDate: new Date('2026-11-14T23:59:59Z'),
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
  });

  await ticketTierRepository.create({
    eventId: event1.id,
    name: 'VIP All-Access',
    description: 'Includes front-row seating, backstage speaker meet & greet, and exclusive networking dinner.',
    price: 499.00,
    totalQuantity: 25,
  });

  await ticketTierRepository.create({
    eventId: event1.id,
    name: 'Standard Conference Pass',
    description: 'Full access to all keynote stages, technical workshops, and exhibition hall.',
    price: 199.00,
    totalQuantity: 150,
  });

  await ticketTierRepository.create({
    eventId: event1.id,
    name: 'Student & Academic Pass',
    description: 'Discounted admission for students and researchers with valid ID.',
    price: 79.00,
    totalQuantity: 50,
  });

  // Event 2: Startup Pitch & Venture Summit (Organizer 1)
  const event2 = await eventRepository.create({
    organizerId: org1.id,
    title: 'Silicon Valley Startup Venture Summit',
    description: 'Top 50 seed & Series A startups pitch live in front of leading tier-1 venture capitalists and angel investors.',
    venue: 'Palo Alto Tech Pavilion',
    location: 'Palo Alto, CA',
    category: 'Business',
    eventDate: new Date('2026-12-05T10:00:00Z'),
    salesStartDate: new Date('2026-01-01T00:00:00Z'),
    salesCutoffDate: new Date('2026-12-04T23:59:59Z'),
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80',
  });

  await ticketTierRepository.create({
    eventId: event2.id,
    name: 'Founder Pitch Pass',
    description: 'Includes 5-minute mainstage pitch slot and 1-on-1 VC speed dating.',
    price: 349.00,
    totalQuantity: 30,
  });

  await ticketTierRepository.create({
    eventId: event2.id,
    name: 'General Investor & Attendee Pass',
    description: 'Access to pitch sessions, showcase booths, and open networking mixer.',
    price: 129.00,
    totalQuantity: 100,
  });

  // Event 3: Neon Nights Music & Arts Festival (Organizer 2)
  const event3 = await eventRepository.create({
    organizerId: org2.id,
    title: 'Neon Nights Music & Arts Festival',
    description: 'A 2-day outdoor celebration featuring electronic, indie rock, live art installations, and curated gourmet food trucks.',
    venue: 'Waterfront Amphitheater',
    location: 'Austin, TX',
    category: 'Music',
    eventDate: new Date('2026-11-28T16:00:00Z'),
    salesStartDate: new Date('2026-01-01T00:00:00Z'),
    salesCutoffDate: new Date('2026-11-28T12:00:00Z'),
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
  });

  await ticketTierRepository.create({
    eventId: event3.id,
    name: 'VIP Sky Deck & Open Bar',
    description: 'Elevated viewing platform, dedicated VIP restrooms, complimentary drinks and merchandise pack.',
    price: 299.00,
    totalQuantity: 50,
  });

  await ticketTierRepository.create({
    eventId: event3.id,
    name: 'Weekend General Admission',
    description: 'Two-day general admission wristband granting access to all 4 performance stages.',
    price: 139.00,
    totalQuantity: 300,
  });

  await ticketTierRepository.create({
    eventId: event3.id,
    name: 'Single Day Pass (Saturday)',
    description: 'Saturday single day festival access.',
    price: 79.00,
    totalQuantity: 150,
  });

  // Event 4: National Inter-University Cultural Fest (Organizer 2)
  const event4 = await eventRepository.create({
    organizerId: org2.id,
    title: 'National Inter-University Cultural Fest 2026',
    description: 'The largest collegiate celebration of dance, drama, battle of the bands, literary arts, and fashion showcases.',
    venue: 'Central Arena & Open Grounds',
    location: 'Chicago, IL',
    category: 'Festival',
    eventDate: new Date('2026-12-18T11:00:00Z'),
    salesStartDate: new Date('2026-01-01T00:00:00Z'),
    salesCutoffDate: new Date('2026-12-17T23:59:59Z'),
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
  });

  await ticketTierRepository.create({
    eventId: event4.id,
    name: 'All-Events Delegate Pass',
    description: 'Access to participate and view all dance, music, and dramatic competitions.',
    price: 49.00,
    totalQuantity: 200,
  });

  await ticketTierRepository.create({
    eventId: event4.id,
    name: 'Star Night Pro-Show Pass',
    description: 'Entry to the concluding celebrity concert night.',
    price: 35.00,
    totalQuantity: 400,
  });

  console.log('✅ Seeding complete!');
  console.log('   Admin: admin@example.com / Password: Password123!');
  console.log('   Organizer 1: organizer1@example.com / Password: Password123!');
  console.log('   Organizer 2: organizer2@example.com / Password: Password123!');
  console.log('   Attendee 1: attendee1@example.com / Password: Password123!');
  console.log('   Attendee 2: attendee2@example.com / Password: Password123!');
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
