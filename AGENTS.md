# AGENTS.md

## Agent skills

### Issue tracker

Issues and specs live as markdown under `.scratch/` (one directory per feature). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout — read `CONTEXT.md` at the repo root and `docs/adr/` before touching an area. See `docs/agents/domain.md`.

### Workspace

pnpm + Turbo monorepo (`divinekart`). Run scripts from the root:

- `pnpm install` — install all workspace deps (hoisted node_modules; Medusa requirement)
- `pnpm turbo typecheck` / `pnpm turbo build` / `pnpm turbo dev`
- `pnpm seed` — seed the Medusa database
- Docker: `docker compose up --build -d` from the root

### Domain rules

- Never seed products via the product module's `createProducts` — always `createProductsWorkflow`.
- Storefront server fetches use `MEDUSA_BACKEND_URL`; browser fetches use `NEXT_PUBLIC_MEDUSA_BACKEND_URL`.
- Keep the Mock fallback in `storefront/src/lib/medusa.ts`; it is load-bearing for first-boot rendering.

### MCP servers

Four MCP servers are configured globally for both Antigravity IDE and OpenCode:

- **codebase-memory-mcp** — Persistent codebase understanding. Prefer `search_graph`, `trace_path`, `get_code_snippet` over grep/file-read for code discovery. Run `index_repository` first if the project is not indexed.
- **fallow** — Rust-native static analysis: dead code, duplication, complexity hotspots, circular deps, architecture boundaries. Run via `pnpm exec fallow-mcp`.
- **gitnexus** — Git history intelligence: change frequency, co-change analysis, impact analysis. Run `gitnexus analyze` to index the repo.
- **graphify** — Knowledge graph from codebase: dependency visualization, module coupling, import chain analysis.

### Swarm orchestration

Agents operate as a swarm using three execution patterns. See `.agents/swarm/swarm-config.md` for full persona definitions.

**Harness** (linear pipeline): `/wayfinder` → `/to-spec` → `/to-tickets` → `/implement` → `/tdd` → `/code-review` → `/handoff`
- Use for: New features, spec-driven work

**Loop** (iterative cycle): `/diagnosing-bugs` → `/tdd` → `/code-review` → repeat
- Use for: Bug fixing, performance regressions

**Graph** (parallel exploration): `/improve-codebase-architecture` + `/codebase-design` + fallow scan → `/grill-with-docs` → `/domain-modeling`
- Use for: Architecture review, code health assessment

**Agent personas**: Architect, Analyst, Builder, Debugger, Planner, Researcher, Teacher, Router. Use `/ask-matt` when uncertain which fits.

### Code discovery rules

1. Prefer MCP tools over grep/file-read for code discovery
2. Run `codebase-memory-mcp` → `search_graph` first
3. Use `fallow scan .` before manual architecture review
4. Use `/codebase-analysis` for comprehensive health checks
5. Use `/code-health` for pollution and complexity metrics
