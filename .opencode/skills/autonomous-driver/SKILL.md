# Autonomous Driver (agent operating rules)

This skill defines how a headless session must operate when dispatched by the
autonomous driver. It applies to ALL personas in autonomous mode.

## Operating rules

1. **Scope discipline** — work ONLY the item you were dispatched for. Never touch
   unrelated worktree files (the driver's WIP-isolation guard checks this).
2. **Branch** — you are on a dedicated branch (`fix/<issue>-<slug>` etc.). Commit
   only there. Never commit to `main`.
3. **Gate chain** (ticket 04) — every change passes: branch → TDD → biome → vitest
   → fallow (≤2 loops) → security_audit → code-review → changelog → push → PR.
4. **Conventions** (ticket 05) — conventional commit title with inline issue ref
   (`fix: resolve checkout crash (#123)`) + `Closes #123` trailer on fixes.
5. **MCP fallback** — if OmniRoute or MCP servers are down, degrade (never abort):
   note it and set `STATUS: needs-help` rather than silently failing.
6. **Never HITL** — the skills `grilling`, `prototype`, `wayfinder`, `qa` are
   excluded from autonomous flows. Do not invoke them. Do not ask the user
   (headless: `question` is denied) — state your need in `STATUS:`.
7. **Retry budget** (ticket 07) — max 3 fix attempts per item, then escalate.

## Report contract
End your final message with a line exactly like:

```
STATUS: done|needs-help|blocked
```

- `done` — work complete, branch verifiable, evidence provided.
- `needs-help` — you finished but need input (missing spec, ambivalent design).
- `blocked` — hard failure (won't compile, MCP down, permission denied).

Include a short evidence summary (what/why, test output, gate results) before the
STATUS line.