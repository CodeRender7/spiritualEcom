# Merge Policy (decision tree for agents)

Encodes ticket 06's merge policy so any agent can decide merge vs wait vs
ask-human without ambiguity. **This tree is authoritative.**

## Decision tree

```
Is the change prod-affecting (payments, auth, migrations, secrets)?
├─ YES → ask-human. ALWAYS requires human approval regardless of window. Never auto-merge.
└─ NO →
   Did a human approve the PR?
   ├─ YES → merge when CI green + self-review passed.
   └─ NO →
      Did a human comment / request changes / line-comment?
      ├─ YES → fix-again: respond, fix, re-present. 15-day window RESTARTS.
      └─ NO →
         Is the 15-day window still open (from PR open)?
         ├─ YES → wait.
         └─ NO →
            Self-review passed (code-review + detect_changes + WIP isolation)?
            ├─ NO → fix-again (retry budget: max 3, then escalate — never force-merge).
            └─ YES →
               CI green (typecheck+build)?
               ├─ NO → wait (re-run once first, then diagnose — ticket 07).
               └─ YES → merge (gh pr merge --auto --squash).
```

## Definitions
- **"No human response"** = no human reviews, comments, requested changes, or
  line-comments (bots excluded; the agent's own comments/reviews don't count).
- **Prod-affecting** paths (from config): settings API, webhooks, migrations,
  hyperswitch module, brm lib, `.env`.
- **Merges are squash-merge** with branch deletion (ticket 05/06).

## Report
State the branch of the tree you're on + your decision in the STATUS line.