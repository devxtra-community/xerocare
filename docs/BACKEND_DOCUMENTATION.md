# Xerocare Backend Documentation

Welcome to the Xerocare Backend Documentation. This document provides a comprehensive overview of the system architecture, services, and API endpoints.

---

## 🏗️ 1. System Architecture

Xerocare is built using a **Microservices Architecture**. Instead of one giant program, the system is split into smaller, specialized "Services" that talk to each other to keep the business running smoothly.

### Key Components:

- **API Gateway**: The single entry point for all client requests. It handles security, rate limiting, and directs traffic to the correct service.
- **Message Broker (RabbitMQ)**: An internal communication channel that allows services to send messages to each other (e.g., when a customer is updated in CRM, the Billing service is notified).
- **Databases**:
  - **PostgreSQL**: Used for structured data (Employees, Bills, Inventory) using TypeORM.
  - **MongoDB**: Used in CRM for more flexible data storage (Leads, detailed customer history).
- **File Storage**: Handles uploads like profile pictures, ID proofs, and signed contracts.

---

## 🚪 2. API Gateway (The "Front Door")

**Path:** `backend/api_gateway`

The API Gateway is the "front door" of the system. Every request from a user comes here first.

### Key Responsibilities:

- **Routing**: Directing traffic (e.g., `/e` to Employee Service, `/i` to Inventory Service).
- **Security**: Validating JWT tokens and ensuring users have the right "Role" (Admin, Manager, etc.).
- **Rate Limiting**: Preventing automated attacks on login and password reset routes.
- **Audit Logs**: Recording changes to critical documents like invoices.

### Main Redirects:

- `/e/*` ➡️ Employee Service
- `/i/*` ➡️ Vendor & Inventory Service
- `/b/*` ➡️ Billing Service
- `/c/*` ➡️ CRM Service

---

## 👥 3. Employee Service ("Human Resources & Security")

**Path:** `backend/employee_service`

This service handles everything related to staff members and system security.

### Core Functions:

- **Authentication**: Managing logins, passwords, and security.
- **Staff Profiles**: Storing names, roles, branches, and contact info.
- **Leave Management**: Processing vacation and sick leave requests.
- **Payroll**: Calculating and recording salary payments.

### Key Endpoints:

#### Authentication (`/auth`)

- `POST /login`: Initial login with email/password (sends OTP).
- `POST /login/verify`: Verifies the 6-digit OTP code and issues access tokens.
- `POST /magic-link`: Sends a one-click login link to email.
- `GET /me`: Returns details of the currently logged-in user.
- `POST /logout`: Safely exits and clears security cookies.

#### Employee Management (`/employee`)

- `POST /create`: (Admin/HR only) Hire a new employee with profile image and ID proof.
- `GET /`: List all employees.
- `GET /stats`: Summary of staff count and departments.

#### Leave & Payroll

- `/leave-applications`: Create and approve leave requests.
- `/payroll`: Manage salary records.

---

## 💰 4. Billing Service ("Financial Hub")

**Path:** `backend/billing_service`

This is the heartbeat of the company's finances—it handles money, bills, and contracts.

### Core Functions:

- **Quotation Workflow**: Converting a price estimate into an official deal.
- **Contract Management**: Activating and tracking long-term customer agreements.
- **Usage Tracking**: Recording machine meter readings to calculate bills.
- **Automated Billing**: Generating monthly bills automatically via background jobs (Cron).

### Key Endpoints (`/invoices`):

- `POST /quotation`: Create a new price estimate.
- `POST /direct-sale`: Create a final bill immediately (Admin/Manager).
- `POST /:id/activate-contract`: Formally start a contract.
- `PUT /:id/usage`: Update meter readings for a client.
- `GET /stats`: High-level dashboard of revenue and pending tasks.
- `GET /alerts`: Notices for upcoming collections.

---

## 🤝 5. CRM Service ("Customer Memory")

**Path:** `backend/crm_service`

The CRM (Customer Relationship Management) service stores all data about potential and existing clients.

### Core Functions:

- **Leads**: Tracking potential customers before they make a purchase.
- **Customers**: Detailed profiles and history of every person or company we do business with.

### Key Endpoints:

#### Customers (`/customers`)

- `POST /`: Add a new customer.
- `GET /`: List all customers.
- `GET /:id`: View full history and details for a specific customer.

#### Leads (`/leads`)

- `POST /`: Record a new interest/lead.
- `GET /`: List and filter potential business opportunities.

---

## 📦 6. Vendor & Inventory Service ("Operations")

**Path:** `backend/ven_inv_service`

This service manages all physical items, warehouse stock, and the vendors we buy from.

### Core Functions:

- **Inventory Tracking**: Knowing exactly how many machines or parts are in which warehouse.
- **Product Catalog**: Managing descriptions, images, and base prices.
- **Purchase Orders (RFQ)**: Handling requests for quotations from vendors.
- **Service Tickets**: Managing repair and maintenance requests.

### Key Endpoints:

- `/products`: Manage the catalog of items we sell.
- `/inventory`: Track current stock levels and movements.
- `/service/tickets`: Create and manage machine repair tasks.
- `/vendors`: Manage supplier contact information.
- `/warehouses`: Tracking physical storage locations.

---

## 🔄 7. Key System Workflows

### The Login Process

1. User submits Email/Password.
2. System validates and sends a 6-digit **OTP** to the user's email.
3. User submits the OTP.
4. System issues an **Access Token** (short-lived) and a **Refresh Token** (long-lived) for security.

### From Deal to Invoice

1. **Quotation**: A salesperson creates a price estimate.
2. **Approval**: An employee (manager/finance) approves the deal.
3. **Machine Allocation**: Specific serial-numbered machines are assigned to the deal.
4. **Activation**: The contract is formally started, and the first bill is generated.

### Automated Reminders

The system has background "Workers" that wake up every day to:

- Check for contracts about to expire.
- Check for bills that are due for collection.
- Send email notifications to the relevant staff or customers.

---

## 🛠️ 8. Tech Stack Summary

- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (main), MongoDB (flexible data)
- **Messaging**: RabbitMQ
- **Logging**: Winston
- **Validation**: Joi / Class-validator
- **Security**: JWT, Argon2 (password hashing), Cookie-based sessions
