# Xerocare ERP - Frontend Client Application

This directory contains the Next.js frontend web application for the Xerocare ERP. It is structured using the App Router, styled with TailwindCSS and custom CSS components, and integrates with the API Gateway microservice.

---

## 📂 Directory Layout

```text
frontend/
├── app/                      # Next.js App Router Directories
│   ├── admin/                # Admin Panel (System management, server controls)
│   ├── adminlogin/           # Specialized Admin Login endpoint
│   ├── hr/                   # Human Resources Dashboard (Leaves, payroll logs)
│   ├── manager/              # Branch Manager Dashboard (RFQ approval, ticket cancel/assign)
│   ├── employee/             # Staff & Technician Portal (Service ticket actions, parts diagnosis)
│   ├── login/                # Standard Staff 2FA Login Page
│   ├── magic-login/          # Passwordless Magic Link verification entrypoint
│   ├── preview/              # Interactive quotation & settlement preview sheets
│   ├── globals.css           # Global CSS variables & layout tokens
│   ├── layout.tsx            # Main HTML layout scaffolding
│   └── page.tsx              # Public welcome & overview marketing page
├── components/               # Shareable React components & UI kits
│   └── ui/                   # Modular elements (buttons, badges, inputs)
├── hooks/                    # React custom hook helper scripts
├── lib/                      # Core utility scripts & API request clients
│   ├── api.ts                # Axios Client Instance (Logger, Auth interceptor)
│   ├── auth.ts               # Decoders, 2FA triggers, Magic Link verifiers
│   └── invoice.ts            # Invoice rendering helpers & details formatter
└── services/                 # API connection scripts mapped per backend module
```

---

## 🔒 Authentication & Role Protection Middleware

Frontend page security is enforced via a two-layer security framework:

### 1. Server-Side Route Guard (`middleware.ts`)

Next.js Edge Middleware runs on every page transition. It checks paths matching `/admin/:path*`, `/hr/:path*`, `/manager/:path*`, and `/employee/:path*`:

1. **Token Check**: Reads the `accessToken` cookie. If not present, redirects the user to `/login` (or `/adminlogin` for admin URLs).
2. **Role Validation**: Decodes the JWT access token payload:
   - If the user's role is not approved for that specific sub-folder (e.g., an `EMPLOYEE` attempting to access `/hr`), the middleware intercepts the navigation and redirects the user to their appropriate role home dashboard.

### 2. Client-Side Axios Interceptor (`lib/api.ts`)

The custom Axios client handles token injection and automated token refreshes without interrupting the user experience:

- **Authorization Header**: Automatically appends the JWT token to every HTTP request header:
  ```http
  Authorization: Bearer <accessToken>
  ```
- **401 Unauthorized Interception**: If the API Gateway responds with an HTTP status `401`:
  1. **Token Invalidation**: If the error code returned is `TOKEN_REVOKED` or `TOKEN_INVALID` (e.g., deleted session), the client immediately wipes `localStorage` and redirects the browser to the login page.
  2. **Automated Token Refresh**: If the token has simply expired, the interceptor pauses outgoing requests and triggers a background refresh query (`POST /e/auth/refresh`) using the HTTP-only refresh cookie.
     - **Success**: The new access token is saved in `localStorage`, and the client automatically retries all paused API requests.
     - **Failure**: If the refresh token has also expired or been revoked, the user's session is cleared and they are redirected to the login interface.

---

## 🛠️ Development & Build Commands

Ensure the root monorepo dependencies are installed and the backend databases are running before starting the frontend.

### Run Development Server

Launches Next.js in hot-reloading development mode on port `3000`:

```bash
pnpm dev
# or from root: pnpm --filter frontend dev
```

### Build for Production

Compiles files and optimizes styling sheets, writing output to `.next/`:

```bash
pnpm run build
# or from root: pnpm --filter frontend build
```

### Start Production Server

Launches the precompiled build:

```bash
pnpm run start
# or from root: pnpm --filter frontend start
```
