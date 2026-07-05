# ── deps: install dependencies ─────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── builder: compile the Next.js app ───────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next.config.ts fails fast if these are unset — real values are supplied by
# docker-compose at container runtime; the build only needs them to be present.
ENV BACKEND_API_URL="http://placeholder:3000"
ENV JWT_SECRET="placeholder"

RUN pnpm build

# ── runner: minimal runtime image ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
