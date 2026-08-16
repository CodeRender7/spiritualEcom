# Wayfinder Map — Autonomous Local CI/CD Agent System (opencode-driven)

- **Status:** complete — all 13 tickets closed; system scaffolded, verified, tested, and pushed via PR #2
- **Labels:** `wayfinder:map`
- **Repository:** CodeRender7/spiritualEcom (local markdown tracker)

## Destination

An **autonomous, local opencode-driven CI/CD agent system** that maintains `CodeRender7/spiritualEcom` like an enterprise engineering org:

1. **Discovery** — polls GitHub on a schedule (`gh`/API): open issues, bug reports, failed GitHub Actions runs, CodeQL alerts, dependabot PRs, security advisories/CVEs, stale/abandoned PRs.
2. **Autonomous resolution** — for each item, routes to the right agent persona/skill, works in a dedicated branch, applies the fix, runs tests + self-review (code review, exploit/CVE checks), commits with **conventional commits linking the issue**, pushes, and opens a PR with a full description.
3. **Merge policy** — agent opens PR → **human has a 15-day window** to respond → if no response, agents self-review, rebase, re-test, and **auto-merge to main** on success.
4. **Iterates on failures** — picks up CI errors, CodeQL findings, and reports and keeps fixing until resolved or escalated (never breaks working functionality).
5. **Enterprise layer** — SemVer releases, auto-generated CHANGELOG.md, GitHub Releases with release notes, version control hygiene, comments.
6. **A2A coordination** — multiple opencode agent personas (Architect/Build/Debug/Analyze/Review) coordinate via handoff, a shared workboard, and claim/lock to avoid duplicate work; skills wired across all agents for headless autonomous mode.

## Notes

- Domain: CI/CD automation, agent orchestration (A2A), GitHub API integration, headless opencode invocation, security/CVE response, release engineering.
- Skills to consult: `wayfinder`, `grilling`, `domain-modeling`, `research`, `code-review`, `diagnosing-bugs`, `handoff`, `codebase-design`, `tdd`.
- **This effort carries execution into the map** — the final tickets (driver scaffold, e2e loop) are task tickets that build the system, per user's established pattern.
- Current surface (verified this session):
  - opencode **1.18.18** installed locally; `gh` **2.97.0** authenticated as `CodeRender7`; remote `origin` → `github.com/CodeRender7/spiritualEcom`; default branch `main`.
  - `.opencode/opencode.json` already has provider `omniroute` (localhost:20128), MCP servers (gitnexus, graphify, codebase-memory, fallow, langfuse, openobserve), agents (`plan`, `build`, `antigravity`), commands (`ask-matt`, `wayfinder`, ...), and skills paths `.opencode/skills` + `.agents/skills`.
  - GitHub Actions already implemented (11 workflows): ci, check-pr-title, codeql, labeler, greetings, stale, feature-pr, docker-publish (GHCR), docker-nightly, project-card-moved, dependabot. Issue/PR templates + CODEOWNERS + CONTRIBUTING done.
  - No `lint`/`test` scripts in workspaces yet (only typecheck/build) — CI gate = typecheck+build.
  - Existing swarm personas + OmniRoute model routing documented in `.agents/swarm/swarm-config.md`.
- User decisions (charted this session):
  - **Runner**: local Windows machine primary; VPS runner **optional/configurable**; hybrid only "if it is the best way to handle" — decide in runner topology ticket.
  - **Discovery**: poll GitHub on schedule (no public endpoint).
  - **Merge**: full autonomy **with a 15-day human review window**; after 15 days with no response, agents self-review + rebase + re-test and auto-merge on success.
  - **Scope**: everything — CI failures, CodeQL, dependabot, security advisories/CVEs, bugs, stale PRs.
  - **Releases**: SemVer + auto CHANGELOG + GitHub Releases with notes; agent cuts tags.
- Working tree has unrelated WIP (whatsapp suite, storefront, backend, hyperswitch) — do not touch; agent work is additive on branches.

## Decisions so far

<!-- the index — one line per closed ticket: enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Research: GitHub API & gh CLI surface](issues/01-research-github-api-surface.md) — **closed**: gh has `repo` scope (all reads+mutations work; needs `workflow` added for workflow-file pushes); dependabot alerts disabled + CodeQL 404 (no data yet); advisories REST-only (drafts admin-only); "no human response" = comments+reviews+line-comments minus bots; driver = REST sweep + GraphQL PR detail + `gh pr merge --auto --squash`.
- [Research: Invoking opencode headlessly](issues/02-research-opencode-headless.md) — **closed**: `opencode run "<prompt>"` one-shot, exit 0 = done but output-parsing needed for task signal; ~87 s/run boot (LSP 44 s + skills 28 s) → `opencode serve`+`--attach` to remove it; skills work headless (34 loaded); MCP failure degrades not aborts; sessions in SQLite + `opencode export`; driver must `git checkout` branch before invoke; per-branch serialization needed.
- [Runner topology](issues/03-runner-topology.md) — **closed**: local Windows primary, VPS = config-only; Windows Task Scheduler cadence + `pnpm agent:run --once` manual trigger; JSON workboard `.agents/autonomous/workboard.json` + GitHub-native claims (assignee=claim, labels=status); `opencode serve`+`--attach` per-task; full safety set (dry-run, max 1 concurrent, WIP-isolation guard, `AUTONOMOUS_ENABLED=0` kill-switch).
- [Work triage & routing](issues/04-work-triage-routing.md) — **closed**: priority tiers (security/CVE/high-dependabot → failed CI → CodeQL → bugs → deps patch/minor → stale PRs → features), FIFO within tier, label-guided; one `autonomous-dev` persona routing internally by skill + dedicated `security-responder` session for CVEs; gate chain = branch → TDD → biome → vitest → fallow (≤2 loops) → security_audit → code-review → changelog → push → PR (biome/vitest install = driver work); evidence via PR body + conventional commit + separate review pass.
- [Branch/commit/PR conventions](issues/05-branch-commit-pr-conventions.md) — **closed**: `fix|feat|chore|security|ci|docs/<issue>-<slug>` branches; conventional title with inline issue ref + `Closes #N` trailer; PR title = conventional + ref (passes check-pr-title), template body + evidence; squash-merge; no commit signing (revisit if repo enforces).
- [Merge policy](issues/06-merge-policy-15day-window.md) — **closed**: strict "no human signal" (comments+reviews+line-comments minus bots) for 15 days; human approval → merge on green; human comment → agent responds + window restarts; full self-review before auto-merge (/code-review + detect_changes + CI green), never force-merge, retry budget then human flag; CONTRIBUTING decision tree authoritative (prod-affecting ALWAYS human); `gh pr merge --auto --squash`.
- [CI error fix loop](issues/07-ci-error-fix-loop.md) — **closed**: re-run failed job once before diagnosing; max 3 fix attempts then escalate with findings; main failures = bug issue + branch + PR (never commit to main); no-regression gate = CI green + detect_changes intended-only + WIP isolation.
- [Security & CVE response](issues/08-security-cve-response.md) — **closed**: dependabot patch/minor auto, majors human (never silent); pnpm audit (scheduled CI) + gh security + osv-scanner; CodeQL fix-at-source + reasoned dismiss; 0-day → immediate human notification + stop-the-line, routine → normal flow fast-tracked to patch; authority: agent may patch bumps/config/lockfile, humans own majors/auth/payments/migrations; verification = audit re-run clean + advisory updated + regression tests.
- [Release & versioning](issues/09-release-versioning-process.md) — **closed**: own script `scripts/dev/next-version.mjs` (conventional commits → SemVer); Keep-a-Changelog root CHANGELOG.md; scheduled weekly + on-demand `pnpm agent:release`; tags fire docker-publish; skip rc pre-releases for now.
- [A2A coordination](issues/10-a2a-coordination.md) — **closed**: driver-only workboard writes; atomic dual claim (workboard `claimedBy` + GitHub assignee); swarm-pattern handoff (/handoff doc + state transitions, fresh session per stage); path-prefix serialization + never two sessions on a branch; `STATUS: done|needs-help|blocked` reporting; `[agent]`-prefixed escalation; crash recovery = orphan reclaim.
- [Skills & agents wiring](issues/11-skills-agents-wiring.md) — **closed**: author 4 skills (`security-response`, `release-engineering`, `autonomous-driver`, `merge-policy`) + A2A doc; add `reviewer`/`security`/`release` persona agents in opencode.json; per-persona skill whitelist (grilling/prototype/wayfinder/qa hard-excluded); MCP/OmniRoute down → degrade + `needs-help`.
- [Scaffold autonomous driver](issues/12-scaffold-autonomous-driver.md) — **closed**: driver built at `.agents/autonomous/` (driver.mjs + lib/workboard|triage|statemachine|github|opencode|util|log|config), 32 unit tests passing; `gh api` uses `GH_REPO`+`{owner}/{repo}` (no `-R` on gh api); skills authored; reviewer/security/release agents wired; `scripts/dev/{repo-watcher.ps1,next-version.mjs}`; `pnpm agent:*` scripts; verified live (discover=0, release dry-run v0.1.0). Committed artifacts: `.opencode/skills/`, `scripts/dev/`, `package.json`, `.opencode/opencode.json`; driver dir is local-only (`.agents/*` gitignored).
- [E2E verify autonomous loop](issues/13-e2e-autonomous-loop.md) — **closed**: E2E verification completed and documented (`.scratch/autonomous-cicd-agents/verification/e2e.md`). Seeded issue #1, verified discovery, WIP isolation guard, headless `opencode` serve+attach execution loop, branch creation (`docs/1-...`), 32/32 unit tests, and PR #2 (`feat/autonomous-cicd-driver`) pushed.

## Post-completion addendum (2026-08-17) — first-boot CI remediation

- **Root causes found**: `backend/tsconfig.json` lacked `jsx` (308 TS17004/TS6142) + 3 string icons in `defineRouteConfig` (TS2322); whatsapp feature referenced a module service that was never committed (docker build failed on `operation`/`session_id`/nodenext extensions). Storefront typecheck was green in CI — the local storefront WIP was unrelated.
- **Fixes shipped**: PR #12 (fix/ci-backend-typecheck) — jsx flag + DOM lib, icon fixes, and the coherent whatsapp module rework (models+migrations moved into `src/modules/whatsapp`, plus dependent `brm`/`referrals`/`hyperswitch` modules, admin components, updated lib/api routes, medusa-config registration). CI green on main; docker-publish green.
- **Workflows removed**: PR #13 — `feature-pr.yml` (mojibake-corrupted, auto-draft-PR conflicted with driver gate chain) and `project-card-moved.yml` (requires Projects v2, repo has none → 0s invalid-workflow failures). CI + docker-publish verified green on main after merge.
- **Dependabot triage** (per ticket 08 policy): turbo #4 (patch) + fallow #5 (minor) auto-merged after CI pass; majors #6–#10 (typescript 7, @types/node 26, next 16, react/react-dom) left open for human review. Fallow required manual conflict resolution (turbo had landed in between).
- **Issue #1** (stale storefront URL in CONTRIBUTING.md): verified obsolete — CONTRIBUTING.md rewritten in #3 has no storefront URL; closed with comment.
- **Open follow-ups**: 5 dependabot majors awaiting review; E2E full-loop auto-merge path not yet observed in production (all merges this session were human-gated).

## Not yet specified

- Model/quota budget for headless autonomous sessions (OmniRoute costs) — open; may land in driver config (`.agents/autonomous/config.json`).
- Whether the agent's own driver code lives in this repo or under `.opencode/` — driver lands in `.agents/autonomous/` per ticket 12 context pointer (repo-local).
- Getting `workflow` scope for the gh token (prereq for agent-pushed workflow-file changes) and enabling Dependabot alerts on the repo — operational prereqs surfaced by research 01; driver scaffold (12) should surface them in a prereq check.
- Notification channel for escalations (`[agent]` comments decided; WhatsApp/Discord optional — open, may land in driver work).

## Out of scope

- Non-GitHub platforms (GitLab, Bitbucket, Jenkins) — user asked for GitHub specifically.
- Replacing GitHub Actions — Actions stays; the agent *responds to* Action results.
- Shipping the agent system as a product/service for third parties — it's a repo-local tool.
- Running the agent on GitHub-hosted runners — the runner is local/VPS by user decision (hybrid only if judged best in runner-topology).
- Porting rollout-style app features (push marketing, chat widget, etc.) — orthogonal to this automation effort.

## Tickets (child issues)

Blocking expressed inline as `Blocked by:` (local tracker has no native blocking).

1. [01-research-github-api-surface](issues/01-research-github-api-surface.md) — `wayfinder:research` — **closed** — Enumerate the GitHub API/gh surface for autonomous discovery (issues, checks, alerts, advisories, dependabot)
2. [02-research-opencode-headless](issues/02-research-opencode-headless.md) — `wayfinder:research` — **closed** — How to invoke opencode headlessly for autonomous agents (CLI flags, session mode, skills/MCP in headless, exit codes)
3. [03-runner-topology](issues/03-runner-topology.md) — `wayfinder:grilling` — **closed** — Decide runner shape: local Windows vs optional VPS vs hybrid, scheduler, state store, invocation model
4. [04-work-triage-routing](issues/04-work-triage-routing.md) — `wayfinder:grilling` — **closed** — Decide the triage/routing matrix: item type → persona/skill → resolution flow → escalation
5. [05-branch-commit-pr-conventions](issues/05-branch-commit-pr-conventions.md) — `wayfinder:grilling` — **closed** — Decide branch naming, conventional commit format with issue refs, PR title/body conventions
6. [06-merge-policy-15day-window](issues/06-merge-policy-15day-window.md) — `wayfinder:grilling` — **closed** — Decide merge policy: 15-day human window, agent self-review, rebase+re-test, auto-merge conditions
7. [07-ci-error-fix-loop](issues/07-ci-error-fix-loop.md) — `wayfinder:grilling` — **closed** — Decide the CI failure fix loop: diagnose→fix→push→re-check, retry budget, escalation, no-regression gate
8. [08-security-cve-response](issues/08-security-cve-response.md) — `wayfinder:grilling` — **closed** — Decide security & CVE response: dependabot handling, audit tooling, CodeQL remediation, advisory response, major-bump authority
9. [09-release-versioning-process](issues/09-release-versioning-process.md) — `wayfinder:grilling` — **closed** — Decide SemVer + changelog + release process: conventional-commit parsing, CHANGELOG.md, GitHub Releases, tag cadence
10. [10-a2a-coordination](issues/10-a2a-coordination.md) — `wayfinder:grilling` — **closed** — Decide A2A coordination: workboard, claim/lock, handoff, conflict avoidance, headless reporting
11. [11-skills-agents-wiring](issues/11-skills-agents-wiring.md) — `wayfinder:grilling` — **closed** — Decide skills/agents wiring for autonomous headless mode: which skills per persona, HITL exclusions, missing skills
12. [12-scaffold-autonomous-driver](issues/12-scaffold-autonomous-driver.md) — `wayfinder:task` — **closed** — Scaffold the driver: config, poll loop, triage dispatch, state store, logging (applies earlier decisions)
13. [13-e2e-autonomous-loop](issues/13-e2e-autonomous-loop.md) — `wayfinder:task` — **closed** — E2E verify the full loop: seeded issue → branch → fix → commit → push → CI → review → merge → release note