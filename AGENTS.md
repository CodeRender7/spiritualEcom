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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **project** (1067 symbols, 1316 relationships, 24 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/project/context` | Codebase overview, check index freshness |
| `gitnexus://repo/project/clusters` | All functional areas |
| `gitnexus://repo/project/processes` | All execution flows |
| `gitnexus://repo/project/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
