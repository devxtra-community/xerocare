# 🛡️ API Gateway Service Reference

The API Gateway is the single entry point for all frontend client communications. It is responsible for routing requests to internal microservices, enforcing rate limits, decoding JWT auth tokens, and coordinating cross-service data aggregation for complex views (such as invoice aggregates).

---

## 1. Proxy Routing Strategy

The Gateway maps prefix paths directly to internal microservices using Axios-based reverse proxying in `app.ts` (`createServiceProxy`). The target headers are updated dynamically to carry the decrypted `Authorization` token when forwarding requests.

```text
/e/*  ---->  Employee & Auth Service (Port 3002)
/i/*  ---->  Vendor & Inventory Service (Port 3003)
/c/*  ---->  CRM & Leads Service (Port 3005)
/b/*  ---->  Billing & Contracts Service (Port 3004) *
```

_\* Note: `/b/invoices/_`and`/b/direct-sale` routes are intercepted and processed locally by the Gateway for invoice aggregation.\*

---

## 2. Security Middlewares & Rate Limiting

### A. CORS Configuration

CORS is restricted to allowed origins specified in environment variables (e.g. `http://localhost:3000` for frontend web) and supports credentials (cookies) to facilitate refresh token storage.

### B. Route-Specific Rate Limiters

To protect the system from brute-force attempts on sensitive endpoints, the Gateway defines specific limit windows in `src/app.ts`:

- **Auth Rate Limiter**: Maximum of **5 login/OTP requests per 15 minutes** for routes:
  - `/e/auth/login`
  - `/e/auth/login/verify`
  - `/e/auth/magic-link`
- **General Rate Limiter**: Maximum of **100 requests per 15 minutes** for all other API gateways.

### C. JWT Access Token Middleware

- **Location**: `src/middleware/authMiddleware.ts`
- **Logic**:
  1. Reads the `Authorization` header and splits on `'Bearer '` to extract the JWT.
  2. Invokes `verifyAccessToken(token)` using the shared `ACCESS_SECRET`.
  3. If expired, returns a `TOKEN_EXPIRED` (401) error.
  4. If invalid, returns a `TOKEN_INVALID` (401) error.
  5. If valid, attaches the decoded payload (`userId`, `role`, `branchId`) to `req.user` and calls `next()`.

---

## 3. Local Invoice Aggregation Engine

To show cohesive invoice views in the frontend, the Gateway intercepts all invoice-related routes and runs `invoiceAggregationService.ts` to fetch and combine raw invoice data from `billing_service` with relational metadata from `employee_service`, `crm_service`, and `ven_inv_service`.

### A. Caching Optimization with Redis

To minimize microservice HTTP roundtrips, the service implements a Redis-based cache for customer metadata:

- Cache keys: `customer:{id}:name`, `customer:{id}:phone`, `customer:{id}:email`, `customer:{id}:location`.
- Cache TTL (Time-to-Live): **1 hour**.
- Write pattern: If a cache miss occurs, the service queries `crm_service` over HTTP, saves the result into Redis, and returns it. If a customer is updated, the CRM service emits `customer.updated` to invalidate this cache.

### B. Aggregation Endpoints (`/b/invoices/*`)

#### 1. `GET /b/invoices`

- **Permissions**: `ADMIN`, `FINANCE`, `MANAGER`, `EMPLOYEE`
- **Query Params**: `page`, `limit`, `status`, `branchId`, `search`
- **Controller**: `invoiceController.ts` -> `getAllInvoices`
- **Aggregated Logic**:
  1. Fetches raw invoices from the billing service.
  2. Maps through invoices to bind:
     - Customer details (fetched from Redis or `crm_service`).
     - Creator & Approver names (fetched from `employee_service`).
     - Branch names (fetched from `ven_inv_service`).

#### 2. `GET /b/invoices/:id`

- **Permissions**: All roles (with branch restrictions for regular employees)
- **Controller**: `invoiceController.ts` -> `getInvoiceById`
- **Logic**:
  1. Fetches the invoice by ID from `billing_service`.
  2. Resolves customer details, employee names, and branch name.
  3. Resolves product allocation serial numbers (barcodes) for any leased machines on the invoice.

#### 3. `POST /b/invoices/direct-sale`

- **Permissions**: `EMPLOYEE` with Sales/Rent jobs, or `ADMIN`
- **Body Payload**:
  ```json
  {
    "customerId": "string",
    "items": [{ "productId": "string", "quantity": 1, "unitPrice": 120 }],
    "discountPercent": 10
  }
  ```
- **Orchestration Flow**:
  1. Validates that the customer exists in `crm_service`.
  2. Calls `billing_service` to record a direct sales transaction.
  3. Emits inventory allocation signals to `ven_inv_service` for stock reduction.

#### 4. `POST /b/invoices/approve-quotation`

- **Permissions**: `FINANCE`, `ADMIN`
- **Logic**:
  1. Validates and marks a quotation as approved in `billing_service`.
  2. Fetches associated customer profiles.
  3. Allocates physical serial barcodes to the items.
  4. Triggers the creation of a billing ledger entry.
