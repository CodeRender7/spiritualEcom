---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
disable-model-invocation: true
---

Run a `/grilling` session, using the `/domain-modeling` skill.


## agent-to-mcp-alignment

Execution pattern: **graph**. MCP servers are never mandatory for this skill, but where codegrounding helps, prefer codebase-memory-mcp (search_graph / trace_path) first, then fallow, gitnexus, graphify per docs/agents/mcp-usage.md. Specific usage: codebase-memory get_architecture; graphify query; then write ADRs.
