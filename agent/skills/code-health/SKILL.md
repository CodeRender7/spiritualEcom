---
name: code-health
description: "Track code pollution and complexity using fallow MCP — monitors unused code, duplication, circular dependencies, complexity hotspots, and architecture boundary violations."
---

Run a code health check using the fallow MCP server. This skill focuses on measurable code quality metrics that indicate code pollution and technical debt.

## Metrics Tracked

### 1. Dead Code / Unused Exports
```bash
pnpm exec fallow unused-exports .
```
- Exported symbols not imported anywhere
- Orphaned modules with no consumers
- Unreachable code paths

### 2. Code Duplication
```bash
pnpm exec fallow duplicates .
```
- Near-identical code blocks across files
- Copy-paste patterns indicating extraction opportunities
- Percentage of codebase that is duplicated

### 3. Cyclomatic Complexity
```bash
pnpm exec fallow complexity .
```
- Functions/methods exceeding complexity threshold
- Top 10 complexity hotspots ranked by score
- Trend analysis (getting better or worse?)

### 4. Circular Dependencies
```bash
pnpm exec fallow circular-deps .
```
- Import cycles between modules
- Depth of circular chains
- Suggested break points

### 5. Architecture Boundaries
```bash
pnpm exec fallow boundaries .
```
- Cross-boundary imports (e.g., storefront importing backend internals)
- Layer violations in the module hierarchy

## Reporting

After running all checks, produce a health scorecard:

| Metric | Score | Threshold | Status |
|--------|-------|-----------|--------|
| Dead code | X% | <5% | ✅/⚠️/❌ |
| Duplication | X% | <3% | ✅/⚠️/❌ |
| Complexity hotspots | N files | <5 | ✅/⚠️/❌ |
| Circular deps | N cycles | 0 | ✅/⚠️/❌ |
| Boundary violations | N | 0 | ✅/⚠️/❌ |

## Follow-up

- Use `/improve-codebase-architecture` to address architecture issues
- Use `/implement` with `/tdd` to safely remove dead code
- Use `/diagnosing-bugs` if circular deps cause runtime issues


## agent-to-mcp-alignment

Execution pattern: **graph**. MCP servers are never mandatory for this skill, but where codegrounding helps, prefer codebase-memory-mcp (search_graph / trace_path) first, then fallow, gitnexus, graphify per docs/agents/mcp-usage.md. Specific usage: fallow analyze / check_health / find_dupes, with a baseline saved before and compared after.
