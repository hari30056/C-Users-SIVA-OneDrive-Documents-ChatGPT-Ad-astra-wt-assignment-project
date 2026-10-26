# System Architecture Documentation

This document describes the high-level architecture, multi-tenant isolation, concurrency control, 10-minute hold engine, and asynchronous mock payment processing in the **Multi-Tenant Event & Ticket Reservation System**.

---

## 1. High-Level Architecture Overview

The system follows a clean, decoupled n-tier architecture designed for horizontal scalability, zero-overselling inventory protection, and strict tenant partitioning.

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer"]
        SPA["React + TypeScript SPA (Vite, Tailwind, Recharts)"]
    end

    subgraph APILayer ["API & Security Gateway (Express.js)"]
        RateLimit["Rate Limiter & Helmet"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
        TenantGuard["Tenant Isolation Middleware"]
        Controller["REST Controllers"]
    end

    subgraph ServiceLayer ["Service Layer"]
        EventService["Event Service"]
        ResEngine["Reservation Concurrency Engine"]
        CheckoutService["Checkout Service"]
        PaymentService["Payment Service"]
        AnalyticsService["Analytics Service"]
    end

    subgraph CacheAndQueues ["Redis & Asynchronous Queues"]
        RedisCache[("Redis 7 Cache (Read Heavy)")]
        BullMQExpiry["BullMQ: reservation-expiry queue"]
        BullMQPayment["BullMQ: payment-processing queue"]
    end

    subgraph BackgroundWorkers ["Background Worker Process"]
        WorkerExpiry["10-Min Expiry Worker (Idempotent Release)"]
        WorkerPayment["Mock Gateway Payment Worker (Simulated Latency)"]
    end

    subgraph StorageLayer ["Transactional Persistence"]
        Postgres[("PostgreSQL 16 (Source of Truth) - SELECT FOR UPDATE Row Locks")]
    end

    SPA -->|HTTPS / REST API| RateLimit
    RateLimit --> AuthMiddleware
    AuthMiddleware --> TenantGuard
    TenantGuard --> Controller
    Controller --> ServiceLayer

    EventService <-->|Get / Invalidate| RedisCache
    EventService --> StorageLayer

    ResEngine -->|Enqueue 10-min delayed job| BullMQExpiry
    ResEngine -->|SELECT FOR UPDATE Transaction| StorageLayer

    CheckoutService --> StorageLayer
    PaymentService -->|Enqueue async payment job| BullMQPayment
    PaymentService --> StorageLayer

    BullMQExpiry --> WorkerExpiry
    WorkerExpiry -->|ACID Release Transaction| StorageLayer
    WorkerExpiry -->|Invalidate Event Cache| RedisCache

    BullMQPayment --> WorkerPayment
    WorkerPayment -->|Confirm Order & Issue Tickets| StorageLayer
    WorkerPayment -->|Invalidate Analytics Cache| RedisCache
```

---

## 2. Concurrency Protection Strategy

Under high-traffic situations (e.g., flash sales, celebrity concerts), multiple attendees frequently attempt to reserve the final available tickets at the exact same millisecond. 

### Why Frontend Checks & Stale Redis Inventory Fail
- **Frontend checks** are purely visual and cannot be trusted.
- **Redis inventory caches** are subject to race conditions and eventual consistency lag unless complex distributed Lua lock orchestration is used.
- **Unprotected SQL** (`SELECT available_quantity ... UPDATE ...`) produces dirty reads and catastrophic overselling under concurrent transactions.

### The PostgreSQL `SELECT FOR UPDATE` Row Locking Solution
The system establishes **PostgreSQL as the single source of truth** for all inventory mutations.

1. **Deadlock-Free Lock Ordering**: When a reservation hold contains multiple ticket tiers, the IDs are sorted lexicographically before acquiring locks:
   $$\text{sortedTierIds} = \text{tiers.sort}((a, b) \Rightarrow a.\text{id.localeCompare}(b.\text{id}))$$
2. **Row-Level Mutex**: The database transaction starts with:
   ```sql
   BEGIN;
   SELECT id, "availableQuantity", "reservedQuantity", price
   FROM "TicketTier"
   WHERE id = $1 AND "eventId" = $2
   FOR UPDATE;
   ```
3. **Pessimistic Invariant Verification**: Because `FOR UPDATE` serializes concurrent transactions requesting the same row, subsequent transactions are blocked until the lock-holding transaction commits.
4. **Atomic Decrement**:
   - If $\text{availableQuantity} \ge \text{requestedQuantity}$:
     ```sql
     UPDATE "TicketTier"
     SET "availableQuantity" = "availableQuantity" - $qty,
         "reservedQuantity" = "reservedQuantity" + $qty,
         "updatedAt" = NOW()
     WHERE id = $1;
     ```
     Inserts `Reservation` and `ReservationItem`, schedules BullMQ delayed expiration job, and commits.
   - If $\text{availableQuantity} < \text{requestedQuantity}$:
     Immediately rolls back with `AppError.insufficientTickets(...)`.

---

## 3. Sequence Diagram: Concurrent Reservation Race Condition

The following sequence diagram details how two attendees competing for the final remaining ticket are handled:

```mermaid
sequenceDiagram
    autonumber
    actor AttendeeA as Attendee A (Fast)
    actor AttendeeB as Attendee B (Simultaneous)
    participant API as Reservation API
    participant PG as PostgreSQL (Row Lock)
    participant BullMQ as BullMQ Delayed Queue
    participant Redis as Redis Cache

    Note over PG: TicketTier VIP has availableQuantity = 1

    AttendeeA->>API: POST /api/events/:id/reservations (Qty = 1)
    AttendeeB->>API: POST /api/events/:id/reservations (Qty = 1)

    API->>PG: BEGIN TRANSACTION A
    API->>PG: BEGIN TRANSACTION B

    API->>PG: TX A: SELECT * FROM "TicketTier" WHERE id = VIP FOR UPDATE;
    Note over PG: TX A acquires exclusive Row Lock on VIP!
    API->>PG: TX B: SELECT * FROM "TicketTier" WHERE id = VIP FOR UPDATE;
    Note over PG: TX B is BLOCKED and waits on TX A lock release...

    Note over PG: TX A verifies: availableQuantity (1) >= requested (1)
    API->>PG: TX A: availableQuantity = 0, reservedQuantity = 1
    API->>PG: TX A: INSERT INTO "Reservation" (status: ACTIVE)
    API->>PG: TX A: COMMIT;
    Note over PG: TX A Commits. Row Lock Released!

    API->>BullMQ: Schedule delayed job: reservation-expiry-{id} (10 minutes)
    API->>Redis: Invalidate event cache
    API-->>AttendeeA: 201 Created (10-min countdown starts)

    Note over PG: TX B unblocks and reads updated row!
    Note over PG: TX B evaluates: availableQuantity = 0 < requested (1)!
    API->>PG: TX B: ROLLBACK;
    API-->>AttendeeB: 409 Conflict: INSUFFICIENT_TICKETS
```

---

## 4. Sequence Diagram: Reservation → Checkout → Payment → Ticket Issuance

```mermaid
sequenceDiagram
    autonumber
    actor Attendee as Attendee
    participant API as API Server
    participant DB as PostgreSQL
    participant Worker as Background Payment Worker
    participant Queue as BullMQ Payment Queue

    Attendee->>API: POST /api/orders (reservationId)
    API->>DB: Lock Reservation FOR UPDATE
    Note over DB: Verify status == ACTIVE & expiresAt > NOW()
    API->>DB: Create Order (status: PENDING)
    API-->>Attendee: 201 Order Created

    Attendee->>API: POST /api/payments/process (orderId)
    API->>DB: Create PaymentTransaction (status: PENDING)
    API->>Queue: Enqueue Job (payment-processing, delay: 2000ms)
    API-->>Attendee: 202 Accepted (Transaction PENDING)

    Note over Attendee,API: Attendee frontend polls /api/payments/:transactionId

    Note over Queue,Worker: Configured simulation delay passes...
    Queue->>Worker: Dispatch payment job to worker
    Worker->>Worker: Simulate mock gateway processing & authorization
    
    Worker->>DB: BEGIN TRANSACTION
    Worker->>DB: Lock Order & Reservation FOR UPDATE
    Worker->>DB: Update PaymentTransaction (status: SUCCESS)
    Worker->>DB: Update Order (status: CONFIRMED)
    Worker->>DB: Update Reservation (status: COMPLETED)
    Worker->>DB: Update TicketTier (reserved - qty, sold + qty)
    Worker->>DB: Generate Individual Tickets with Unique Codes (TCK-XXXX-YYYY)
    Worker->>DB: COMMIT TRANSACTION

    Attendee->>API: Poll GET /api/payments/:transactionId
    API->>DB: Fetch Order & Tickets
    API-->>Attendee: 200 OK (status: SUCCESS, Tickets Issued!)
```

---

## 5. Multi-Tenant Isolation Model

1. **Logical Tenant Scoping**:
   - Each organizer is mapped to a tenant row in the `Organizer` table with a unique `ownerUserId`.
   - All events, ticket tiers, orders, and analytics derive their tenant ownership from `Event.organizerId`.
2. **Server-Side Enforcement**:
   - The `requireTenantEventOwnership` middleware inspects every incoming route mutating or querying private event data.
   - If `req.user.organizerId !== event.organizerId` (and the user is not `ADMIN`), the request is rejected with `403 Forbidden` (`TENANT_VIOLATION`).
3. **Database Level Scoping**:
   - Organizer queries automatically append `WHERE event.organizerId = req.user.organizerId`.
   - Modifying an ID in the URL parameter strictly fails server-side.
