# Xerocare ERP - Developer Guide & Onboarding Reference

Welcome to the Xerocare ERP developer guide. This document serves as the master source of truth for onboarding new developers. It covers system architecture, workspace layout, step-by-step setup instructions, authentication flows, core business modules, API references, and deep-dives into complex business logic.

---

## 🗺️ Table of Contents

1. [Global Architecture & Topology](#1-global-architecture--topology)
2. [Workspace Directory Layout](#2-workspace-directory-layout)
3. [Environment Configuration & Build Guide](#3-environment-configuration--build-guide)
4. [Authentication, Sessions & Login Flows](#4-authentication-sessions--login-flows)
5. [Module-by-Module Breakdown & API Routes](#5-module-by-module-breakdown--api-routes)
6. [Complex Business Logics & Formulas](#6-complex-business-logics--formulas)
7. [Database Schema Reference](#7-database-schema-reference)

---

## 1. Global Architecture & Topology

Xerocare is designed as a **distributed microservices monorepo**. Services communicate synchronously via HTTP REST APIs (routed and aggregated through a unified API Gateway) and asynchronously using event choreographies over a **RabbitMQ** message broker. Shared states and sessions are cached in **Redis** to minimize database roundtrips.

```mermaid
graph TD
    Client[Next.js Client - Port 3000]
    Gateway[API Gateway - Port 3001]
    Redis[(Redis Cache - Port 6379)]
    Rabbit[RabbitMQ Broker - Port 5672]

    subgraph Microservices Layer
        EmpService[Employee Service - Port 3002]
        CRMService[CRM Service - Port 3005]
        BillService[Billing Service - Port 3004]
        InvService[Vendor & Inventory Service - Port 3003]
    end

    subgraph Databases
        EmpDB[(PostgreSQL: Employee DB)]
        CRMDB_SQL[(PostgreSQL: CRM SQL DB)]
        CRMDB_NOSQL[(MongoDB: CRM NoSQL DB)]
        BillDB[(PostgreSQL: Billing DB)]
        InvDB[(PostgreSQL: Inventory DB)]
    end

    Client -->|REST & WebSockets| Gateway
    Gateway -->|HTTP Proxy & Aggregation| EmpService
    Gateway -->|HTTP Proxy & Aggregation| CRMService
    Gateway -->|HTTP Proxy & Aggregation| BillService
    Gateway -->|HTTP Proxy & Aggregation| InvService
    Gateway -.->|Session Cache| Redis

    %% RabbitMQ Pub/Sub
    BillService -->|Publish Allocations| Rabbit
    CRMService -->|Publish Customer Updates| Rabbit
    Rabbit -->|Consume & Deduct Inventory| InvService
    Rabbit -->|Consume & Sync Cache| Gateway

    %% Service DB links
    EmpService --> EmpDB
    CRMService --> CRMDB_SQL
    CRMService --> CRMDB_NOSQL
    BillService --> BillDB
    InvService --> InvDB
```

### Communication Protocols & Ports

- **Next.js Web App**: Port `3000` (Vanilla CSS/Tailwind, Axios REST communication)
- **API Gateway**: Port `3001` (Single Entrypoint, Session verification, request proxies, response aggregates)
- **Employee Service**: Port `3002` (Handles auth tokens, staff registries, leaves, payroll)
- **Vendor & Inventory Service**: Port `3003` (Handles parts catalog, serial tracking, RFQs, shipments, service tickets)
- **Billing Service**: Port `3004` (Handles quotations, payment ledgers, active contract metrics, usage billing)
- **CRM Service**: Port `3005` (Handles sales leads and customer metadata)
- **Databases**: PostgreSQL (Port `5432`), MongoDB (Port `27017`), Redis (Port `6379`)
- **Message Broker**: RabbitMQ (Port `5672` for AMQP protocol, Port `15672` for Management Console)

---

## 2. Workspace Directory Layout

Xerocare is managed as a `pnpm` monorepo workspace.

```text
xerocare/
├── backend/
│   ├── api_gateway/          # Express Gateway. Filters JWTs, rate limits, aggregates invoice views
│   ├── employee_service/     # Staff profiles, bcrypt auth logins, magic-links, leave files, payroll
│   ├── crm_service/          # Sales pipelines (Mongoose Leads) + Customer directory (TypeORM Postgres)
│   ├── billing_service/      # Invoices, rentals, CPC, contract rates, excess slabs, payment ledger
│   └── ven_inv_service/      # Shipments (Lots), vendors, RFQs, assets (serials), Service Tickets
├── frontend/
│   ├── app/                  # Next.js App Router folders grouped by roles (admin, hr, manager, employee)
│   ├── components/           # Reusable UI elements, modals, drawers, input fields
│   ├── hooks/                # Custom React hook utilities
│   ├── lib/                  # API client, authorization functions, invoice printers
│   └── services/             # Direct backend-to-frontend api service callers
├── docs/                     # Workflows and system documentation files
├── Dockerfile                # Multi-stage production container assembler
├── docker-compose.yml        # Development/local service stack composer
├── package.json              # Monorepo dependencies & root task scripts
└── pnpm-workspace.yaml       # Monorepo workspaces specifier
```

---

## 3. Environment Configuration & Build Guide

### Prerequisites

1. **Node.js**: v20.x or higher
2. **pnpm**: v10.x or higher (installed via corepack: `corepack enable && corepack prepare pnpm@latest --activate`)
3. **Docker & Docker Compose** (for localized database stack)

### 1. Environment Configuration

Create a `.env` file in the root workspace directory based on the following template:

```env
# API Gateway
PORT=3001
ACCESS_SECRET=your_jwt_access_secret_key
REDIS_URL=redis://localhost:6379
EMPLOYEE_SERVICE_URL=http://localhost:3002
VENDOR_SERVICE_URL=http://localhost:3003
BILLING_SERVICE_URL=http://localhost:3004
CRM_SERVICE_URL=http://localhost:3005

# Employee Service
EMPLOYEE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/employee_db
ACCESS_SECRET=your_jwt_access_secret_key
REFRESH_SECRET=your_jwt_refresh_secret_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Vendor & Inventory Service
VENDOR_DATABASE_URL=postgres://postgres:postgres@localhost:5432/inventory_db
RABBITMQ_URL=amqp://localhost:5672
REDIS_URL=redis://localhost:6379

# Billing Service
BILLING_DATABASE_URL=postgres://postgres:postgres@localhost:5432/billing_db
RABBITMQ_URL=amqp://localhost:5672

# CRM Service
CRM_DATABASE_URL=postgres://postgres:postgres@localhost:5432/crm_db
CRM_MONGO_URI=mongodb://localhost:27017/crm_leads

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2. Local Setup & Execution

1. **Install workspace dependencies**:
   ```bash
   pnpm install
   ```
2. **Launch Databases, Redis & RabbitMQ Stack**:
   ```bash
   docker-compose up -d postgres mongodb redis rabbitmq
   ```
3. **Run in Development Mode**:
   This runs nodemon and ts-node processes across all backend packages concurrently and starts the Next.js dev server:
   ```bash
   pnpm dev
   ```
4. **Linting and Typechecks**:
   ```bash
   pnpm run lint
   pnpm run typecheck
   ```
5. **Build for Production**:
   Compiles Next.js frontend pages and builds TypeScript files to JS (`dist/` folders) in all services:
   ```bash
   pnpm run build
   ```

### 3. Docker Production Deployment

The root-level `Dockerfile` implements a multi-stage Docker build that compiles all backend apps and frontend Next.js pages, outputting a lean production container. It utilizes `PM2` (`ecosystem.config.js`) to launch and monitor all processes concurrently.

- **Build Image**:
  ```bash
  docker build -t xerocare-erp .
  ```
- **Run Cluster**:
  ```bash
  docker-compose up -d
  ```

---

## 4. Authentication, Sessions & Login Flows

Xerocare implements role-based access control with secure two-step login validation.

### A. Two-Step Authentication Flow (2FA)

```mermaid
sequenceDiagram
    autonumber
    Client->>EmployeeService: POST /auth/login (email, password)
    Note over EmployeeService: Verify password hash (bcrypt)
    EmployeeService->>Redis: Generate & save 6-digit OTP (5-min TTL)
    EmployeeService->>SMTP: Dispatch OTP Email to User
    EmployeeService-->>Client: Response (Success, OTP Required)

    Client->>EmployeeService: POST /auth/login/verify (email, otp)
    Note over EmployeeService: Compare OTP with Redis
    EmployeeService->>EmployeeService: Issue JWT access & refresh tokens
    EmployeeService->>EmployeeDB: Log active session (device, OS, IP)
    EmployeeService-->>Client: Set Refresh Cookie & Return AccessToken
```

### B. Passwordless Magic Links

1. **Request**: User requests login via `POST /auth/magic-link`.
2. **Generation**: Server generates a cryptographically signed token containing the user's email, saves it to Redis with a 15-minute TTL, and sends a link (`/magic-login?token=xyz`) to their email.
3. **Verification**: Clicking the link calls `POST /auth/magic-link/verify`. Upon verification, the token is consumed (deleted from Redis) and active session tokens are issued.

### C. Device Session Tracking

Active login refresh tokens are mapped inside the `employee_sessions` database table:

- Captures: `deviceType`, `osName`, `browserName` (parsed from the client `User-Agent`), `ipAddress`, and `lastActiveAt`.
- **Remote Session Invalidation**: Users can fetch active sessions (`GET /auth/sessions`) and delete a specific device's session (`POST /auth/sessions/logout`), which removes the refresh token row. Subsequent refresh calls from that device will fail, triggering an immediate logout.

### D. Next.js Frontend Authentication Handling

The frontend Next.js app protects pages and handles automatic token refreshing:

1. **Next.js Middleware (`middleware.ts`)**:
   Intercepts all routes matching `/admin/:path*`, `/hr/:path*`, `/manager/:path*`, and `/employee/:path*`.
   - Reads the `accessToken` cookie.
   - If missing, redirects to `/login` (or `/adminlogin` for admin pages).
   - Decodes the payload to check user role permissions. If the user tries to access a dashboard outside their role, they are redirected back to their appropriate dashboard home.

2. **Axios Client Interceptor (`lib/api.ts`)**:
   - **Request Interceptor**: Extracts the `accessToken` from `localStorage` and appends it to the `Authorization` header as a Bearer token.
   - **Response Interceptor (401 Handler)**: If the backend returns `401 Unauthorized`:
     - If the error code is `TOKEN_REVOKED` or `TOKEN_INVALID`, it immediately clears local storage and redirects the user to the login screen.
     - Otherwise (token simply expired), it blocks subsequent requests, initiates a token refresh call (`POST /e/auth/refresh` sending the HTTP-only refresh cookie), saves the new access token in `localStorage`, and replays all queued failed requests.

---

## 5. Module-by-Module Breakdown & API Routes

### 👥 Employee Service

Manages personnel logs, leaves of absence, and payroll records.

- **Complex Logic**: Net payroll calculation computes gross salary, base deductions, tax cuts, and active leave penalties during a month.
- **Key API Routes**:
  - `POST /auth/login` | `POST /auth/login/verify` — Two-step verification login.
  - `POST /auth/refresh` — Issue new tokens via refresh cookie.
  - `GET /auth/sessions` | `POST /auth/sessions/logout` — Device session tracker.
  - `POST /employees/create` — Add employee profile and upload scans (e.g. ID proof).
  - `GET /employees/:id` — Details of staff member (Admin/HR/Manager scope).
  - `PUT /employees/:id` — Update roles, job tags, salaries, or branch offices.

### 🤝 CRM Service

Collects potential customer prospects (Leads) and records active customer profiles.

- **Database Dual-Storage**: Leads are recorded inside MongoDB (`crm_leads` collection) to support flexible schema extensions. Converted customer accounts reside in PostgreSQL (`crm_customers` table) for relational integrity with invoicing and service systems.
- **Key API Routes**:
  - `POST /leads` | `GET /leads` — Log and view sales leads.
  - `POST /leads/:id/convert` — Execute Lead-to-Customer conversion engine.
  - `POST /customers` | `GET /customers` — Create and list customer profiles.
  - `PUT /customers/:id` — Edit contact profiles (triggers customer data sync event over RabbitMQ).

### 📦 Vendor & Inventory Service

Manages warehouses, spare parts catalog, machines, RFQs, vendor quotes, and Service Tickets.

- **Key API Routes**:
  - `POST /rfq/` | `POST /rfq/:id/send` — Build and dispatch RFQs to vendor contacts.
  - `POST /rfq/:id/vendor/:vId/quote` — Submit and save bids from vendor bids.
  - `POST /rfq/:id/award/:vId` — Award bid, email losers, and create a lot receipt container.
  - `POST /lots/:id/receiving` | `POST /lots/:id/confirm` — Record shipment receipts, verify damaged items, lock inventories.
  - `POST /products` | `POST /spareparts` — Scan and register items with unique barcode formats (`XC-P-${serial}` or `XC-S-${sku}`).
  - `POST /service/tickets` — Register service tickets (details under Service Management section).

### 💳 Billing & Contract Ledger Service

Manages sales pricing calculations, templates, contract structures, usage billing, and payment books.

- **Key API Routes**:
  - `POST /quotation` — Build a new price estimation quote.
  - `POST /quotation/template` | `POST /quotation/template/:id/assign` — Manage sales template library.
  - `POST /:id/finance-approve-quotation` — Finance team signs off on pricing structures.
  - `POST /:id/convert-to-transaction` — Convert approved quotation into draft transaction.
  - `POST /:id/allocate-machines` — Associate physical serial numbers with contract quotation lines.
  - `POST /:id/activate-contract` — Sign lease; triggers RabbitMQ event to allocate assets.
  - `POST /settlements/generate` — Generate monthly settlements.
  - `PUT /:id/usage` — Input monthly printer copy readings.

### 🛠️ Service Management Module

Tracks breakdowns, repairs, installations, and inspections. Serves as a liaison between Customer, Inventory, CRM, and Billing systems.

```
       [ Help Desk ] ──────> [ Open Ticket / Check Warranty ]
                                         │
                                         v
       [ Technician ] ─────> [ Diagnosis & Request Spare Parts ]
                                         │
        ┌────────────────────────────────┴────────────────────────┐
        ▼ (Free Service Context)                                  ▼ (Chargeable Context)
   [ Auto Approve ]                                         [ Create Billing Quotation ]
        │                                                         │
        │                                                         v
        │                                                   [ Finance Approval ]
        │                                                         │
        │                                                         v
        │                                                   [ Customer Approval ]
        │                                                         │
        └────────────────────────────────┬────────────────────────┘
                                         │
                                         v
       [ Technician ] ─────> [ Perform Repairs & Start Work ]
                                         │
                                         v
       [ Inventory ]  ─────> [ Complete Repair & Auto Deduct Parts ]
```

- **Workflow Step-by-Step**:
  1. **Log Ticket**: Help Desk logs details. Context is checked: RENT, FSMA, SMA, and AMC are marked `FREE_SERVICE`. Leases check billing logs to determine if they are under warranty (`LEASE_UNDER_WARRANTY`) or expired (`LEASE_EXPIRED`). Ad-hoc is marked `OPEN` (chargeable).
  2. **Route Ticket**: Help Desk schedules a technician and date. Status becomes `ASSIGNED`.
  3. **Diagnose**: Technician inspects the printer, records diagnosis, and requests parts.
     - Parts are scoped as `SPARE_PART` or `CUSTOM` (unregistered).
     - If context is Free, parts price is locked to $0.
     - Low stock levels ($\le$ 5) or Custom parts trigger immediate alerts to the Branch Manager.
  4. **Quote**: Technician inputs labor and submits quotation.
     - Free: Auto-approves and transitions to `CUSTOMER_APPROVED`.
     - Chargeable: Dispatches payload to Billing Service (`POST /service-quotation`). Ticket status changes to `WAITING_FINANCE_APPROVAL`. Finance approval updates status to `QUOTED`.
  5. **Customer Approval**: Help Desk contacts the customer. Customer agreement transitions ticket to `CUSTOMER_APPROVED`.
     - **Lead Conversion Hook**: If the ticket is associated with a CRM `leadId` (prospect customer), transition to `CUSTOMER_APPROVED` (or `IN_PROGRESS` for free tickets) automatically converts the CRM Lead to a PostgreSQL Customer and links the new ID back to the ticket.
  6. **Completion**: Technician starts work (`IN_PROGRESS`) and clicks complete (`COMPLETED`).
     - The system deducts the requested spare parts from warehouse stock levels.
     - Generates a monthly sequential completion bill number (`SCB-YYYYMM-XXXX`).

---

## 6. Complex Business Logics & Formulas

### A. The A3 Double-Counting Rule

In commercial printing and leasing, A3 papers are physically double the size of standard A4 papers. To account for toner and wear, all usage billing engines calculate paper consumption as:
$$\text{Effective B\&W Copies} = \text{B\&W A4} + (\text{B\&W A3} \times 2)$$
$$\text{Effective Color Copies} = \text{Color A4} + (\text{Color A3} \times 2)$$
$$\text{Total Usage} = \text{Effective B\&W Copies} + \text{Effective Color Copies}$$

This rule is enforced in `billingCalculationService.ts` before executing rental formula limits or slabs.

### B. Rental Rate Formulas

When generating monthly billing settlements (`settlementService.ts`), the system applies one of five rent models:

1. **`FIXED_LIMIT`**:
   $$\text{Excess B\&W} = \max(0, \text{Effective B\&W} - \text{B\&W Included Limit})$$
   $$\text{Excess Color} = \max(0, \text{Effective Color} - \text{Color Included Limit})$$
   $$\text{Gross Amount} = \text{Base Rent} + (\text{Excess B\&W} \times \text{Excess Rate}) + (\text{Excess Color} \times \text{Excess Rate})$$
2. **`FIXED_COMBO`**:
   Combines B&W and Color into a single usage pool.
   $$\text{Excess Copies} = \max(0, (\text{Effective B\&W} + \text{Effective Color}) - \text{Combined Limit})$$
   $$\text{Gross Amount} = \text{Base Rent} + (\text{Excess Copies} \times \text{Combined Excess Rate})$$
3. **`FIXED_FLAT`**:
   Flat monthly rate, ignoring paper consumption.
   $$\text{Gross Amount} = \text{Monthly Base Rent}$$
4. **`CPC` (Cost Per Copy)**:
   No base rent. Charges every copy printed from page one.
   $$\text{Gross Amount} = (\text{Effective B\&W} \times \text{B\&W Rate}) + (\text{Effective Color} \times \text{Color Rate})$$
5. **`CPC_COMBO`**:
   No base rent. Charges all copies combined against a tiered pricing slab (e.g., first 5k pages at \$0.05, next 5k at \$0.04).

### C. Queue Consumer Idempotency

To prevent double-allocation of printer serials or duplicate spare part deductions due to RabbitMQ network retries, the inventory consumer (`productAllocationWorker.ts`) implements database-level idempotency checks:

1. Every message includes a unique transaction identifier (`invoiceItemId` or `serviceTicketItemId`).
2. The consumer queries the `processed_invoice_items` or `processed_ticket_items` table in the database inside a database transaction block.
3. If the item ID is found, the consumer ignores the message as a duplicate.
4. If not found, the allocation is executed, the item ID is written to the processed table, and the transaction is committed.

### D. Lease Warranty Auto-Validation Logic

When a client requests service for a leased device, the system validates the active contract terms before determining charging models:

- **Tenure Validation**: The system calculates the contract expiration date:
  $$\text{Contract Expiry} = \text{effectiveFrom} + \text{leaseTenureMonths}$$
  If the current date exceeds the expiry date, the warranty is demoted.
- **Volume Limit Validation**:
  $$\text{Total Lifetime Copies} = \text{bwA4} + (\text{bwA3} \times 2) + \text{colorA4} + (\text{colorA3} \times 2)$$
  If the lifetime copies on the machine exceed the `maxCopyLimit` specified in the contract, the warranty is demoted.
- **Outcome**: A ticket for a leased machine defaults to `LEASE_UNDER_WARRANTY` (free parts/labor) if both tenure and volume limits are within contract limits. If either check fails, the ticket is auto-demoted to `LEASE_EXPIRED` (chargeable).

---

## 7. Database Schema Reference

Below is a relational overview of the core entities driving the application:

### Service Ticket (`service_tickets` table)

| Column Name            | Data Type | Constraints   | Description                                                                                                                                                              |
| :--------------------- | :-------- | :------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | `uuid`    | PK            | Unique ticket identifier                                                                                                                                                 |
| `ticketNumber`         | `varchar` | Unique        | E.g. `ST-202606-0032`                                                                                                                                                    |
| `customerId`           | `uuid`    | FK (Nullable) | Linked Customer account in PostgreSQL                                                                                                                                    |
| `leadId`               | `varchar` | FK (Nullable) | Linked Lead in MongoDB                                                                                                                                                   |
| `productId`            | `uuid`    | FK (Nullable) | Linked serial asset                                                                                                                                                      |
| `serviceContext`       | `enum`    | Required      | `RENT`, `LEASE_UNDER_WARRANTY`, `LEASE_EXPIRED`, `FSMA`, `SMA`, `AMC`, `CHARGEABLE`                                                                                      |
| `status`               | `enum`    | Required      | `OPEN`, `FREE_SERVICE`, `ASSIGNED`, `DIAGNOSED`, `WAITING_FINANCE_APPROVAL`, `QUOTED`, `CUSTOMER_APPROVED`, `CUSTOMER_REJECTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `assignedTechnicianId` | `uuid`    | FK (Nullable) | Tech employee account                                                                                                                                                    |
| `serviceQuotationId`   | `uuid`    | FK (Nullable) | Linked quotation record in Billing DB                                                                                                                                    |
| `completionBillNumber` | `varchar` | Nullable      | E.g. `SCB-202606-0012`                                                                                                                                                   |

### Service Ticket Item (`service_ticket_items` table)

| Column Name      | Data Type | Constraints           | Description                             |
| :--------------- | :-------- | :-------------------- | :-------------------------------------- |
| `id`             | `uuid`    | PK                    | Item identifier                         |
| `ticketId`       | `uuid`    | FK                    | Parent service ticket reference         |
| `itemSource`     | `enum`    | Required              | `SPARE_PART` or `CUSTOM`                |
| `sparePartId`    | `uuid`    | FK (Nullable)         | Master catalog SKU reference            |
| `customPartName` | `varchar` | Nullable              | Manual name input                       |
| `quantity`       | `int`     | Default: `1`          | Quantity consumed                       |
| `unitPrice`      | `decimal` | Precision 10, scale 2 | Priced at $0 if service context is free |
| `isFree`         | `boolean` | Default: `false`      | Zero-price override flag                |

### Active Device Session (`employee_sessions` table)

| Column Name    | Data Type   | Constraints | Description                         |
| :------------- | :---------- | :---------- | :---------------------------------- |
| `id`           | `uuid`      | PK          | Session identifier                  |
| `userId`       | `uuid`      | FK          | Associated employee account         |
| `deviceType`   | `varchar`   | Required    | E.g., `Desktop`, `Mobile`           |
| `osName`       | `varchar`   | Required    | E.g., `Linux`, `Windows`, `macOS`   |
| `browserName`  | `varchar`   | Required    | E.g., `Chrome`, `Firefox`, `Safari` |
| `ipAddress`    | `varchar`   | Required    | User IP Address                     |
| `lastActiveAt` | `timestamp` | Required    | Last request activity time          |
| `refreshToken` | `varchar`   | Required    | Secure hashed refresh token value   |
