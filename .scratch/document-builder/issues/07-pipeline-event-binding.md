# D7 — Pipeline event → template binding + dispatcher consumption

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:task`
- Status: Open
- Blocking: D8
- Blocked by: D2, D3, D4, D5, D6

## Question

How do workflow-pipeline stages bind a document template (and/or email template) so the dispatcher generates the PDF and sends it as an attachment through email (D6) + WhatsApp — with suggestive template selection and per-event override — without regressing the BRM notification flow or WhatsApp channel?

## Decide + build

1. **Binding surface**: extend the admin `/brm/notifications` page (and add order + payment event binding) so each pipeline stage can bind a document template + email template; the UI suggests templates whose placeholder keys ⊆ event's available keys (D3), per-event override stays possible.
2. **Binding storage**: extend the `brm_notify` settings blob (and order/payment config) with `template_id` references for document + email templates, keeping the A5 config shape for back-compat.
3. **Dispatcher**: on each pipeline event (BRM 8 + order placed/shipped + payment captured/refunded), render the bound template → generate PDF (D4) → **persist as an immutable document version** → send via email attachment (D6) and/or WhatsApp file send (`sendFileFromUrl`) with a caption carrying details + authenticated download link and a background retry job on gateway disconnect; falls back to the inline body/template when unbound (no regression).
4. **Trigger mechanics** (user decision): event-driven Medusa subscribers for async/background processing **and** a reusable Medusa workflow step (`generateDocumentStep`) injectable into synchronous pipelines, plus manual admin "re-send/download" override.
5. **Absorbs email-builder E3** (process-event binding + suggestive config).

## Verification

- Typecheck + build green.
- Live: bind a renewal-failure document template; trigger a renewal failure; dispatcher generates the PDF and sends it (email attachment + WhatsApp file).
- Unbound events still send the inline body exactly as before.