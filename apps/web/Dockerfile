FROM node:22-alpine AS base

RUN apk update && apk add --no-cache libc6-compat

RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

# --- Stage 1: Prune the monorepo for the web app ---
FROM base AS pruner

WORKDIR /app

COPY . .

RUN pnpm dlx turbo prune web --docker

# --- Stage 2: Install dependencies (cached layer) ---
FROM base AS installer

WORKDIR /app

# First, install dependencies using only the pruned package.jsons and lockfile.
# This layer is cached as long as dependencies don't change.
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Then copy the full source code and build
COPY --from=pruner /app/out/full/ .

# Support Turbo remote caching in CI
ARG TURBO_TEAM
ARG TURBO_TOKEN
ENV TURBO_TEAM=${TURBO_TEAM}
ENV TURBO_TOKEN=${TURBO_TOKEN}

# Increase Node heap size for larger builds
ENV NODE_OPTIONS="--max-old-space-size=8192"

RUN pnpm dlx turbo run build --filter=web...

# --- Stage 3: Production runner ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Don't run as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit
USER sveltekit

COPY --from=installer --chown=sveltekit:nodejs /app/apps/web/build ./

EXPOSE 3000

CMD ["node", "index.js"]
