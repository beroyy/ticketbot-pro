# Base stage with common dependencies
FROM node:22-alpine AS base
RUN apk add --no-cache bash git python3 make g++
RUN npm install -g pnpm@10.13.1 turbo tsx

FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/bot/package.json ./apps/bot/
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
COPY packages/scripts/package.json ./packages/scripts/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/vitest-config/package.json ./packages/vitest-config/

ENV CI=true
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app

COPY apps/api ./apps/api
COPY apps/bot ./apps/bot
COPY apps/web ./apps/web
COPY packages ./packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY .nvmrc ./

# Build Next.js app
RUN pnpm --filter @ticketsbot/web build

# Note: API and Bot don't need build because Prisma needs runtime generation
# The start:production script handles this

FROM base AS runner
WORKDIR /app

COPY --from=builder /app .

EXPOSE 3000 3001 3002

CMD ["pnpm", "start:production"]