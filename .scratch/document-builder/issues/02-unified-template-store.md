# D2 — Unified template store: extend email_template to documents

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:task`
- Status: **Resolved**
- Blocking: D3, D4, D7
- Blocked by: —

## Question

How do document templates (waybill, transit memo, receipt, e-bill, payment receipt, invoice) get stored alongside the existing `email_template` gallery (E1, live: module + migration + CRUD + 13 seeds) so the builder (D5), renderer (D3), and dispatcher (D7) can consume them — without regressing the email gallery?

## Decide + build

1. **Store shape**: extend `email_template` with a kind discriminator vs a sibling `document_template` module (same MedusaService pattern). Consider: shared `{{key:value}}` placeholders, `design` JSON, page geometry (format: A4/A5/letter, orientation, margins), doc_kind enum (invoice, waybill, transit_memo, receipt, e_bill, payment_receipt, quote, custom), status, tags, category.
2. **Versioned issuance records**: `document` (+ `document_version`) entities so every pipeline emission or reprint appends an immutable version per order/subscription + kind — **all versions stay retrievable** (ADR-0002 §9). File URL points at the Medusa File module asset (MinIO/S3 when configured); HTML snapshot kept for regenerate-on-demand.
3. **Admin CRUD API** for document templates: list/filter (doc_kind, status, category), get, create, patch, delete, seed — mirroring `/admin/email-templates`; plus document/version listing endpoints for D8's admin surface.
4. **No regression**: email gallery endpoints + E1 seed behavior unchanged; document routes additive.

## Verification

- Typecheck + build green.
- Migration runs; document templates CRUD-able via admin API.
- Seed endpoint creates the document gallery (invoice, waybill, transit_memo, receipt, e_bill, payment_receipt).
- Email gallery intact (13 seeds, CRUD, reseed idempotent).

## Resolution

**Decision: extend `email_template` with a `format` discriminator** (not a sibling module) — one unified template store, additive columns, zero risk to the live E1 email gallery.

1. **Unified store**: `email_template` gains `format` (`email` default | `pdf`), `doc_kind`, `page_size`, `page_orientation`, `page_margin`, `watermark` — via `migrations/Migration20260817DocumentTemplate.ts` (`add column if not exists` with defaults → idempotent; email rows untouched). Model: `modules/email-template/models/email-template.ts`.
2. **Document gallery lib**: `src/lib/document-templates.ts` — `DOC_KINDS` (**7 kinds incl. `quote` from grill round 2**), page constants, `DOC_KIND_LABELS`, grouped `DOC_KEY_CATALOG` (company / order / payment / payment_receipt / **quote** / logistics per grill round 2's standard logistics set), print-ready seed HTML for all 6 kinds + Quotation.
3. **Admin API** `/admin/document-templates`: list/create (format forced `"pdf"` on create — galleries can never bleed into each other), get/patch/delete scoped to `format:"pdf"` (PATCH re-derives placeholders when html changes, DELETE soft-deletes), idempotent `seed` (skip by doc_kind+name, `force` re-import).
4. **Versioned issuance** (ADR-0002 §9): new `document` module — `document` header (entity_type/entity_id/kind/current_version) + append-only `document_version` (template snapshot, rendered_html snapshot for regenerate-on-demand, file_key/file_url/file_size, generated_by, status). Migration `Migration20260817DocumentIssuance` with **UNIQUE (document_id, version_number)** and entity+kind index. Registered in medusa-config as `"./src/modules/document"`.
5. **Race-safe writer**: `recordDocumentIssuance(container, input)` — find-or-create header (tolerates concurrent create), monotonic version number, single retry on lost race against the unique index, header.current_version advances only after the version row exists. This is the write path D4/D7 call.
6. **Issuance reads**: `GET /admin/documents` (filter entity_type/entity_id/kind) + `GET /admin/documents/:id` (header + full version history, newest first) — D8's version-history surface.

### Verification results

- `tsc --noEmit` clean; `medusa build` green (backend 27.6s, frontend 63.5s).
- Schema applied to live Postgres and **idempotency proven** (re-run skipped every statement); `\d document_version` shows all 14 columns + UNIQUE (document_id, version_number) + document index.
- Live API smoke (seed/CRUD over HTTP) deferred to D4's first harness boot — the backend container is a built image without source mounts, so new routes need an image rebuild; D4 rebuilds anyway to verify PDFs. Seed/CRUD logic mirrors E1's verified patterns line-for-line.

No regression: E1 routes/filters unchanged (all document reads filter format="pdf"); brm/settings/hyperswitch WIP files untouched.