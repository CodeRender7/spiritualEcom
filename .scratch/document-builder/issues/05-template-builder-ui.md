# D5 — Drag-and-drop document template builder UI

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:task`
- Status: Open
- Blocking: D6, D7
- Blocked by: D2, D3

## Question

How does the admin dashboard get a drag-and-drop template builder for PDF documents (waybill, transit memo, receipt, e-bill, payment receipt, invoice) — and the email builder — per the user's combined directive (custom document designer on `@medusajs/ui` + Unlayer for email + dnd-kit/grid where fitting)?

## Decide + build

1. **Document designer — three modes** (user decision, ADR-0002 §4): (a) **sectional block builder** on dnd-kit — drag/reorder document sections (header, addresses, item table, totals, logistics/QR block, signature, footer) with inline rich text + `{{key:value}}` chip picker from the D3 catalog; (b) **free-form absolute canvas** for fixed single-page labels (waybill); (c) **raw HTML/CSS code-editor toggle** (hybrid) for advanced customization. Page geometry controls (A4/A5/letter, portrait/landscape, margins). **Live split-screen PDF preview** through the D4 engine.
2. **Email builder**: absorb email-builder E2 — Unlayer `react-email-editor` on `/email-templates/[id]/edit` (loadDesign/saveDesign/exportHtml round-trip, placeholder picker). Verify Unlayer CDN/no-key behavior in the deployed admin; the code-editor mode is the natural fallback if unreachable.
3. **Admin kit fit**: pages use the A2 kit components (`SectionCard`, `PageHeader`, etc.), route via `defineRouteConfig`, save via the D2 API.
4. **No regression**: existing settings/whatsapp/brm admin pages untouched.

## Verification

- Typecheck + build green.
- Live: create a waybill template by dragging blocks + placeholders; save → reload → PDF preview renders.
- Email builder round-trips a saved Unlayer design (load → edit → export → save).
- Existing admin pages intact.