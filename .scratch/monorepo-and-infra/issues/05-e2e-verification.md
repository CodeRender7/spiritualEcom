# 05 — End-to-end verification

- **Status:** closed
- **Type:** task

`docker compose up --build -d`; verify `/health`, `/store/products`, `/store/collections`, storefront `:8000` renders real data, `docker compose ps` healthy, admin login works. Run `pnpm turbo typecheck`/`build` locally. Update README/task.md. Code-review the diff.

Verified: all 4 services healthy; `/health` 200; `/store/products` 30 + `/store/collections` 10 (via seeded publishable key); storefront `:8000` renders seeded products across `/`, `/products`, `/collections`, `/products/[handle]`; local `pnpm turbo typecheck` + `build` green; README/task.md updated.

Blocked by: 04
