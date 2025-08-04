# Base stage with common dependencies
FROM node:22-alpine AS base
RUN apk add --no-cache bash git python3 make g++ curl
RUN npm install -g pnpm@10.13.1 turbo tsx
# Install dotenvx
RUN curl -sfS https://dotenvx.sh/install.sh | sh

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy everything, relying on .dockerignore to exclude unwanted files
COPY . .

ENV CI=true
RUN pnpm install --frozen-lockfile

# Builder stage
FROM deps AS builder
WORKDIR /app

# Copy source files (dockerignore excludes node_modules, etc.)
COPY . .

# Generate Prisma Client before building (required for type imports)
RUN pnpm db:generate

# Build Next.js app
RUN pnpm --filter @ticketsbot/web build

# Skip TypeScript compilation for API and Bot - they use tsx at runtime
# This avoids the memory issues during type checking

# Note: API and Bot don't need build because Prisma needs runtime generation
# The start:production script handles this

# Runner stage
FROM base AS runner
WORKDIR /app

COPY --from=builder /app .

EXPOSE 3000 3001 3002

# Set production environment
ENV NODE_ENV=production
ARG NEXT_PUBLIC_BASE_DOMAIN
ENV BASE_DOMAIN=${NEXT_PUBLIC_BASE_DOMAIN}

# Use dotenvx to load environment variables at runtime
CMD ["dotenvx", "run", "--", "pnpm", "start:production"]