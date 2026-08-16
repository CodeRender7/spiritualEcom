# D5 — Drag-and-drop document template builder UI

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:task`
- Status: Open
- Blocking: D6, D7
- Blocked by: D2, D3

## Question

How does the admin dashboard get a drag-and-drop template builder for PDF documents (waybill, transit memo, receipt, e-bill, payment receipt, invoice) — and the email builder — per the user's combined directive (custom document designer on `@medusajs/ui` + Unlayer for email + dnd-kit/grid where fitting)?

## Decide + build

1. **Document designer canvas**: admin page `/documents/templates/[id]/edit` + list page — drag placeholder blocks (header, line-items table, totals, signature, QR, footer) onto a page canvas; insert `{{key:value}}` chips from the D3 catalog (typed, suggestive); page geometry controls (A4/A5, portrait/landscape, margins); live HTML + PDF preview (D4 engine).
2. **Email builder**: absorb email-builder E2 — Unlayer `react-email-editor` on `/email-templates/[id]/edit` (loadDesign/saveDesign/exportHtml round-trip, placeholder picker). Verify Unlayer CDN/no-key behavior in the deployed admin; fallback if unreachable.
3. **Admin kit fit**: pages use the A2 kit components (`SectionCard`, `PageHeader`, etc.), route via `defineRouteConfig`, save via the D2 API.
4. **No regression**: existing settings/whatsapp/brm admin pages untouched.

## Verification

- Typecheck + build green.
- Live: create a waybill template by dragging blocks + placeholders; save → reload → PDF preview renders.
- Email builder round-trips a saved Unlayer design (load → edit → export → save).
- Existing admin pages intact.