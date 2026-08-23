# D3 — Document placeholder catalog + renderer lib

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:task`
- Status: **Resolved**
- Blocking: D5, D6
- Blocked by: D2

## Question

How does the existing `{{key:value}}` machinery (`backend/src/lib/email-templates.ts`: `parsePlaceholders`, `renderEmailString/Html/Subject`, `EVENT_AVAILABLE_KEYS`, `suggestTemplatesForEvent`) generalize so document templates can be authored with the same placeholder syntax and rendered with full data (order, customer, line items, totals, payment, subscription/renewal, company/invoicing settings)?

## Decide + build

1. **Shared lib**: rename/refactor into a template renderer serving both email and documents (keep `renderEmailString`/`renderEmailHtml` callers working — e.g. `brm-notify.ts`).
2. **Key catalog per document kind**: extend `EVENT_AVAILABLE_KEYS` with the keys each document needs — waybill/transit-memo **standard logistics set** (vehicle no., driver contact, dispatch hub, destination hub, package weight/count, carrier name, transit pass ID, verification QR reference), payment receipt (transaction ref, mode, gateway, amount), e-bill (GST fields + QR reference; IRN fields render dynamically only when present in metadata), invoice/waybill (existing invoicing settings: company_name, gstin, address). Keys carry type hints (string/number/date/currency/address/line-item list) for the builder's suggestive config.
3. **Dynamic metadata placeholders**: arbitrary keys from `order.metadata` / shipment / subscription metadata resolve as placeholders (fully custom per admin) alongside the typed built-ins.
4. **Data source**: a `collectDocumentVars` that assembles the runtime vars from order + payment + subscription + settings, so render and builder-preview share one source of truth.
5. **Suggestive selection** for documents: `suggestTemplatesForEvent` extended so event→document binding suggests templates whose keys ⊆ event's available keys.

## Verification

- Typecheck + build green.
- Unit-level render of a document template with `{{key:value}}` substitution from a real order/subscription.
- Email renderers + `EVENT_AVAILABLE_KEYS` consumers unchanged (no regression).
## Resolution

EVENT_DOC_KEYS per event/kind (BRM8+order/payment/docs); subscription+refund catalog groups; suggestDocTemplatesForEvent (specificity-ranked, qrcode-aware); collectOrderVars moved into shared lib + collectSubscriptionVars (mirrors brm buildVars naming) + collectDocumentVars resolver; dynamic metadata merge (built-ins win). generateDocument now supports entityType subscription.
