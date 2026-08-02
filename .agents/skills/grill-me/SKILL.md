---
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
---

Run a `/grilling` session.


## Agent-to-MCP & pattern alignment

Execution pattern: **any**. MCP servers are never mandatory for this skill, but where codegrounding helps, prefer `codebase-memory-mcp` (search_graph / trace_path) first, then `fallow`, `gitnexus`, `graphify` per `docs/agents/mcp-usage.md`. Specific usage: No MCP; pure interview.
