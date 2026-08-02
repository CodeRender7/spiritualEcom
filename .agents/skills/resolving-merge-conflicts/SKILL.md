---
name: resolving-merge-conflicts
description: "Use when you need to resolve an in-progress git merge/rebase conflict."
---

1. **See the current state** of the merge/rebase. Check git history, and the conflicting files.

2. **Find the primary sources** for each conflict. Understand deeply why each change was made, and what the original intent was. Read the commit messages, check the PRs, check original issues/tickets.

3. **Resolve each hunk.** Preserve both intents where possible. Where incompatible, pick the one matching the merge's stated goal and note the trade-off. Do **not** invent new behaviour. Always resolve; never `--abort`.

4. Discover the project's **automated checks** and run them â€” typically typecheck, then tests, then format. Fix anything the merge broke.

5. **Finish the merge/rebase.** Stage everything and commit. If rebasing, continue the rebase process until all commits are rebased.


## Agent-to-MCP & pattern alignment

Execution pattern: **loop**. MCP servers are never mandatory for this skill, but where codegrounding helps, prefer `codebase-memory-mcp` (search_graph / trace_path) first, then `fallow`, `gitnexus`, `graphify` per `docs/agents/mcp-usage.md`. Specific usage: gitnexus `detect_changes`; codebase-memory `get_code_snippet` on conflict regions.
