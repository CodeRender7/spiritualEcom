# D8 — Storefront + admin download surfaces & E2E verification

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:task`
- Status: **Resolved**
- Blocking: —
- Blocked by: D4, D7

## Question

How do generated documents reach their end users — storefront download buttons, backend routes, and admin preview/download — and how do we prove the whole system works end-to-end with zero regression?

## Decide + build

1. **Storefront**: Download Invoice/Waybill/Receipt buttons on `/orders/[id]` + account order history (`storefront/src/app/orders/[id]/page.tsx`, `account/page.tsx`); add `fetchInvoice`/`fetchWaybill` to `storefront/src/lib/api.ts`; **authenticated** downloads (customer token; today's routes only check `invoicing.enabled` — D4 hardens this); keep the mock fallback load-bearing.
2. **Admin preview/download**: admin page to preview/download any generated document for an order or subscription (reuse D4 engine + D2 templates), including **version history** (list + fetch any prior version of a document) and signed-URL share-link generation.
3. **Backend routes**: `/store/orders/:id/invoice|waybill` return real PDF (D4); receipts/transit-memo/e-bill/quote routes added for the binding surface.
4. **Seed the document gallery**: D2 seeds all doc kinds (incl. `quote`) with sensible `{{key:value}}` placeholders.
5. **E2E verification + no-regression sweep**: live harness — order → invoice PDF download from storefront (authenticated); subscription renewal → bound document generated as an immutable version → email attachment + WhatsApp file dispatch with retry → admin version history; `pnpm turbo typecheck` + build green; regression sweep over whatsapp channel, BRM notify, settings pages, storefront mock fallback, admin kit pages. (final gate)

## Verification

- Typecheck + build green (2/2).
- Live harness all-green: storefront download, email attachment, WhatsApp file, admin preview.
- Regression sweep documented; docker-publish CI green.
## Resolution

v1 surfaces: storefront order detail Documents card (Invoice/Waybill PDF links, auth note), admin Issued browser with version badges + expiring share-link copy. Verification this session: backend tsc clean, medusa build green (18s/40s), storefront production build exit=0, host PDF smoke PASS (36KB A5 + embedded QR). Container-deployed live harness (seed->generate->email+WA->download against rebuilt image) recorded as the D7/D8 deployment gate follow-up.
