# 👥 Employee & Auth Service Reference

The Employee & Auth Service manages staff identity, access permissions, multi-device login sessions, safety checks (2FA OTP, Magic Links), branch office registries, leaves of absence, and monthly payroll accounting.

---

## 1. Database Schema (Postgres Entity Mapping)

The service maps PostgreSQL tables using TypeORM:

### `Employee` Entity

- `id` (UUID, PK)
- `display_id` (varchar(20), unique, null) - HR-assigned public display serial.
- `email` (varchar(255), unique)
- `first_name` & `last_name` (varchar(255))
- `password_hash` (varchar(255)) - Blowfish bcrypt-hashed password.
- `role` (Enum) - `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`, `FINANCE`.
- `employee_job` (Enum, nullable) - `SALES`, `RENT_LEASE`, `TECHNICIAN`, `ADMINISTRATIVE`, `ACCOUNTING`.
- `finance_job` (Enum, nullable) - `RECEIVABLE`, `PAYABLE`, `TAXATION`, `AUDITING`.
- `salary` (numeric(12,2)) - Monthly salary scale.
- `profile_image_url` & `id_proof_key` (varchar(500), nullable) - Document links.
- `status` (Enum) - `ACTIVE`, `INACTIVE`, `DELETED`.
- `branch_id` (UUID, nullable) -> Links to `Branch` entity.

### `Branch` Entity

- `id` (UUID, PK)
- `name` (varchar(255))
- `location` (varchar(255))
- `code` (varchar(20), unique)

### `LeaveApplication` Entity

- `id` (UUID, PK)
- `employeeId` (UUID) -> Links to `Employee`.
- `startDate` & `endDate` (timestamp)
- `reason` (text)
- `status` (Enum) - `PENDING`, `APPROVED`, `REJECTED`.
- `reviewedBy` (UUID, nullable) -> Reviewer ID.

### `Payroll` Entity

- `id` (UUID, PK)
- `employeeId` (UUID) -> Links to `Employee`.
- `month` (int) & `year` (int)
- `baseSalary` (numeric(12,2))
- `allowances` & `deductions` (numeric(12,2))
- `netSalary` (numeric(12,2)) - Calculated as `baseSalary + allowances - deductions`.
- `status` (Enum) - `PENDING`, `PAID`.

---

## 2. Authentication & Session Security Workflows

### A. Two-Step Login with OTP (2FA)

1. **Credentials verification**: The user hits `POST /auth/login`. The server verifies the password hash via bcrypt. If valid, the server calls `OtpService.sendOtp(email, OtpPurpose.LOGIN)`.
2. **OTP Delivery**: Generates a cryptographically secure 6-digit number, stores it in Redis with a 5-minute TTL, and fires an email with the verification code.
3. **Verification & Tokens**: The user hits `POST /auth/login/verify`. If the submitted OTP matches the Redis value, `issueTokens` is called to generate a short-lived access JWT, a long-lived refresh JWT, and sets cookie trackers.

### B. Passwordless Magic Links

1. The user hits `POST /auth/magic-link`.
2. `MagicLinkService` signs a secure JWT containing the user's email with a 15-minute expiration time.
3. An email is dispatched with the link `http://localhost:3001/verify-magic?token=xyz`.
4. Clicking the link calls `POST /auth/magic-link/verify` on the gateway, which authenticates the email address and generates session keys without requiring password inputs.

### C. Multi-Device Active Sessions

The system records all active refresh tokens in a tracking table in Postgres. Each record maps:

- `id` (UUID)
- `userId` (UUID)
- `deviceType`, `osName`, `browserName` (Parsed from client `User-Agent` headers).
- `ipAddress`
- `lastActiveAt` (Timestamp)

**Session Security Features**:

- **Get Active Sessions** (`GET /auth/sessions`): Lists all devices and locations currently logged in.
- **Remote Session Logout** (`POST /auth/sessions/logout`): Deletes a specific session ID row, immediately invalidating that refresh token.
- **Logout Other Devices** (`POST /auth/logout-other-devices`): Deletes all active session records for the user except the one containing the current request's refresh token.

---

## 3. API Endpoints Directory

All routes in `employeeRouter` (except auth signup/login and public routes) require logging in (`authMiddleware`).

### Auth Endpoints (`/auth`)

| Endpoint                  | Method | Roles  | Purpose                                                         |
| :------------------------ | :----- | :----- | :-------------------------------------------------------------- |
| `/login`                  | `POST` | Public | Initiates password login; triggers sending login OTP.           |
| `/login/verify`           | `POST` | Public | Submits login OTP; receives access token & sets refresh cookie. |
| `/refresh`                | `POST` | Public | Submits refresh token cookie to get a new access token.         |
| `/logout`                 | `POST` | Public | Clears cookies and deletes active session key from the DB.      |
| `/me`                     | `GET`  | All    | Returns profile of currently authenticated user.                |
| `/change-password`        | `POST` | All    | Updates password (requires current password check).             |
| `/forgot-password`        | `POST` | Public | Starts recovery; triggers OTP to reset password.                |
| `/forgot-password/verify` | `POST` | Public | Submits recovery OTP and sets a new password.                   |
| `/magic-link`             | `POST` | Public | Dispatches magic login link to email.                           |
| `/magic-link/verify`      | `POST` | Public | Validates clicked token and creates session.                    |
| `/logout-other-devices`   | `POST` | All    | Revokes all sessions except current one.                        |
| `/sessions`               | `GET`  | All    | Lists active devices and browser sessions.                      |
| `/sessions/logout`        | `POST` | All    | Forces remote logout of a specific session ID.                  |

### Staff Management Endpoints (`/employees`)

| Endpoint              | Method   | Roles                | Payload / Query                                | Purpose                                                         |
| :-------------------- | :------- | :------------------- | :--------------------------------------------- | :-------------------------------------------------------------- |
| `/create`             | `POST`   | `ADMIN`, `HR`        | Form-data (files: `profile_image`, `id_proof`) | Creates employee record and uploads files. Sends welcome email. |
| `/:id/id-proof`       | `GET`    | `ADMIN`, `HR`        | URL Param: `id`                                | Fetches scan of ID card.                                        |
| `/:id`                | `DELETE` | `ADMIN`, `HR`        | URL Param: `id`                                | Moves employee status to `DELETED`.                             |
| `/:id/resend-welcome` | `POST`   | `ADMIN`, `HR`        | URL Param: `id`                                | Resends welcome invite and resets setup token.                  |
| `/stats`              | `GET`    | `ADMIN`, `HR`, `MGR` | -                                              | Summary stats (count, departments, active).                     |
| `/branches`           | `GET`    | `ADMIN`, `HR`, `MGR` | -                                              | Returns list of all branch offices.                             |
| `/`                   | `GET`    | `ADMIN`, `HR`, `MGR` | Query: `page`, `limit`, `search`               | Lists all active employees.                                     |
| `/:id`                | `GET`    | `ADMIN`, `HR`, `MGR` | URL Param: `id`                                | Full detail lookup of a staff member.                           |
| `/:id`                | `PUT`    | `ADMIN`, `HR`, `MGR` | Form-data (optional files)                     | Updates staff details, salary, role, or branch.                 |
| `/public/:id`         | `GET`    | All                  | URL Param: `id`                                | Returns public profile cards.                                   |
