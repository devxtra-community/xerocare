# ============================================================
# Stage 1 – base: Node 20 + pnpm via corepack
# ============================================================
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# libc6-compat is required at runtime for native modules (bcrypt, etc.)
RUN apk add --no-cache libc6-compat
# Pin pnpm rather than tracking `latest`: pnpm 11 requires Node >= 22.13
# (it imports node:sqlite), so `latest` breaks this Node 20 base the moment
# a new major ships. 10.26 matches the version used locally and reads the
# lockfileVersion 9.0 in pnpm-lock.yaml.
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

# ============================================================
# Stage 2 – deps: install all workspace dependencies
# ============================================================
FROM base AS deps
WORKDIR /app

# ven_inv_service depends on canvas, which publishes no prebuilt binary for
# musl/Alpine — node-gyp compiles it from source and needs the Cairo/Pango
# headers plus a C++ toolchain. These stay in the deps/builder stages only;
# the runner installs the much smaller shared libraries instead.
RUN apk add --no-cache \
      build-base \
      python3 \
      pkgconfig \
      cairo-dev \
      pango-dev \
      jpeg-dev \
      giflib-dev \
      librsvg-dev \
      pixman-dev

# Copy workspace manifest files first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/api_gateway/package.json      ./backend/api_gateway/package.json
COPY backend/billing_service/package.json  ./backend/billing_service/package.json
COPY backend/crm_service/package.json      ./backend/crm_service/package.json
COPY backend/employee_service/package.json ./backend/employee_service/package.json
COPY backend/ven_inv_service/package.json  ./backend/ven_inv_service/package.json
COPY frontend/package.json                 ./frontend/package.json

# Install all dependencies
# node-linker=hoisted (from .npmrc) means everything lands in /app/node_modules
RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 3 – builder: compile everything
# ============================================================
FROM deps AS builder
WORKDIR /app

# Copy the full source code on top of the installed deps
COPY . .

# Rebuild native addons (bcrypt, etc.) against the alpine libc
RUN pnpm rebuild

# Build every backend service (tsc → dist/) and the Next.js frontend
RUN pnpm -r build

# ============================================================
# Stage 4 – runner: lean production image
# ============================================================
FROM base AS runner
WORKDIR /app

# Shared libraries the compiled canvas addon links against at runtime.
# Only the .so files are needed here, not the -dev headers.
RUN apk add --no-cache cairo pango jpeg giflib librsvg pixman

# Install pm2 globally for process management
RUN npm install -g pm2

# ── Root-level files ──────────────────────────────────────────
COPY --from=builder /app/package.json          ./package.json
COPY --from=builder /app/pnpm-workspace.yaml   ./pnpm-workspace.yaml
COPY --from=builder /app/.npmrc                ./.npmrc
COPY --from=builder /app/ecosystem.config.js   ./ecosystem.config.js

# ── Hoisted node_modules (all workspace deps live here) ───────
# With node-linker=hoisted each service resolves its imports from here.
COPY --from=builder /app/node_modules          ./node_modules

# ── Backend service compiled output ──────────────────────────
COPY --from=builder /app/backend/api_gateway/dist          ./backend/api_gateway/dist
COPY --from=builder /app/backend/api_gateway/package.json  ./backend/api_gateway/package.json

COPY --from=builder /app/backend/billing_service/dist          ./backend/billing_service/dist
COPY --from=builder /app/backend/billing_service/package.json  ./backend/billing_service/package.json

COPY --from=builder /app/backend/crm_service/dist          ./backend/crm_service/dist
COPY --from=builder /app/backend/crm_service/package.json  ./backend/crm_service/package.json

COPY --from=builder /app/backend/employee_service/dist          ./backend/employee_service/dist
COPY --from=builder /app/backend/employee_service/package.json  ./backend/employee_service/package.json

COPY --from=builder /app/backend/ven_inv_service/dist          ./backend/ven_inv_service/dist
COPY --from=builder /app/backend/ven_inv_service/package.json  ./backend/ven_inv_service/package.json

# ── Frontend (Next.js) ────────────────────────────────────────
COPY --from=builder /app/frontend/.next          ./frontend/.next
COPY --from=builder /app/frontend/public         ./frontend/public
COPY --from=builder /app/frontend/package.json   ./frontend/package.json

# ── Expose all service ports ──────────────────────────────────
# 3000 = Frontend (Next.js)
# 3001 = API Gateway
# 3002 = Employee Service
# 3003 = Vendor/Inventory Service
# 3004 = Billing Service
# 3005 = CRM Service
EXPOSE 3000 3001 3002 3003 3004 3005

# pm2-runtime keeps all processes alive in the foreground
CMD ["pm2-runtime", "start", "ecosystem.config.js"]