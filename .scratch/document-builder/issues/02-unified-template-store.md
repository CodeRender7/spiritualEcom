# D2 — Unified template store: extend email_template to documents

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:task`
- Status: Open
- Blocking: D3, D4, D7
- Blocked by: —

## Question

How do document templates (waybill, transit memo, receipt, e-bill, payment receipt, invoice) get stored alongside the existing `email_template` gallery (E1, live: module + migration + CRUD + 13 seeds) so the builder (D5), renderer (D3), and dispatcher (D7) can consume them — without regressing the email gallery?

## Decide + build

1. **Store shape**: extend `email_template` with a kind discriminator vs a sibling `document_template` module (same MedusaService pattern). Consider: shared `{{key:value}}` placeholders, `design` JSON, page geometry (format: A4/A5/letter, orientation, margins), doc_kind enum, status, tags, category.
2. **Admin CRUD API** for document templates: list/filter (doc_kind, status, category), get, create, patch, delete, seed — mirroring `/admin/email-templates`.
3. **No regression**: email gallery endpoints + E1 seed behavior unchanged; document routes additive.

## Verification

- Typecheck + build green.
- Migration runs; document templates CRUD-able via admin API.
- Seed endpoint creates the document gallery (invoice, waybill, transit_memo, receipt, e_bill, payment_receipt).
- Email gallery intact (13 seeds, CRUD, reseed idempotent).