---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.


## Agent-to-MCP & pattern alignment

Execution pattern: **harness**. MCP servers are never mandatory for this skill, but where codegrounding helps, prefer `codebase-memory-mcp` (search_graph / trace_path) first, then `fallow`, `gitnexus`, `graphify` per `docs/agents/mcp-usage.md`. Specific usage: codebase-memory `search_graph` / `trace_path`; fallow `guard` before editing; gitnexus `impact` on touched symbols.

## agent-to-mcp-alignment

Execution pattern: **harness**. MCP servers are never mandatory for this skill, but where codegrounding helps, prefer codebase-memory-mcp (search_graph / trace_path) first, then fallow, gitnexus, graphify per docs/agents/mcp-usage.md. Specific usage: codebase-memory search_graph; fallback fallow/gitnexus/graphify.
