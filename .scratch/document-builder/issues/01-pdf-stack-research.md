# D1 — PDF stack research (Puppeteer in Medusa Docker)

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:research`
- Status: **Resolved**
- Blocking: D4
- Blocked by: —

## Question

What server-side HTML→PDF stack should the document generator use, given the backend runs in Docker Compose (Medusa v2.18, Node, `docker-publish` CI is green and load-bearing) and no PDF library exists in the repo today?

## Research needed

1. **Puppeteer in the container**: which puppeteer package + version works in the backend image; what Dockerfile additions are needed (Chromium system deps, `--no-sandbox` flags for root containers, fonts); image size/memory impact.
2. **html→pdf options**: `page.pdf()` option mapping for A4 documents — format, printBackground, margins, headerTemplate/footerTemplate, preferCSSPageSize; how to render the existing `lib/invoice.ts` HTML (GST layout, saffron header, item table) faithfully.
3. **Runtime in the job context**: Chromium launch once vs per-request, process reuse in the 30s-job loop, memory footprint, graceful shutdown on container stop.
4. **Fallback**: if Chromium can't run in this image — playwright-core, wkhtmltopdf, or pdfmake as the degraded path.
5. **License/size**: puppeteer download behavior, bundled Chromium vs system Chrome.

## Deliverable

A recommendation record (installed package, Dockerfile diff sketch, launch flags, page.pdf options, fallback path) that D4 implements directly. Link any prototype/experiment from this ticket.

## Resolution

**Stack: `puppeteer@^25.7.0` + Alpine system `chromium` (musl), one shared lazy browser, root-sandbox/`/dev/shm` flags.** Researched against the actual repo files (backend/Dockerfile is `node:24-alpine`, pnpm 11 blocks puppeteer's postinstall already, backend compose service has no `shm_size`, jobs run `concurrency: "forbid"`, invoice.ts is a CSS-grid layout needing `printBackground`).

- **Package**: `puppeteer@^25.7.0` as a normal dep. `pnpm-workspace.yaml` already blocks its browser-download postinstall (only 4 packages allowlisted) → no Chrome download, which is what we want. `page.pdf()` in v25 returns `Uint8Array` → wrap `Buffer.from(bytes)`.
- **Dockerfile (runner stage)**: `apk add chromium font-noto-sans font-noto-sans-devanagari` (fonts for `₹` U+20B9 + Devanagari names; chromium pulls nss/gtk/fontconfig itself on Alpine — no hand-listed Debian deps); `ENV PUPPETEER_SKIP_DOWNLOAD=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`. Optional: `tini` as PID 1 for clean SIGTERM reaping (current ENTRYPOINT is bash).
- **Launch flags**: `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage` (root container + 64MB /dev/shm default). Singleton browser, lazy launch, reuse across renders, `browser.close()` on SIGTERM; one page per render (jobs forbid concurrency).
- **page.pdf() set**: `{ format: "A4", printBackground: true, margin: {top:"16mm",right:"12mm",bottom:"16mm",left:"12mm"}, timeout: 30_000 }`. Header/footer only if page numbers needed (needs `displayHeaderFooter:true` + ≥15mm margins + `.pageNumber`/`.totalPages` classes). Add `-webkit-print-color-adjust: exact` to invoice.ts style for faithful saffron.
- **Fallback path**: playwright-core (+ same Alpine chromium) if cross-engine needed; wkhtmltopdf rejected (archived 2023, no CSS grid, unpatched CVE-2022-35583 SSRF 9.8); pdfmake only as last resort (rebuilds layout in DSL). Realistic degraded option: Gotenberg (Chromium in own container) if arm64/QEMU blocks.
- **CI risks to flag for D4**: (1) QEMU-emulated `linux/arm64` docker-publish builds + 30-min timeout are the biggest risk — chromium layer ~140MB download under emulation; keep gha caching, consider measuring with a one-off workflow_dispatch before merging. (2) base-image digest pin may predate Alpine 3.24 → verify chromium version. (3) version drift between puppeteer 25.x and apk chromium — pin chromium if reproducibility matters. (4) commit pnpm-lock.yaml (Dockerfile uses --frozen-lockfile).

**Close**: resolved 2026-08-17.