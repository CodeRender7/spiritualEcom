---
name: codebase-analysis
description: "Deep codebase analysis using MCP servers — combines fallow (static analysis), graphify (knowledge graph), gitnexus (git intelligence), and codebase-memory (persistent understanding) for comprehensive code health assessment."
---

Run a comprehensive codebase analysis using all available MCP servers. This skill orchestrates multiple tools to produce a unified view of code health, architecture, and complexity.

## Analysis Pipeline

### 1. Index the codebase (if not already done)
- Run `codebase-memory-mcp` → `index_repository` to ensure the project is indexed
- Run `gitnexus analyze` if the repo hasn't been analyzed yet

### 2. Static Analysis (Fallow)
Run these fallow commands to gather static analysis data:
```bash
pnpm exec fallow scan .                    # Full scan
pnpm exec fallow unused-exports .          # Dead code / unused exports
pnpm exec fallow duplicates .              # Code duplication
pnpm exec fallow complexity .              # Cyclomatic complexity hotspots
pnpm exec fallow circular-deps .           # Circular dependency detection
```

### 3. Knowledge Graph (Graphify)
Use the graphify MCP to query the dependency graph:
- Module dependency visualization
- Import chain analysis
- Component coupling metrics

### 4. Git Intelligence (GitNexus)
Use GitNexus to understand code evolution:
- Change frequency hotspots (files changed most often)
- Co-change analysis (files that change together)
- Impact analysis for planned changes

### 5. Codebase Memory
Use codebase-memory-mcp for semantic understanding:
- `search_graph` for architectural pattern discovery
- `trace_path` for dependency chain analysis
- `query_graph` for structural queries

## Output

Present findings as a structured report covering:
1. **Code Pollution** — Dead code percentage, unused exports count, orphaned modules
2. **Complexity Hotspots** — Top 10 most complex files/functions
3. **Duplication** — Duplicate code blocks with locations
4. **Architecture Health** — Circular dependencies, boundary violations
5. **Churn Analysis** — Files with highest change frequency (potential instability)
6. **Recommendations** — Prioritized list of improvements

Use `/improve-codebase-architecture` to act on findings.


## agent-to-mcp-alignment

Execution pattern: **graph**. MCP servers are never mandatory for this skill, but where codegrounding helps, prefer codebase-memory-mcp (search_graph / trace_path) first, then fallow, gitnexus, graphify per docs/agents/mcp-usage.md. Specific usage: Use ALL four: fallow analyze/check_health, codebase-memory get_architecture, gitnexus query/impact, graphify query.
