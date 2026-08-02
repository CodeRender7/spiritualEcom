# Agent ↔ MCP ↔ Execution-Pattern Alignment

Canonical map of which MCP servers/tools each skill should use, and how the
three execution patterns (harness / loop / graph) compose them. This is the
source of truth; each `SKILL.md` carries a short "MCP tools" section pointing
here.

## Available MCP servers

| Server | Registration | Purpose |
|--------|--------------|---------|
| `codebase-memory-mcp` | global opencode.json | Persistent graph of code: search_graph, trace_path, get_code_snippet, query_graph, get_architecture. **First choice for code discovery.** |
| `fallow` | global opencode.json | Static analysis: analyze (dead code, dupes, circular deps), check_health (complexity), boundary violations, trace_export, symbol_impact. |
| `gitnexus` | global opencode.json | Git/graph intelligence: impact (blast radius), context (360° symbol), trace, detect_changes, query, cypher. Requires git. |
| `graphify` | global opencode.json (graphify-mcp-tools) | Knowledge graph from codebase: query "<question>", path "A" "B", explain, pop-nodes, GRAPH_REPORT.md. Requires graphify-out/. |

## Execution patterns

- **Harness** (linear pipeline): `/wayfinder → /to-spec → /to-tickets → /implement → /tdd → /code-review → /handoff`.
- **Loop** (iterative): `/diagnosing-bugs → /tdd → /code-review → repeat`.
- **Graph** (parallel): `/improve-codebase-architecture + /codebase-design + fallow scan + graphify session`.

## Skill → pattern → MCP

| Skill | Pattern | Primary MCP usage |
|-------|---------|-------------------|
| wayfinder | harness (plan) | codebase-memory `get_architecture`; gitnexus `status` |
| to-spec | harness (plan) | codebase-memory `search_graph` for context |
| to-tickets | harness (plan) | codebase-memory `search_graph` |
| implement | harness (build) | codebase-memory `search_graph`/`trace_path`; fallow `guard` before edit |
| tdd | harness (build) | codebase-memory `search_graph`; fallow `trace_export` |
| code-review | harness/loop (review) | fallow `trace_export`/`symbol_impact`; gitnexus `detect_changes` |
| handoff | any (close) | codebase-memory `get_architecture` |
| diagnosing-bugs | loop | gitnexus `trace`/`detect_changes`; codebase-memory `trace`; fallow `health` |
| qa | loop (discovery) | codebase-memory `search_graph` for domain language |
| improving-codebase-architecture | graph | motion `boundary`/`check_health`; gitnexus-codebase / graphify `query` |
| codebase-design | graph | codebase-memory `get_code_snippet`; graphify `query` |
| domain-modeling | graph | codebase-memory `get_architecture` |
| grill-with-docs | graph | codebase-memory `get_architecture`; graphify `query` |
| improving-architecture | graph | fallow `boundary_violations`, `check_health`; graphify `query` |
| research | any | websearch; codebase-memory `search_graph` |
| prototype | harness (build) | codebase-memory `search_graph` |
| design-an-interface | harness (build) | codebase-memory `search_graph` |
| resolving-merge-conflicts | loop (repair) | gitnexus `detect_changes`, `cypher` |
| teach | any | codebase-memory `get_architecture` for examples |
| handoff | any (close) | none (compaction) |
| writing-great-skills | any (meta) | none |
| setup-matt-pocock-skills | any (setup) | none |
| triage | loop (govern) | codebase-memory `search_graph`; query github/gitlab |
| ask-matt | router | none (routes to others) |
| ubiquitous-language | graph (lang) | none |

## Rules of thumb

1. **Code discovery first**: `codebase-memory-mcp` (`search_graph`, `trace_path`) before grep/file-read.
2. **Architecture review first**: `fallow scan` + `graphify query` before manual review.
3. **Edit guard**: run `fallow guard` / gitnexus impact before changing a symbol; warn on HIGH/CRITICAL.
4. **All MCPs/git**: gitnexus + graphify need a git repo and an index; if missing, fall back to codebase-memory/fallow/grep.