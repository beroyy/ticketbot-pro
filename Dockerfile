# Base stage with common dependencies
FROM node:22-alpine AS base
RUN apk add --no-cache bash git python3 make g++
RUN npm install -g pnpm@10.13.1 turbo tsx

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

# Note: API and Bot don't need build because Prisma needs runtime generation
# The start:production script handles this

# Runner stage
FROM base AS runner
WORKDIR /app

COPY --from=builder /app .

EXPOSE 3000 3001 3002

CMD ["pnpm", "turbo", "start"]