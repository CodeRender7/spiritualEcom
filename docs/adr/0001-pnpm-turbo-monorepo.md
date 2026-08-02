# ADR-0001: pnpm + Turbo monorepo

- **Status:** Accepted
- **Date:** 2026-08-02
- **Decision maker:** DivineKart platform

## Context

The original implementation plan shipped `backend/` and `storefront/` as two independent npm apps orchestrated by Docker Compose. Two requirements drove a restructure: a single reproducible dependency graph, and a `turbo.json` pipeline so `build`/`dev`/`typecheck`/`seed` run consistently across both workspaces.

## Decision

Convert the repo to a **pnpm workspace + Turbo monorepo**:

- Root `package.json` (`divinekart`), `pnpm-workspace.yaml` (`backend`, `storefront`), single `pnpm-lock.yaml`.
- `turbo.json` pipelines for `build`, `dev`, `typecheck`, `seed`, `db:migrate`.
- `.npmrc` uses `node-linker=hoisted` because Medusa v2 requires hoisted node_modules under pnpm.
- Docker images are built from the repo root context with pnpm; the backend image is flattened so `medusa start` runs standalone.

## Consequences

- One lockfile and one install for the whole platform; version drift between apps is impossible.
- Medusa packages are pinned (`^2.18.0`) and the correct v2 CLI (`@medusajs/cli`) replaces the v1 `@medusajs/medusa-cli`.
- Seed products go through `createProductsWorkflow` so prices persist into the pricing module and products link to the default sales channel.
