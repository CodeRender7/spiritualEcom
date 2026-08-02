# 04 — Seed + admin verification

- **Status:** closed
- **Type:** task

Verify `medusa exec ./scripts/seed-data.ts` produces 10 collections, 30+ products (with INR prices via `createProductsWorkflow`), the India/INR region, and that the admin user `admin@divinekart.com` can log in at `/app`.

Verified: 10 collections, 30 products (all published), India/INR region, admin login + `/app` 200.

Blocked by: 03
