# DivineKart — Domain Context

## What we're building

DivineKart is a self-hosted e-commerce platform for Hindu religious & spiritual products. A **Medusa v2** backend exposes the store API and admin dashboard; a **Next.js 14** storefront renders the customer experience. Everything runs in **Docker Compose** and the repo is a **pnpm + Turbo monorepo**.

## Terminology

| Term | Meaning |
|------|---------|
| **DivineKart** | The store brand and this monorepo (root package `divinekart`). |
| **backend** | Workspace package `divinekart-backend` — Medusa v2 server (API :9000, Admin `/app`). |
| **storefront** | Workspace package `divinekart-storefront` — Next.js 14 customer app (:8000). |
| **Collection** | Medusa product collection = one of the 10 product categories (Religious Photos, God Image Keyrings, Spiritual Idols, Spiritual Stickers, Banners & Posters, Photo Frames, Handbills, Spiritual Stationery, Spiritual Flags, Spiritual Clothing). |
| **Product** | A sellable item created via the `createProductsWorkflow` seed; variants carry INR prices in minor units (paise). |
| **MRP / discount_pct / rating** | Merchandising metadata stored on the product's `metadata` map, read by the storefront for badges, strikethrough pricing and star ratings. |
| **Mock fallback** | `storefront/src/lib/medusa.ts` returns `MOCK_PRODUCTS`/`MOCK_COLLECTIONS` when the backend is unreachable, so the storefront never renders blank. |
| **Sales channel** | Default sales channel that seeded products are linked to so they appear on the store. |
| **Region (India/INR)** | The single seeded region; all prices are `inr` minor units. |
| **Seed script** | `backend/scripts/seed-data.ts`, run via `medusa exec`; idempotent (skips existing handles). |
| **Turbo pipelines** | `build`, `dev`, `typecheck`, `seed`, `db:migrate` tasks defined in `turbo.json`. |
| **Skills** | mattpocock engineering skills installed under `.agents/skills`, `.claude/skills`, `skills/`, and `.opencode/skills`. |
| **codebase-memory-mcp** | MCP server for persistent codebase understanding — `search_graph`, `trace_path`, `get_code_snippet`, `query_graph`, `search_code`. Prefer over grep for code discovery. |
| **fallow** | Rust-native static analysis MCP: dead code, duplication, complexity hotspots, circular deps, architecture boundaries. Run via `pnpm exec fallow-mcp`. |
| **gitnexus** | Git history intelligence MCP: change frequency, co-change analysis, impact analysis. Index with `gitnexus analyze`. |
| **graphify** | Knowledge graph MCP: dependency visualization, module coupling, import chain analysis. Build with `graphify .`. |
| **Swarm** | Enterprise agent orchestration pattern. Three execution modes: Harness (linear pipeline), Loop (iterative cycle), Graph (parallel exploration). |
| **Agent Persona** | Role-based agent profile: Architect, Analyst, Builder, Debugger, Planner, Researcher, Teacher, Router. Defined in `.agents/swarm/swarm-config.md`. |
| **Harness pattern** | Linear pipeline: `/wayfinder` → `/to-spec` → `/to-tickets` → `/implement` → `/tdd` → `/code-review` → `/handoff`. For new features. |
| **Loop pattern** | Iterative cycle: `/diagnosing-bugs` → `/tdd` → `/code-review` → repeat. For bug fixing. |
| **Graph pattern** | Parallel exploration: multiple analysis skills run simultaneously → synthesize decisions. For architecture review. |

## Layout rules

- Products never use the product module's `createProducts` for seeding — always `createProductsWorkflow` (it persists prices + links sales channels).
- Server-side storefront fetches must use `MEDUSA_BACKEND_URL` (http://backend:9000); browser fetches use `NEXT_PUBLIC_MEDUSA_BACKEND_URL` (http://localhost:9000).
- Do not remove the Mock fallback; it is load-bearing for first-boot rendering.
- Prefer MCP tools (`codebase-memory-mcp`, `fallow`, `graphify`, `gitnexus`) over grep/file-read for code discovery.
- Use `/ask-matt` when uncertain which skill or agent persona fits the task.
- All swarm patterns are defined in `.agents/swarm/swarm-config.md`.

See `docs/agents/domain.md` for how agents should consume this file.
