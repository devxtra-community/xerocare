# Xerocare Backend Services - Architecture & Integration Guide

Welcome to the Xerocare Backend Documentation Suite. This guide provides a comprehensive overview of the backend services, database architectures, communication topologies, and event choreography.

---

## 1. System Topology Overview

Xerocare's backend is a microservices-based monorepo. It comprises five distinct Node.js/TypeScript Express services communicating via synchronous REST APIs (proxied or direct) and asynchronous event-driven queues (RabbitMQ), with Redis acting as a shared cache layer for specific service metrics and data aggregation.

```mermaid
graph TD
    Client[Web & Mobile Clients]
    Gateway[API Gateway - Port 3001]
    Redis[(Redis Cache - Port 6379)]
    Rabbit[RabbitMQ Broker - Port 5672]

    subgraph Service Layer
        EmpService[Employee Service - Port 3002]
        CRMService[CRM Service - Port 3005]
        BillService[Billing Service - Port 3004]
        InvService[Vendor & Inventory Service - Port 3003]
    end

    subgraph Data Stores
        EmpDB[(PostgreSQL: Employees)]
        CRMDB_SQL[(PostgreSQL: Customers)]
        CRMDB_NOSQL[(MongoDB: Leads)]
        BillDB[(PostgreSQL: Ledger)]
        InvDB[(PostgreSQL: Warehouse)]
    end

    Client -->|REST & WebSockets| Gateway
    Gateway -->|HTTP Proxy & Aggregation| EmpService
    Gateway -->|HTTP Proxy & Aggregation| CRMService
    Gateway -->|HTTP Proxy & Aggregation| BillService
    Gateway -->|HTTP Proxy & Aggregation| InvService
    Gateway -.->|Read/Write Session Cache| Redis

    %% Events communication
    BillService -->|Publish Allocations| Rabbit
    Rabbit -->|Consume & Idempotent Update| InvService
    CRMService -->|Publish Customer Updates| Rabbit
    Rabbit -->|Consume & Update Redis| Gateway

    %% Databases
    EmpService --> EmpDB
    CRMService --> CRMDB_SQL
    CRMService --> CRMDB_NOSQL
    BillService --> BillDB
    InvService --> InvDB

    classDef main fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef db fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef msg fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;

    class Gateway,EmpService,CRMService,BillService,InvService main;
    class EmpDB,CRMDB_SQL,CRMDB_NOSQL,BillDB,InvDB,Redis db;
    class Rabbit msg;
```

---

## 2. Directory Layout & Monorepo Structure

The backend source code resides under the `/backend/` path of the workspace:

```text
backend/
├── api_gateway/            # Routing, rate limiting, and invoice aggregation controller
├── employee_service/       # Authentication, HR, leave requests, and payroll calculations
├── crm_service/            # Sales leads management (MongoDB) and customer directories (PostgreSQL)
├── billing_service/        # Ledger tracking, quoting, contract adjustments, and pricing calculations
└── ven_inv_service/        # RFQ logistics, purchase logs, lot receipt, and serial allocations
```

Each service follows a consistent project organization:

- `src/config/`: Data sources, log configurations, queue links, and boot options.
- `src/entities/` / `src/models/`: Database schemas (TypeORM Postgres entities or Mongoose Mongo models).
- `src/repositories/`: Data access layers isolating SQL queries.
- `src/services/`: Pure business logic computations.
- `src/controllers/`: HTTP payload unpacking, validation, and API status wrappers.
- `src/routes/`: Router paths mapping endpoints to controller methods.
- `src/middlewares/`: Auth token decoding, role enforcement, and input parsers.

---

## 3. Global Database Topology

The services isolate state using separate databases. This prevents schema lockups and ensures database scalability:

| Database Instance | Service owner           | Technology           | Key Records / Entities                                                                                                              |
| :---------------- | :---------------------- | :------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Employee DB**   | `employee_service`      | PostgreSQL (TypeORM) | Employees, Branch Offices, Leave Applications, Payroll sheets, active login sessions.                                               |
| **CRM SQL DB**    | `crm_service`           | PostgreSQL (TypeORM) | Official customer names, phone, email, and address info.                                                                            |
| **CRM NoSQL DB**  | `crm_service`           | MongoDB (Mongoose)   | Raw sales leads, pipeline history, conversion records.                                                                              |
| **Billing DB**    | `billing_service`       | PostgreSQL (TypeORM) | Quotations, Invoices (supporting billType and serviceTicketId), Usage meters, Payment ledger books, product allocations, templates. |
| **Inventory DB**  | `ven_inv_service`       | PostgreSQL (TypeORM) | Products (machines with serials), Spare parts, Warehouses, Lots, RFQs, Vendors, Service Tickets, Service Ticket Items.              |
| **Shared Cache**  | _Shared_ (Gateway, Inv) | Redis                | Active session tokens, customer name/contact cache, model stock counters.                                                           |

---

## 4. Cross-Service Event Choreography (RabbitMQ)

To avoid synchronous blocking, services publish events to RabbitMQ exchanges. Consumers in other services process these messages asynchronously.

### A. Customer Data Synchronization

- **Exchange**: `crm.customer.events` (Topic)
- **Routing Key**: `customer.updated`
- **Flow**:
  1. An employee updates a customer profile via `crm_service` (`CustomerService.updateCustomer`).
  2. `crm_service` publishes `publishCustomerUpdated({ id, name })`.
  3. `api_gateway` consumes this event and updates its local Redis cache (`customer:{id}:name`) so subsequent invoice aggregates do not need to perform HTTP requests to `crm_service`.

### B. Inventory Allocations & Reduction

- **Exchange**: `inventory.events` (Topic)
- **Flow**:
  1. An invoice is converted to an active transaction in `billing_service`.
  2. `billing_service` publishes events:
     - `inventory.product.allocate`: Payload containing invoice items and barcode serials.
     - `inventory.sparepart.reduce`: Payload containing spare part IDs and quantities to deduct.
  3. `ven_inv_service` workers consume these events:
     - `productAllocationWorker`: Tracks items in the transactional database. It logs processed IDs in the `processed_invoice_items` table to ensure **idempotency** (preventing duplicate item allocations if RabbitMQ retries the delivery).
     - `sparePartReductionWorker`: Deducts physical quantities in the warehouse and updates stock levels in Postgres and Redis caches.
     - `productStatusUpdateWorker`: Watches invoice billing conversions to change physical machine status flags (e.g. from `IN_STOCK` to `LEASED` or `SALE` or `RETURNED`).

### C. Service Management Billing Callbacks & Alerts

- **Quotation Callback Endpoint**:
  - **HTTP Path**: `PATCH /service/tickets/:id/quotation-link` (invoked by `billing_service` inside `createServiceQuotation` workflow).
  - **Function**: Updates `ServiceTicket` with the newly generated `serviceQuotationId` and transitions status to `DIAGNOSED` / `QUOTED`.
- **Manager Notifications**:
  - **In-App Alerts Routing Key**: `notification.in_app.request`
  - **Email Alerts Routing Key**: `notification.email.request`
  - **Flow**:
    1. During diagnostics, if spare parts stock levels drop below the threshold ($\le$ 5) or custom unregistered parts are requested, `ven_inv_service` dispatches manager alerts.
    2. During contract copy limit violations, `billing_service` cron triggers an email request to the branch manager.

---

## 5. Environment Variables & Ports Configuration

The following parameters must be configured in each service's `.env` configuration file:

```env
# API Gateway (Port 3001)
PORT=3001
ACCESS_SECRET=your_jwt_access_secret_key
REDIS_URL=redis://localhost:6379
EMPLOYEE_SERVICE_URL=http://localhost:3002
VENDOR_SERVICE_URL=http://localhost:3003
BILLING_SERVICE_URL=http://localhost:3004
CRM_SERVICE_URL=http://localhost:3005

# Employee Service (Port 3002)
PORT=3002
EMPLOYEE_DATABASE_URL=postgres://user:pass@localhost:5432/employee_db
ACCESS_SECRET=your_jwt_access_secret_key
REFRESH_SECRET=your_jwt_refresh_secret_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Vendor & Inventory Service (Port 3003)
PORT=3003
VENDOR_DATABASE_URL=postgres://user:pass@localhost:5432/inventory_db
RABBITMQ_URL=amqp://localhost:5672
REDIS_URL=redis://localhost:6379

# Billing Service (Port 3004)
PORT=3004
BILLING_DATABASE_URL=postgres://user:pass@localhost:5432/billing_db
CRM_SERVICE_URL=http://localhost:3005
EMPLOYEE_SERVICE_URL=http://localhost:3002
VENDOR_SERVICE_URL=http://localhost:3003
RABBITMQ_URL=amqp://localhost:5672

# CRM Service (Port 3005)
PORT=3005
CRM_DATABASE_URL=postgres://user:pass@localhost:5432/crm_db
CRM_MONGO_URI=mongodb://localhost:27017/crm_leads
RABBITMQ_URL=amqp://localhost:5672
```

---

## Navigation & Module Documentation Directories

To review details on specific services, consult their dedicated documentation guides:

- 🛡️ [API Gateway Service Reference](api_gateway.md)
- 👥 [Employee & Auth Service Reference](employee_service.md)
- 🤝 [CRM Leads & Customer Service Reference](crm_service.md)
- 💳 [Billing & Contract Ledger Reference](billing_service.md)
- 📦 [Vendor, Inventory & RFQ Reference](vendor_inventory_service.md)
