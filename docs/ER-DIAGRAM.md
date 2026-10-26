# Database Entity-Relationship (ER) Diagram

This document specifies the relational database schema, integrity constraints, indexes, and entity-relationship models for the **Multi-Tenant Event & Ticket Reservation System**.

---

## 1. Relational ER Diagram

```mermaid
erDiagram
    User ||--o| Organizer : "owns (1:1)"
    User ||--o{ Reservation : "places (1:N)"
    User ||--o{ Order : "purchases (1:N)"

    Organizer ||--o{ Event : "creates (1:N)"

    Event ||--o{ TicketTier : "offers (1:N)"
    Event ||--o{ Reservation : "contains holds (1:N)"
    Event ||--o{ Order : "generates orders (1:N)"

    TicketTier ||--o{ ReservationItem : "allocated in (1:N)"
    TicketTier ||--o{ OrderItem : "purchased in (1:N)"
    TicketTier ||--o{ Ticket : "specifies (1:N)"

    Reservation ||--|{ ReservationItem : "contains (1:N)"
    Reservation ||--o| Order : "converts to (1:1)"

    Order ||--|{ OrderItem : "includes (1:N)"
    Order ||--o{ PaymentTransaction : "processed through (1:N)"
    Order ||--o{ Ticket : "issues (1:N)"

    User {
        string id PK "UUID"
        string name "User Full Name"
        string email UK "Unique Email"
        string passwordHash "Bcrypt / Scrypt Hash"
        UserRole role "ADMIN | ORGANIZER | ATTENDEE"
        timestamp createdAt
        timestamp updatedAt
    }

    Organizer {
        string id PK "UUID (Tenant ID)"
        string organizationName "Organization Name"
        string ownerUserId FK "Unique FK to User"
        OrganizerStatus status "ACTIVE | INACTIVE | SUSPENDED"
        timestamp createdAt
        timestamp updatedAt
    }

    Event {
        string id PK "UUID"
        string organizerId FK "FK to Organizer"
        string title "Event Title"
        string description "Text"
        string venue "Venue Name"
        string location "City, State/Country"
        string category "Category Tag"
        timestamp eventDate "Date of Event"
        timestamp salesStartDate "Sales Open Date"
        timestamp salesCutoffDate "Sales Cutoff Date"
        EventStatus status "DRAFT | PUBLISHED | CANCELLED | COMPLETED"
        string imageUrl "Nullable Banner URL"
        timestamp createdAt
        timestamp updatedAt
    }

    TicketTier {
        string id PK "UUID"
        string eventId FK "FK to Event"
        string name "Tier Name (e.g. VIP, GA)"
        string description "Tier Benefits"
        decimal price "Ticket Price"
        int totalQuantity "Total Available Invariant"
        int availableQuantity "Immediate Purchase Inventory"
        int reservedQuantity "Held under 10-Min Locks"
        int soldQuantity "Officially Sold"
        timestamp createdAt
        timestamp updatedAt
    }

    Reservation {
        string id PK "UUID"
        string userId FK "FK to User"
        string eventId FK "FK to Event"
        ReservationStatus status "ACTIVE | EXPIRED | COMPLETED | CANCELLED"
        timestamp expiresAt "Hold Expiration Timestamp (NOW + 10m)"
        timestamp createdAt
        timestamp updatedAt
    }

    ReservationItem {
        string id PK "UUID"
        string reservationId FK "FK to Reservation"
        string ticketTierId FK "FK to TicketTier"
        int quantity "Requested Count"
        decimal unitPrice "Locked Price per Unit"
    }

    Order {
        string id PK "UUID"
        string userId FK "FK to User"
        string eventId FK "FK to Event"
        string reservationId UK "Unique FK to Reservation"
        string orderNumber UK "Format: ORD-YYYYMMDD-XXXX"
        decimal subtotal "Items Subtotal"
        decimal totalAmount "Final Total"
        OrderStatus status "PENDING | CONFIRMED | CANCELLED | FAILED"
        timestamp createdAt
        timestamp updatedAt
    }

    OrderItem {
        string id PK "UUID"
        string orderId FK "FK to Order"
        string ticketTierId FK "FK to TicketTier"
        int quantity "Purchased Quantity"
        decimal unitPrice "Snapshot Unit Price"
    }

    PaymentTransaction {
        string id PK "UUID"
        string orderId FK "FK to Order"
        string transactionReference UK "Format: TXN-XXXXXXXX"
        decimal amount "Charged Amount"
        PaymentStatus status "PENDING | SUCCESS | FAILED"
        string gatewayResponse "JSON Gateway Payload"
        timestamp createdAt
        timestamp updatedAt
    }

    Ticket {
        string id PK "UUID"
        string orderId FK "FK to Order"
        string ticketTierId FK "FK to TicketTier"
        string ticketCode UK "Format: TCK-XXXX-YYYY"
        TicketStatus status "ACTIVE | USED | CANCELLED"
        timestamp issuedAt
    }
```

---

## 2. Inventory Invariants & Integrity Constraints

1. **Total Inventory Conservation Formula**:
   $$\text{totalQuantity} = \text{availableQuantity} + \text{reservedQuantity} + \text{soldQuantity}$$
   At no point can this equation be violated.

2. **Non-Negativity Constraint**:
   $$\text{availableQuantity} \ge 0, \quad \text{reservedQuantity} \ge 0, \quad \text{soldQuantity} \ge 0$$
   Enforced via PostgreSQL `CHECK` constraints and `SELECT ... FOR UPDATE` row locking.

3. **Multi-Tenant Scoping**:
   Every event belongs strictly to an `organizerId`. Ticket tiers, reservations, and orders inherit tenant isolation from their corresponding `Event.organizerId`.

4. **10-Minute Hold Expiration Constraint**:
   If $\text{status} = \text{'ACTIVE'}$ and $\text{NOW}() > \text{expiresAt}$, the reservation cannot be converted into an order. Background BullMQ workers execute idempotent releases to restore inventory.

---

## 3. Database Indexes

| Table | Index Columns | Purpose |
| :--- | :--- | :--- |
| `User` | `email` (UNIQUE) | Fast user lookups during authentication |
| `User` | `role` | Role-based queries |
| `Organizer` | `ownerUserId` (UNIQUE) | Tenant ownership mapping |
| `Organizer` | `status` | Tenant activation filtering |
| `Event` | `organizerId` | Fast tenant isolation filtering |
| `Event` | `status`, `eventDate` | Fast public event discovery |
| `TicketTier` | `eventId` | Rapid inventory lookups per event |
| `Reservation` | `userId`, `eventId` | Attendee reservation listing |
| `Reservation` | `status`, `expiresAt` | Worker expiration sweep index |
| `Order` | `userId`, `eventId` | Attendee and Organizer order queries |
| `Order` | `orderNumber` (UNIQUE) | Receipt and tracking lookups |
| `Order` | `reservationId` (UNIQUE) | One-to-one order checkout constraint |
| `PaymentTransaction` | `orderId`, `transactionReference` (UNIQUE) | Gateway reconciliation lookups |
| `Ticket` | `ticketCode` (UNIQUE) | QR/Barcode entry scanning verification |
