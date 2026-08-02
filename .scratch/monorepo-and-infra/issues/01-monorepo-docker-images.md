# 01 — Monorepo-aware Docker images

- **Status:** closed
- **Type:** task

Rewrite `backend/Dockerfile` and `storefront/Dockerfile` to install with pnpm from the repo-root build context (corepack, `pnpm install --frozen-lockfile`), and update `docker-compose.yml` build contexts (`dockerfile: backend/Dockerfile` etc.). Backend runner must be standalone-runnable (`medusa start`), include `postgresql-client` for the DB wait, and expose the built `.medusa` output.

Verified: both images build from repo-root with pnpm; backend runner runs `medusa start` and installs `postgresql-client`; compose uses repo-root contexts.

Blocked by: nothing (monorepo foundation done).
