# D4 — Puppeteer PDF generation engine

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:task`
- Status: Open
- Blocking: D6, D7, D8
- Blocked by: D1, D2

## Question

How does the backend turn a rendered document template (HTML + `{{key:value}}` substituted) into a real PDF file — replacing the current browser print-to-PDF — using the D1-researched Puppeteer stack, without breaking the existing invoice/waybill routes?

## Decide + build

1. **`buildPdfFromHtml`**: singleton browser launch (once, reuse), render HTML → PDF buffer; page geometry (format, orientation, margins) from the D2 template config; header/footer/watermark support; **verification QR generation** for e-bill/waybill (QR lib choice: `qrcode` npm → data-URL/SVG embedded in HTML — D3/D4 settle the contract).
2. **Versioned persistence**: pipeline-emitted PDFs persist as immutable `document_version` records via Medusa's File module (**MinIO/S3** when configured, local uploads otherwise); HTML snapshot stored alongside so any version can regenerate if the file goes missing; TTL-cleanup setting honored.
3. **Route upgrade**: `/store/orders/:id/invoice` and `/waybill` return real `application/pdf` (D1 options) while keeping a `?format=html` escape hatch for the existing renderer — existing consumers keep working. **Access hardens**: authenticated customer download by default (today only `invoicing.enabled` is checked); expiring signed URLs issued for share contexts (WhatsApp caption links).
4. **Graceful lifecycle**: Chromium shutdown on container stop (tini consideration from D1), no zombie processes, memory bounded in the 30s-job context (reuse across renders).

## Verification

- Typecheck + build green.
- Live: invoice + waybill PDFs generated from a real seeded order; headers/footers correct; content matches the HTML renderer.
- Existing HTML renderer still reachable via `?format=html`.