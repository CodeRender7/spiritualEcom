# D4 — Puppeteer PDF generation engine

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:task`
- Status: Open
- Blocking: D6, D7, D8
- Blocked by: D1, D2

## Question

How does the backend turn a rendered document template (HTML + `{{key:value}}` substituted) into a real PDF file — replacing the current browser print-to-PDF — using the D1-researched Puppeteer stack, without breaking the existing invoice/waybill routes?

## Decide + build

1. **`buildPdfFromHtml`**: singleton browser launch (once, reuse), render HTML → PDF buffer; page geometry (format, orientation, margins) from the D2 template config; header/footer/watermark support.
2. **Route upgrade**: `/store/orders/:id/invoice` and `/waybill` return real `application/pdf` (D1 options) while keeping a `?format=html` escape hatch for the existing renderer — existing consumers keep working.
3. **Graceful lifecycle**: Chromium shutdown on container stop, no zombie processes, memory bounded in the 30s-job context (reuse across renders).
4. **File handling**: PDF buffer → response / attachment seam for D6/D7 (in-memory or temp file; D8 may decide storage).

## Verification

- Typecheck + build green.
- Live: invoice + waybill PDFs generated from a real seeded order; headers/footers correct; content matches the HTML renderer.
- Existing HTML renderer still reachable via `?format=html`.