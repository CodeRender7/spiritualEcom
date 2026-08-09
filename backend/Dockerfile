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
ARG CACHEBUST=1
RUN echo "cachebust=${CACHEBUST}"
COPY backend ./backend
RUN pnpm --filter divinekart-backend run build

FROM node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS runner
RUN apk add --no-cache bash curl postgresql-client && corepack enable
WORKDIR /app
COPY --from=builder /repo/backend/package.json ./
COPY --from=builder /repo/backend/medusa-config.ts ./
COPY --from=builder /repo/backend/tsconfig.json ./
COPY --from=builder /repo/backend/.medusa ./.medusa
COPY --from=builder /repo/backend/scripts ./scripts
COPY --from=builder /repo/backend/src ./src
COPY --from=builder /repo/node_modules ./node_modules

RUN chmod +x ./scripts/entrypoint.sh

EXPOSE 9000
ENTRYPOINT ["bash", "./scripts/entrypoint.sh"]
