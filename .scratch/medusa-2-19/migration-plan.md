# Medusa v2.18.0 → v2.19.0 Migration Plan

- Status: **Executed 2026-08-24** — PR #29 merged (9e8e752); all gates green; multi-arch publish success in 6m26s; five dependabot majors closed. UI browser-walkthrough deferred (admin shell + custom API routes verified live; bundle compiled under Vite 7).
- Scope: five dependabot majors — @medusajs/framework (#22), admin-bundler (#23), file-s3 (#24), cli (#16), admin-sdk (#18)
- Out of scope: next 16, typescript 7, @types/node 26, react/react-dom majors, CI action bumps (separate efforts)
- Source: official release notes https://github.com/medusajs/medusa/releases/tag/v2.19.0

## Breaking changes in 2.19.0 vs. our codebase — audit results

| # | Official breaking change | Our exposure | Verdict |
|---|---|---|---|
| B1 | **Admin moves to Vite 7 + React Router 7**; requires direct deps `vite@7.3.6`, `react-router-dom`+`react-router@7.18.2`; Node ≥20.19/22.12 | We run 9 custom admin pages/components importing react-router-dom (`useNavigate`/`useParams`) — APIs unchanged in RR7; dnd-kit + Unlayer ride through Vite's admin build | ⚠️ Action required (deps + verify) |
| B2 | Removed Vite config options: `build.target:"modules"`, `splitVendorChunkPlugin`, `resolve.conditions` now replaces defaults | Our `admin.vite` is a delta-function returning only a `resolve.alias` remap — none of the removed options used | ✅ Safe |
| B3 | `Response.json()` removed (browser-floor raise) | Grep across backend/src + storefront/src: **zero hits** | ✅ Safe |
| B4 | `defer()` removed; `UIMatch.data` → `loaderData` | Zero hits; we use no custom breadcrumbs/loaders | ✅ Safe |
| B5 | JS SDK product-option methods removed | We never import `@medusajs/js-sdk`; storefront uses raw fetch | ✅ Safe |
| B6 | Carts/orders `*` field selects now include computed totals (perf note) | All `fields:["*"]` sites are on OUR whatsapp broadcast/chat tables, not carts/orders. Order reads use explicit selects (`fetchOrderForInvoice`) | ✅ Safe (perf note only) |
| B7 | file-s3: preserve directory portion of filename in object key (#16010) | Our filenames are flat (no dirs) → generated keys unchanged | ✅ Safe |
| B8 | DML `.json<T>()` typed generics (additive) | Optional nicety for `design/placeholders/metadata` later | ✅ No action |

### Storage-path check (critical seam from document-builder)

Verified against published `@medusajs/file-s3@2.19.0`: still **no native** `force_path_style`; both `additional_client_config` / `additionalClientConfig` remain supported. Our path-style workaround carries over **unchanged**.

## Migration phases

**Phase 0 — Prep**
Branch `chore/medusa-2-19`. Record current green run ids as rollback reference.

**Phase 1 — Dependency alignment (one commit)**
1. Update all five `@medusajs/*` packages to `^2.19.0` (fold dependabot branches into this PR).
2. Add backend direct devDeps per B1: `vite@^7.3.6`, `react-router-dom@^7.18.2`, `react-router@^7.18.2`.
3. `pnpm install`; commit lockfile.
4. Confirm engines: Docker runs node:24 ✓; local host on v24.x ✓.

**Phase 2 — Code adjustments (driven by greps above; expected near-zero)**
- Re-run breaking-API greps post-install; fix any new hits.
- Read installed file-s3 dist to re-confirm option contract (done pre-flight for 2.19; repeat mechanically).

**Phase 3 — Verification gates (all must pass before merge)**
1. `tsc --noEmit` backend + storefront.
2. `medusa build` (compiles admin bundle under Vite 7 — the real B1 test for dnd-kit/Unlayer).
3. Storefront production build.
4. Container rebuild + live harness re-run: auth → seed → generate invoice vN+1 → MinIO fetch (%PDF) → share-link redemption → store route.
5. Admin UI smoke over HTTP-reachable routes: `/documents/templates`, editor tabs (Code/Sections/Canvas), `/documents/issued`, `/email-templates/[id]/edit`, `/settings`, `/whatsapp`, `/brm/notifications`.
6. PR checks green; multi-arch docker-publish success on merge.

**Phase 4 — Land & watch**
Single squashed PR: `chore(deps): medusa v2.19.0 (framework, admin-bundler, file-s3, cli, admin-sdk)` with `Closes #16 #18 #22 #23 #24`. Post-merge: watch main CI + docker-publish.

## Rollback
Revert the squash commit; GHCR retains prior `sha-*` tags for immediate image rollback. DB migrations in 2.19 are additive core-only (no destructive ops noted); no custom-migration changes ship in this PR.

## Effort & risk
- Effort: one session (~2–4 h wall-clock incl. two container rebuilds).
- Overall risk: **Medium-low.** Every enumerated break either misses us or needs only dependency alignment; residual risk concentrates in Vite-7 bundling of our admin widget deps (dnd-kit, Unlayer) — covered by gate 2 + 5.

## Open decisions for you
1. Approve proceeding as **one combined PR** for all five packages (recommended — they must move together).
2. Confirm unrelated majors (next 16 / TS 7 / react) stay parked for separate review.
