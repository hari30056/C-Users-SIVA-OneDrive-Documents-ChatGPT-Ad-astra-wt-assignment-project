# Multi-Tenant Event & Ticket Reservation System

A production-quality full-stack web platform built for high-concurrency event ticketing where multiple organizers operate as isolated tenants and attendees can reserve and purchase tickets safely under concurrent booking conditions.

## Live Demo

Open the live application [https://multi-tenant-event-tkt-reservation.vercel.app/](https://multi-tenant-event-tkt-reservation.vercel.app/)

---

## 🌟 Key Features

1. **Multi-Tenancy**: Strict tenant partitioning for event organizers. Organizers can only access and modify their own events, ticket tiers, orders, and analytics. Admins possess global moderation and health access.
2. **PostgreSQL Concurrency Protection**: Zero-overselling guarantee enforced via PostgreSQL transactions, atomic inventory decrements, and `SELECT ... FOR UPDATE` row-level locks.
3. **10-Minute Reservation Holds**: Temporary reservation holds with active countdown timer (`Reservation expires in 09:42`) and BullMQ delayed background worker that automatically and idempotently releases inventory back to the pool if not checked out.
4. **Transactional Checkout Flow**: Active Hold $\to$ Pending Order $\to$ Asynchronous Mock Payment $\to$ Confirmed Order $\to$ Completed Reservation $\to$ Unique Ticket Generation (`TCK-XXXX-YYYY`).
5. **Redis Caching**: Caching for read-heavy public event listings, event details, and ticket availability, with automated invalidation upon inventory mutations.
6. **Asynchronous Mock Payment Gateway**: Configurable payment latency simulation (`PAYMENT_SIMULATION_DELAY`), deterministic testing triggers (simulate failure vs success), and polling status endpoint (`GET /api/payments/:transactionId`).
7. **Analytics Dashboard**: Tenant-isolated organizer performance hub utilizing Recharts for revenue over time, ticket sales velocity, conversion rates, and ticket tier distribution.
8. **1-Click Persona Testing**: Embedded persona switcher allowing instant switching between Admin, Organizer 1, Organizer 2, Attendee 1, and Attendee 2.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Recharts, Axios, Lucide React
- **Backend**: Node.js v20+, TypeScript, Express.js, REST API Architecture, Zod, Helmet, Morgan
- **Database & Concurrency**: PostgreSQL 16, Prisma ORM, `pg` connection pool with raw SQL `SELECT ... FOR UPDATE` row locks
- **Cache & Background Jobs**: Redis 7, BullMQ delayed queues & workers
- **Security & Auth**: JWT authentication, bcrypt/scrypt password hashing, RBAC middleware, Tenant Isolation middleware
- **Containerization**: Docker, Docker Compose

---

## 📂 Project Structure

```
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Prisma relational schema with models, indexes & enums
│   ├── src/
│   │   ├── config/              # Environment, PostgreSQL pool & Redis client
│   │   ├── controllers/         # Express REST controllers
│   │   ├── middleware/          # JWT auth, RBAC, tenant isolation & error handling
│   │   ├── queues/              # BullMQ queue definitions (expiry & payments)
│   │   ├── repositories/        # Data access layer with PostgreSQL row-locking
│   │   ├── routes/              # Modular Express routing
│   │   ├── services/            # Core business logic & reservation engine
│   │   ├── types/               # TypeScript models and interfaces
│   │   ├── utils/               # Error handling, cryptographic helpers & seeding
│   │   ├── workers/             # Background job workers (BullMQ)
│   │   ├── app.ts               # Express application configuration
│   │   └── server.ts            # Server entrypoint and graceful shutdown
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Navbar, EventCard, Countdown, StatusBadge, Footer
│   │   ├── context/             # AuthContext with 1-click persona switching
│   │   ├── pages/               # Public, Attendee, Organizer & Admin pages
│   │   ├── services/            # Axios API client with interceptors
│   │   ├── types/               # Frontend TypeScript interfaces
│   │   ├── App.tsx              # React Router v6 route configuration
│   │   └── main.tsx             # React DOM entrypoint
│   └── package.json
│
├── docs/
│   ├── ARCHITECTURE.md          # Architectural pillars, diagrams & concurrency explanation
│   └── ER-DIAGRAM.md            # Relational database models and Mermaid ER diagram
│
├── postman/
│   └── Multi-Tenant Event Ticketing API.postman_collection.json  # Complete Postman collection
│
├── tests/
│   ├── concurrency.test.ts      # 10-concurrent-user race condition test
│   ├── reservation.test.ts      # 10-minute hold & idempotent expiry test
│   ├── checkout.test.ts         # End-to-end checkout & async payment test
│   ├── tenantIsolation.test.ts  # Tenant isolation & security test
│   └── runTests.ts              # Automated standalone test suite executor
│
├── docker-compose.yml           # PostgreSQL 16 + Redis 7 + Backend + Frontend
└── package.json                 # Monorepo workspace configuration
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `backend/.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/event_ticketing?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret-production-jwt-key-for-demonstration
JWT_EXPIRES_IN=7d
PAYMENT_SIMULATION_DELAY=2000
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:5000/api
```

---

## 🚀 Quick Start & Installation

### Option 1: Local Development with Monorepo Workspaces

```bash
# 1. Install all dependencies across backend and frontend
npm install

# 2. Run the automated backend test suite (Includes concurrency & tenant tests)
npx tsx tests/runTests.ts

# 3. Start the Backend API Server (Seeds database on first boot)
npm --prefix backend run dev

# 4. In a separate terminal, start the Frontend Vite Dev Server
npm --prefix frontend run dev
```

Visit the frontend at **http://localhost:5173** and the backend at **http://localhost:5000/api**.

### Option 2: Docker Compose (PostgreSQL 16 + Redis 7 + Full Stack)

```bash
docker compose up --build
```

---

## 🧪 Pre-Configured Demo Accounts

Use the **Role Switcher** in the top navigation bar to test each persona with 1 click, or sign in manually with password `Password123!`:

| Persona | Email | Role | Permissions |
| :--- | :--- | :--- | :--- |
| **Platform Administrator** | `admin@example.com` | `ADMIN` | Global event moderation, manage tenant status, system health, platform analytics |
| **Organizer 1 (Apex Events)** | `organizer1@example.com` | `ORGANIZER` | Creates and manages Apex events, ticket tiers, orders, and private analytics |
| **Organizer 2 (Pulse Live)** | `organizer2@example.com` | `ORGANIZER` | Creates and manages Pulse events, strictly isolated from Organizer 1 |
| **Attendee 1 (Alice Johnson)** | `attendee1@example.com` | `ATTENDEE` | Browses public events, creates 10-min ticket holds, checks out, views tickets |
| **Attendee 2 (Bob Smith)** | `attendee2@example.com` | `ATTENDEE` | Independent attendee for testing concurrent booking races and payment failure |

---

## 🔒 Concurrency Invariants: How Overselling is Prevented

Under high-traffic situations, multiple attendees frequently attempt to reserve the final available tickets at the exact same millisecond:

```sql
BEGIN;

-- 1. Acquire exclusive lock on target ticket tier row
SELECT id, "availableQuantity", "reservedQuantity", price
FROM "TicketTier"
WHERE id = $1 AND "eventId" = $2
FOR UPDATE;

-- 2. Check inventory invariant
-- IF availableQuantity >= requestedQuantity:
UPDATE "TicketTier"
SET "availableQuantity" = "availableQuantity" - $qty,
    "reservedQuantity" = "reservedQuantity" + $qty,
    "updatedAt" = NOW()
WHERE id = $1;

INSERT INTO "Reservation" (...) VALUES (...);
INSERT INTO "ReservationItem" (...) VALUES (...);

COMMIT;
-- ELSE: ROLLBACK and throw AppError.insufficientTickets()
```

- **Deadlock Prevention**: Multiple requested ticket tiers are sorted by ID prior to lock acquisition.
- **Idempotent 10-Minute Hold Expiry**: BullMQ delayed workers verify the reservation is still `ACTIVE` and `expiresAt <= NOW()` before releasing inventory, ensuring duplicate or delayed job deliveries cannot double-release tickets.

---

## 📊 Automated Test Coverage

Execute the automated test suite with:

```bash
npx tsx tests/runTests.ts
```

Test Results:
- `concurrency.test.ts`: **10 concurrent users simultaneously requesting 2 tickets from a pool of 10**. Exactly 5 succeed and 5 fail safely with `INSUFFICIENT_TICKETS`. Available tickets equal 0 and never drop below zero.
- `reservation.test.ts`: 10-minute hold creation, active countdown, inventory reduction, and idempotent worker release.
- `checkout.test.ts`: Pending order generation, asynchronous mock payment authorization, confirmed order, ticket code issuance (`TCK-XXXX-YYYY`), and failure rollback.
- `tenantIsolation.test.ts`: Rejection of cross-tenant modifications and private analytics queries with `403 Forbidden` (`TENANT_VIOLATION`).

---

## 📮 Postman Collection

Import `postman/Multi-Tenant Event Ticketing API.postman_collection.json` into Postman.

The collection features automated test scripts that populate collection variables (`authToken`, `eventId`, `ticketTierId`, `reservationId`, `orderId`, `transactionId`) and covers:
1. Health & System diagnostics
2. Authentication & registration
3. Public cached event discovery
4. Attendee 10-minute reservation holds
5. Checkout & asynchronous mock payment
6. Organizer tenant management & analytics
7. Edge cases (oversell requests, tenant violations, duplicate payments, simulated declines)
8. Admin platform governance
