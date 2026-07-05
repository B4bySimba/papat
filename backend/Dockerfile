# ── deps: full install (needed to build) ──────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
# pnpm 10 skips native/postinstall build scripts unless explicitly approved;
# onlyBuiltDependencies in package.json approves them, but a fresh install
# doesn't always re-trigger already-resolved scripts, so rebuild explicitly.
RUN pnpm rebuild

# ── build: generate prisma client + compile TypeScript ────────────────────────
FROM deps AS build
WORKDIR /app

COPY . .

# prisma.config.ts requires DATABASE_URL to be set (it throws otherwise), but
# `prisma generate` only reads the schema — it never connects. This placeholder
# is build-time only (.env is .dockerignore'd); the real value is injected by
# docker-compose at container runtime.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN pnpm exec prisma generate
RUN pnpm build

# ── runner: runtime image ──────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build /app/prisma/migrations ./prisma/migrations

EXPOSE 3000

# Applying migrations on every boot is idempotent (a no-op once the schema is
# up to date) and ensures the container never starts against a stale schema.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
