import { Modules } from "@medusajs/framework/utils"
import { renderEmailHtml } from "./email-templates"
import { renderPdf, injectQrTokens, type PdfGeometry } from "./pdf"
import {
  recordDocumentIssuance,
  resolveDocumentService,
  resolveDocumentTemplateService,
  collectOrderVars,
  collectSubscriptionVars,
  type DocKind,
} from "./document-templates"
import { buildInvoiceDocument, fetchOrderForInvoice } from "./invoice"
import crypto from "crypto"

/**
 * Document generation engine (document-builder D4, ADR-0002).
 *
 * Two paths:
 *  1. **Template path** — `generateDocument()`: pick an active `format:"pdf"`
 *     template (D2 store), substitute `{{key:value}}` vars (+ `{{qrcode:}}`
 *     tokens), render a real PDF via Puppeteer, persist an immutable
 *     `document_version` (D2) with the HTML snapshot, and best-effort upload
 *     the file through the Medusa File module (MinIO/S3 in compose). If the
 *     upload fails, the version still exists with its snapshot → regenerate
 *     on demand. This is the durable pipeline path D7 consumes.
 *
 *  2. **Legacy path** — `serveOrderDocument()`: the pre-existing invoice /
 *     waybill HTML renderer (`lib/invoice.ts`) upgraded to return a real PDF
 *     by default with a `?format=html` escape hatch. Stateless by design (no
 *     version rows): behavior-compatible with today's route, now hardened to
 *     require authentication (admin, or the owning customer).
 *
 * Share links: HMAC-signed expiring tokens so WhatsApp captions (D7) can carry
 * a URL that stops working after its TTL.
 */

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Template path                                                       */
/* ------------------------------------------------------------------ */
export type GenerateDocumentOptions = {
  kind: DocKind | string
  entityId: string
  entityType?: "order" | "subscription" | string
  templateId?: string
  generatedBy?: string
  /** Event-specific vars (amount/attempts/next_retry from BRM renewals, refund ids, …). */
  extraVars?: Record<string, string | number | null | undefined>
}

export type GenerateDocumentResult = {
  buffer: Buffer
  html: string
  template: any
  document: any
  version: any
  fileUrl: string | null
}

/**
 * Generate a document for an entity through the D2 template store, persisting
 * an immutable version. Never throws on File-module outage — reliability comes
 * from the HTML snapshot + regenerate-on-demand.
 */
export async function generateDocument(
  container: any,
  options: GenerateDocumentOptions
): Promise<GenerateDocumentResult> {
  const templates = resolveDocumentTemplateService(container)

  let template: any | undefined
  if (options.templateId) {
    const rows = await templates.listEmailTemplates(
      { id: options.templateId, format: "pdf" },
      { take: 1 }
    )
    template = rows[0]
  } else {
    const rows = await templates.listEmailTemplates(
      { format: "pdf", doc_kind: options.kind, status: "active" },
      { take: 1, order: { created_at: "ASC" } }
    )
    template = rows[0]
  }
  if (!template) {
    throw new Error(`No active pdf template for doc_kind "${options.kind}"`)
  }

  // Entity fetch + vars (D3 collectors; subscriptions added for BRM events).
  const entityType = options.entityType ?? "order"
  let entityVars: Record<string, string>
  if (entityType === "subscription") {
    const brm = container.resolve("brm")
    const subs = await brm.listSubscriptions({ id: options.entityId }, { take: 1 })
    const sub = subs[0]
    if (!sub) throw new Error(`Subscription ${options.entityId} not found`)
    entityVars = await collectSubscriptionVars(container, {
      subscription: sub,
      amount: options.extraVars?.amount as any,
      attempts: options.extraVars?.attempts as any,
      nextRetry: options.extraVars?.next_retry as any,
    })
  } else {
    const order = await fetchOrderForInvoice(container, options.entityId)
    if (!order) throw new Error(`Order ${options.entityId} not found`)
    entityVars = await collectOrderVars(container, order)
  }

  // Dynamic event vars (refund ids, txn refs, …) — built-ins stay authoritative.
  const extra = options.extraVars ?? {}
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined || v === null) continue
    if (!(k in entityVars)) entityVars[k] = String(v)
  }
  const vars = entityVars
  let html = await injectQrTokens(template.html ?? "", vars)
  html = renderEmailHtml(html, vars)

  const geometry: PdfGeometry = {
    pageSize: template.page_size,
    orientation: template.page_orientation,
    marginMm: template.page_margin,
    watermark: template.watermark,
  }
  const buffer = await renderPdf(html, geometry)

  // Persist the immutable version first (snapshot = source of truth).
  const { document, version } = await recordDocumentIssuance(container, {
    kind: options.kind,
    entityId: options.entityId,
    entityType: options.entityType ?? "order",
    templateId: template.id,
    templateName: template.name,
    renderedHtml: html,
    fileSize: buffer.length,
    generatedBy: options.generatedBy ?? "pipeline",
    metadata: { geometry },
  })

  // Best-effort durable file via the Medusa File module (local/MinIO-S3).
  let fileUrl: string | null = null
  try {
    const files = container.resolve(Modules.FILE)
    const created = await (files as any).createFiles({
      filename: `${options.kind}-${String(options.entityId)}-v${version.version_number}.pdf`,
      mimeType: "application/pdf",
      content: buffer,
    })
    const file = Array.isArray(created) ? created[0] : created
    if (file?.url || file?.key) {
      fileUrl = file.url ?? file.key ?? null
      const docs = resolveDocumentService(container)
      await docs.updateDocumentVersions({
        id: version.id,
        file_url: fileUrl,
        file_key: file.key ?? null,
      })
    }
  } catch (err: any) {
    console.error("Document file upload failed (version kept, regenerable):", err?.message ?? err)
  }

  return { buffer, html, template, document, version, fileUrl }
}

/* ------------------------------------------------------------------ */
/* Legacy path — hardened store routes                                 */
/* ------------------------------------------------------------------ */

type RequestActor = { actorId?: string; actorType?: string }

function requestActor(req: any): RequestActor {
  const ctx = req.auth_context
  return {
    actorId: ctx?.actor_id as string | undefined,
    actorType: ctx?.actor_type as string | undefined,
  }
}

/**
 * Shared handler for GET /store/orders/:id/invoice and /waybill.
 * Default response is application/pdf; ?format=html keeps the legacy page.
 * Auth: admin ("user") always; customers only for their own order.
 */
export async function serveOrderDocument(
  req: any,
  res: any,
  kind: "invoice" | "waybill"
): Promise<any> {
  const orderId = String(req.params.id)

  const { html, enabled, order } = await buildInvoiceDocument(req.scope, orderId, { kind })

  if (!enabled) {
    return res.status(403).json({ message: "Invoicing is disabled for this store." })
  }
  if (!order) {
    return res.status(404).json({ message: "Order not found." })
  }

  const { actorId, actorType } = requestActor(req)
  if (!actorId) {
    return res.status(401).json({ message: "Authentication required to download documents." })
  }
  if (actorType !== "user" && order.customer_id && order.customer_id !== actorId) {
    return res.status(403).json({ message: "You do not have access to this document." })
  }

  if ((req.query as Record<string, any>).format === "html") {
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    return res.send(html)
  }

  try {
    const buffer = await renderPdf(html, {
      pageSize: "A4",
      orientation: kind === "waybill" ? "landscape" : "portrait",
      marginMm: "12",
    })
    const displayId = String(order.display_id ?? order.id)
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${kind === "waybill" ? "WB" : "INV"}-${displayId}.pdf"`
    )
    return res.send(buffer)
  } catch (err: any) {
    console.error(`${kind} PDF render failed, falling back to HTML:`, err?.message ?? err)
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.setHeader("X-Pdf-Fallback", "1")
    return res.send(html)
  }
}

/* ------------------------------------------------------------------ */
/* Expiring share links                                                */
/* ------------------------------------------------------------------ */

const SHARE_SECRET =
  process.env.JWT_SECRET || process.env.COOKIE_SECRET || "divinekart-document-share"

function hmac(data: string): string {
  return crypto.createHmac("sha256", SHARE_SECRET).update(data).digest("hex")
}

/** Build `<versionId>.<expiryMs>.<sig>` — no DB write needed to mint. */
export function signShareToken(versionId: string, ttlMinutes: number): {
  token: string
  expiresAt: Date
} {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)
  const token = `${versionId}.${expiresAt.getTime()}.${hmac(`${versionId}.${expiresAt.getTime()}`)}`
  return { token, expiresAt }
}

export function verifyShareToken(token: string): string | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [versionId, expRaw, sig] = parts
  const exp = Number(expRaw)
  if (!Number.isFinite(exp) || Date.now() > exp) return null
  const expected = hmac(`${versionId}.${exp}`)
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  return versionId
}
