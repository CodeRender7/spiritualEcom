# Wayfinder Map: Observability + DivineKart Partner Platform

- Labels: `wayfinder:map`
- Effort: Full-stack observability (Langfuse + OpenObserve + OpenCode tracing) and the DivineKart SaaS partner platform (partner portal, staff roles, subscribed plans, RBAC admin with per-tenant observability UI), folded into this Medusa monorepo.

## Destination

DivineKart runs with production-grade, self-hosted observability — LLM traces in Langfuse, app/infra logs + metrics + incident drill in OpenObserve, and agent/swarm traces from OpenCode itself — AND a multi-tenant SaaS partner platform on the same stack (partner portal + staff + subscribed plans + RBAC admin with per-tenant observability dashboard). The way is clear end-to-end.

## Notes

- Domain: DivineKart is a Medusa v2 monorepo (`divinekart-backend` + `divinekart-storefront` + new `divinekart-partners`). pnpm + turbo; docker compose at root.
- This repo runs on the **harness** execution pattern; bug fixes (like the Langfuse worker) run on the **loop** pattern.
- MCP servers (all working): `codebase-memory-mcp` (indexed: 2081 nodes, entrypoints = storefront pages + seed), `gitnexus` (indexed: 5 communities, 24 flows), `fallow`, `graphify` (graphify-out/).
- Every session: orient with `docs/agents/mcp-usage.md`, `docs/agents/issue-tracker.md`, `docs/domain.md`, `CONTEXT.md`.

## Decision tickets

Blocking wiring done in a second pass by name reference. Each decision resolves in one 100K-token session.

1. **T1 — Langfuse deployment topology** (`task`, AFK partial): decide the exact Langfuse image set + worker entry + Redis wiring that converges to a healthy UI. Currently in-progress: `langfuse:2` web + `langfuse-worker:2` + separate `langfuse-db` Postgres. The `CREATE INDEX CONCURRENTLY` deadlock was resolved by migrating web-only; image pull for worker in flight. → blocks T2, T4.
2. **T2 — Langfuse credentials & project bootstrap** (`task`): with topology fixed, create public/secret keys, an org + a `divinekart-apps` project, and decide `LANGFUSE_INIT_*` bootstrap vs manual creation. → blocks T4.
3. **T4 — Application-layer Langfuse tracing** (`task`/`research`): instrument the Medusa `backend` and `storefront` with the Langfuse SDK/tracing, plus a custom OpenCode hook for `opencode-self` traces. Decide which HTTP/DB/LLM spans are business-critical. → unblocks T5.
4. **T5 — OpenObserve ingestion + incident loop** (`task`, custom MCP): point OpenObserve at app logs + OpenCode traces, build an `openobserve-mcp` the swarm can call (ingest query / audit / incident drill), and a `diagnosing-bugs`-paired incident-loop skill. → unblocks T6.
6. **T6 — Guardrails / jailbreak protection** (`research`, `grilling`): on the app stack + agent stack, choose enforceable guardrails (input validation, prompt-injection filters, RBAC enforcement) and wire to OpenObserve alerts.
7. **T7 — DivineKart partner platform** (`grilling`, `task`): scaffold `divinekart-partners` — partner portal, staff organism, subscribed plans, RBAC admin panel with a per-tenant observability UI. → depends on T5 (uses OpenObserve/Langfuse per-tenant views).
8. **T8 — e2e verification** (`task`): full harness run — docker compose health, MCPs alive, traces visible in Langfuse, per-tenant UI renders, typecheck green.

## Fog of war (not yet specified)

- Exact per-tenant isolation model for the observability UI (query scoping in OpenObserve vs. a partition per tenant).
- Langfuse API-key provisioning workflow for per-app secrets rotation.
- How freeze the `openobserve` payload schema to match OpenCode trace export (custom hook fields).
- Whether partner-subscribed plans gate which observability features per tenant.

## Out of scope

- Rewriting the Medusa store/backend business logic.
- Migrating off the existing postgres/redis in favor of a third-party observability SaaS.

## Decisions so far

- **T1 — Langfuse deployment topology** (`.scratch/observability-and-divinekart/issues/01-langfuse-topology.md`) — `langfuse:2` web + `langfuse-worker:2` + `langfuse-db` :15 + shared redis; worker uses native entrypoint; migrate web-only to avoid `CREATE INDEX CONCURRENTLY` deadlock. Verified live.