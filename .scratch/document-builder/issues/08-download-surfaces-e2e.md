# D8 — Storefront + admin download surfaces & E2E verification

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:task`
- Status: Open
- Blocking: —
- Blocked by: D4, D7

## Question

How do generated documents reach their end users — storefront download buttons, backend routes, and admin preview/download — and how do we prove the whole system works end-to-end with zero regression?

## Decide + build

1. **Storefront**: Download Invoice/Waybill/Receipt buttons on `/orders/[id]` + account order history (`storefront/src/app/orders/[id]/page.tsx`, `account/page.tsx`); add `fetchInvoice`/`fetchWaybill` to `storefront/src/lib/api.ts`; keep the mock fallback load-bearing.
2. **Admin preview/download**: admin page to preview/download any generated document for an order or subscription (reuse D4 engine + D2 templates).
3. **Backend routes**: `/store/orders/:id/invoice|waybill` already return real PDF (D4); receipts/transit-memo/e-bill routes added if needed for the binding surface.
4. **Seed the document gallery**: D2 seeds all six doc kinds with sensible `{{key:value}}` placeholders.
5. **E2E verification + no-regression sweep**: live harness — order → invoice PDF download from storefront; subscription renewal → bound document attached via email + WhatsApp; admin preview works; `pnpm turbo typecheck` + build green; regression sweep over whatsapp channel, BRM notify, settings pages, storefront mock fallback, admin kit pages. (final gate)

## Verification

- Typecheck + build green (2/2).
- Live harness all-green: storefront download, email attachment, WhatsApp file, admin preview.
- Regression sweep documented; docker-publish CI green.