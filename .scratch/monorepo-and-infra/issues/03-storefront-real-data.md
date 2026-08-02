# 03 — Storefront real-data URL resolution

- **Status:** closed
- **Type:** task

`storefront/src/lib/medusa.ts` uses `NEXT_PUBLIC_MEDUSA_BACKEND_URL` for all fetches; inside the storefront container that is the container's own `localhost:9000`, so server-side renders fall back to Mock data forever. Resolve `MEDUSA_BACKEND_URL` (http://backend:9000) for server-side fetches, keep `NEXT_PUBLIC_MEDUSA_BACKEND_URL` for the browser. Keep the Mock fallback.

Verified: `getMedusaUrl()` uses `MEDUSA_BACKEND_URL` server-side, `NEXT_PUBLIC_*` in browser; publishable key header added; pages `force-dynamic`; storefront renders real seeded data with Mock fallback preserved.

Blocked by: 02
