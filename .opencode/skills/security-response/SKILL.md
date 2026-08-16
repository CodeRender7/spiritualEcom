# Security Response (CVE & vulnerability triage)

A dedicated playbook for the `security` persona. Invoked autonomously for
security-CVE items (ticket 04 tier 1, ticket 08). **Never used for routine work.**

## When to use
- Dependabot alerts / advisories / CVEs affecting the stack.
- CodeQL alerts.
- High-severity findings from `pnpm audit`, `osv-scanner`, `gh security`.

## Playbook

1. **Assess severity** — CVSS if present; reachability in this codebase (is the vulnerable path imported/used?).
2. **Classify urgency** (ticket 08):
   - **0-day / actively exploited** → IMMEDIATE: comment on the issue with `[agent]`, stop-the-line on that item, prepare mitigation PR in parallel.
   - **Routine CVE** → normal flow, fast-track into next patch release.
3. **Fix strategy** — prefer patch version bump; workaround only if no patch exists (document it).
4. **Authority** — you may unilaterally: patch bumps, config fixes, lockfile updates.
   NEVER without human sign-off: major bumps, auth/secret changes, payment code, data migrations.
5. **Gate chain** (ticket 04): branch → TDD → biome → vitest → fallow (≤2 loops) → security_audit → code-review → changelog → push → PR.
6. **Verify** (ticket 08): audit re-run clean, advisory status updated, regression tests pass.
7. **Report** — end with `STATUS: done` plus evidence (what/why, audit output, gate results).

## Authority boundaries (ticket 08)
| Action | Allowed alone? |
|---|---|
| Patch bumps, config fixes, lockfile updates | ✅ |
| Major bumps, auth/secret changes, payment code, data migrations | ❌ human sign-off |
| Dismissing CodeQL alerts | ✅ with recorded reason |

## Merge
Security fixes follow ticket 06 merge policy (15-day window; majors never silent → human).
Escalate via `[agent]` comment + stop-the-line for 0-days.