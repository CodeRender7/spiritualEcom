import puppeteer, { type Browser, type PaperFormat } from "puppeteer"
import QRCode from "qrcode"

/**
 * Puppeteer PDF engine (document-builder D4, per ADR-0002 §1 and the D1
 * research record `../document-builder/issues/01-pdf-stack-research.md`).
 *
 * Contract (from D1):
 *  - Alpine system chromium via PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
 *    (musl — Chrome-for-Testing cannot run on node:24-alpine);
 *  - singleton browser, lazily launched, reused across renders;
 *  - flags: --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage
 *    (root container + 64MB /dev/shm default);
 *  - page.pdf({ format: A4, printBackground: true, margins, timeout: 30s })
 *    returns Uint8Array → wrap Buffer.from();
 *  - graceful browser.close() on SIGTERM/SIGINT so no zombie Chrome remains.
 *
 * On Windows dev hosts without a system chromium on PATH, we probe the usual
 * Edge/Chrome install locations so `pnpm dev` can still render PDFs locally.
 */

let browserPromise: Promise<Browser> | null = null

const WINDOWS_BROWSER_PATHS = [
  `${process.env["ProgramFiles(x86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${process.env["ProgramFiles"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${process.env["LocalAppData"]}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env["ProgramFiles"]}\\Google\\Chrome\\Application\\chrome.exe`,
]

function resolveExecutablePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH
  }
  if (process.platform === "win32") {
    for (const p of WINDOWS_BROWSER_PATHS) {
      try {
        if (p && require("fs").existsSync(p)) return p
      } catch {
        /* probe next */
      }
    }
  }
  // Linux container default from the Dockerfile ENV; undefined lets puppeteer
  // try its own resolution last.
  return "/usr/bin/chromium-browser"
}

async function launchBrowser(): Promise<Browser> {
  const browser = await puppeteer.launch({
    executablePath: resolveExecutablePath(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  })

  const close = () => {
    browser.close().catch(() => {})
  }
  process.once("SIGTERM", close)
  process.once("SIGINT", close)
  process.once("exit", close)

  return browser
}

export function getPdfBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      // Allow a later request to retry a fresh launch instead of caching the
      // failure forever.
      browserPromise = null
      throw err
    })
  }
  return browserPromise
}

/** Page geometry carried by a `format:"pdf"` template row (D2 store). */
export type PdfGeometry = {
  pageSize?: string | null // A4 | A5 | Letter
  orientation?: string | null // portrait | landscape
  marginMm?: string | number | null // uniform margin in mm
  watermark?: string | null
}

const PAGE_FORMATS: Record<string, PaperFormat> = {
  A4: "A4",
  A5: "A5",
  Letter: "letter",
}

/**
 * Render an HTML string to a PDF buffer. One page per render off the shared
 * browser; the page is always closed. Media type is `print`, so existing
 * `@media print` rules keep working.
 */
export async function renderPdf(
  html: string,
  geometry: PdfGeometry = {}
): Promise<Buffer> {
  let browser: Browser
  try {
    browser = await getPdfBrowser()
  } catch (err: any) {
    throw new Error(`PDF engine unavailable (chromium): ${err?.message ?? err}`)
  }

  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 })

    if (geometry.watermark) {
      await page.evaluate((wm: string) => {
        const el = document.createElement("div")
        el.textContent = wm
        el.style.cssText =
          "position:fixed;top:45%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);" +
          "font-size:96px;font-weight:800;color:rgba(249,115,22,.12);" +
          "letter-spacing:14px;z-index:9999;pointer-events:none;white-space:nowrap;"
        document.body.appendChild(el)
      }, geometry.watermark)
    }

    const mm = String(geometry.marginMm ?? "12").replace(/[^0-9.]/g, "") || "12"
    const bytes = await page.pdf({
      format: PAGE_FORMATS[geometry.pageSize ?? "A4"] ?? "A4",
      landscape: geometry.orientation === "landscape",
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      margin: { top: `${mm}mm`, right: `${mm}mm`, bottom: `${mm}mm`, left: `${mm}mm` },
      timeout: 30_000,
    })
    return Buffer.from(bytes)
  } finally {
    await page.close().catch(() => {})
  }
}

/* ------------------------------------------------------------------ */
/* QR tokens                                                           */
/* ------------------------------------------------------------------ */

/**
 * Replace `{{qrcode:$key text}}` tokens with inline PNG QR images.
 *
 * Must run BEFORE `{{key:value}}` substitution (the generic renderer would
 * otherwise treat `qrcode` as a plain variable). Inside the payload, `$key`
 * references resolve from `vars`; unknown refs render as empty. The generated
 * <img> scales to its container (`max-width:100%`).
 */
export async function injectQrTokens(
  html: string,
  vars: Record<string, any>
): Promise<string> {
  if (!html || !html.includes("{{qrcode:")) return html

  const tokens = [...html.matchAll(/\{\{qrcode:([^}]*)\}\}/g)]
  const unique = new Set(tokens.map((m) => m[0]))
  for (const token of unique) {
    const rawPayload = token[1]
    const payload = rawPayload.replace(/\$(\w+)/g, (_f, key: string) => {
      const v = vars[key]
      return v === undefined || v === null ? "" : String(v)
    })
    let img = ""
    if (payload.trim()) {
      try {
        const dataUrl = await QRCode.toDataURL(payload.trim(), {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 220,
          color: { dark: "#111111", light: "#ffffff" },
        })
        img = `<img src="${dataUrl}" alt="QR" style="display:block;width:100%;max-width:120px;height:auto;margin:0 auto;" />`
      } catch (err) {
        console.error("QR token render failed:", err)
      }
    }
    html = html.split(token[0]).join(img)
  }
  return html
}
