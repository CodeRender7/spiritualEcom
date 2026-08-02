# Spec — Monorepo, Docker & Real-Data Path

Convert DivineKart to a pnpm + Turbo monorepo, fix Docker infrastructure to build with pnpm, restore the real-data path in the storefront, and verify end-to-end without breaking any existing functionality.

## Goals

1. Turbo monorepo fully configured (workspaces, pipelines, hoisted pnpm).
2. Docker Compose builds backend + storefront from the repo root with pnpm.
3. Backend boots: migrations → seed (10 collections, 30+ products, INR region, admin) → start.
4. Storefront renders real seeded data (server-side `MEDUSA_BACKEND_URL`), Mock fallback intact.
5. Full verification via `docker compose up --build`.

See `docs/adr/0001-pnpm-turbo-monorepo.md`.
