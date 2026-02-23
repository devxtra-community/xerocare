# -- Base Stage --
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# -- Builder Stage --
FROM base AS builder
# libc6-compat might be needed for some native dependencies on alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy everything
COPY . .

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Build all backend services
RUN pnpm -r build

# -- Runner Stage --
FROM base AS runner
WORKDIR /app

RUN npm install -g pm2

# Copy built files and node_modules from builder
COPY --from=builder /app /app

# Expose ports
EXPOSE 3000 3001 3002 3003 3004 3005

CMD ["pm2-runtime", "start", "ecosystem.config.js"]