FROM node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
ARG NPM_REGISTRY=https://registry.npmmirror.com/
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc turbo.json ./
COPY backend/package.json ./backend/package.json
COPY storefront/package.json ./storefront/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
  printf 'registry=%s\n' "$NPM_REGISTRY" >> .npmrc \
  && pnpm install --frozen-lockfile --network-concurrency=4 --fetch-retries=10 --fetch-retry-mintimeout=5000 --fetch-retry-maxtimeout=120000 --fetch-timeout=600000

FROM deps AS builder
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
ARG NEXT_PUBLIC_STORE_NAME=DivineKart
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_STORE_NAME=$NEXT_PUBLIC_STORE_NAME
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
COPY storefront ./storefront
RUN pnpm --filter divinekart-storefront run build

FROM node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /repo/storefront/.next/standalone/storefront ./
COPY --from=builder /repo/storefront/.next/standalone/node_modules ./node_modules
COPY --from=builder /repo/storefront/.next/static ./.next/static
RUN chown -R nextjs:nodejs /app && mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next/cache
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
