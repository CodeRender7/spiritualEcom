import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  parsePlaceholders,
  resolveEmailTemplateService,
} from "../../../../lib/email-templates"
import { seedDocTemplateRows } from "../../../../lib/document-templates"

/**
 * Admin Document Template Gallery API (document-builder D2, ADR-0002)
 * POST /admin/document-templates/seed → idempotently seed the document gallery
 *                                       with the six document kinds (invoice,
 *                                       waybill, transit_memo, receipt, e_bill,
 *                                       payment_receipt).
 *
 * Each seed row becomes an active `format: "pdf"` gallery template with page
 * geometry (format/orientation/margin), print-ready HTML (keeps
 * `{{key:value}}` pairs), and a parsed placeholder catalog. Re-running is a
 * no-op for existing doc_kind + name pairs; a `force` flag re-imports and
 * overwrites them. Email gallery rows are never touched.
 */

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveEmailTemplateService(req.scope)
  const force = Boolean((req.body as Record<string, any> | undefined)?.force)

  const existing = await service.listEmailTemplates(
    { format: "pdf" },
    { take: 1000, select: ["id", "name", "doc_kind"] }
  )
  const bySignature = new Map<string, string>()
  for (const t of existing) {
    const sig = `${t.doc_kind ?? ""}:${t.name}`
    bySignature.set(sig, t.id)
  }

  const created: any[] = []
  const updated: any[] = []
  const skipped: string[] = []

  for (const seed of seedDocTemplateRows()) {
    const placeholders = parsePlaceholders(seed.html)
    const sig = `${seed.doc_kind}:${seed.name}`
    const existingId = bySignature.get(sig)

    if (existingId && !force) {
      skipped.push(seed.name)
      continue
    }

    const payload = {
      format: "pdf",
      name: seed.name,
      description: seed.description,
      doc_kind: seed.doc_kind,
      category: "custom",
      event_key: seed.event_key,
      page_size: seed.page_size,
      page_orientation: seed.page_orientation,
      page_margin: seed.page_margin,
      watermark: seed.watermark,
      subject: "",
      design: null,
      html: seed.html,
      placeholders,
      status: seed.status,
      tags: ["document", seed.doc_kind],
      metadata: { seeded: true },
    }

    if (existingId) {
      updated.push(await service.updateEmailTemplates({ id: existingId, ...payload }))
    } else {
      created.push(await service.createEmailTemplates(payload))
    }
  }

  return res.json({ created: created.length, updated: updated.length, skipped })
}
