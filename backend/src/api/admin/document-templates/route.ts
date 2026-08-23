import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  resolveEmailTemplateService,
} from "../../../lib/email-templates"
import {
  ALLOWED_DOC_KINDS,
  ALLOWED_PAGE_ORIENTATIONS,
  ALLOWED_PAGE_SIZES,
} from "../../../lib/document-templates"

/**
 * Admin Document Template Gallery API (document-builder D2, ADR-0002)
 * GET  /admin/document-templates?doc_kind=&status=&category=&format=pdf → list document templates
 * POST /admin/document-templates                                        → create document template
 *
 * POST body: { name, description?, doc_kind?, category?, event_key?,
 *              format?, page_size?, page_orientation?, page_margin?,
 *              watermark?, subject?, design?, html?, placeholders?,
 *              status?, tags?, metadata? }
 *
 * This is the additive surface for the unified template store. All reads here
 * are scoped to `format: "pdf"` so the email gallery (E1, format="email") is
 * untouched. `format` is forced to "pdf" on create regardless of caller input
 * to keep the two galleries cleanly separated.
 */

const ALLOWED_CATEGORIES = ["brm", "order", "transactional", "custom"]
const ALLOWED_STATUSES = ["draft", "active", "archived"]

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveEmailTemplateService(req.scope)
  const { q } = req.query as Record<string, any>

  const filters: Record<string, any> = { format: "pdf" }
  for (const k of ["doc_kind", "status", "category", "event_key"]) {
    if ((req.query as Record<string, any>)[k]) filters[k] = (req.query as Record<string, any>)[k]
  }

  const [rows, count] = await service.listAndCountEmailTemplates(
    filters,
    {
      order: { created_at: "DESC" },
      take: req.query.take ? Number(req.query.take) : 100,
      skip: req.query.skip ? Number(req.query.skip) : 0,
    }
  )

  let result = rows
  if (q) {
    const needle = String(q).toLowerCase()
    result = rows.filter(
      (r: any) =>
        (r.name ?? "").toLowerCase().includes(needle) ||
        (r.description ?? "").toLowerCase().includes(needle) ||
        (r.doc_kind ?? "").toLowerCase().includes(needle)
    )
  }

  return res.json({ templates: result, count: result.length, total: count })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveEmailTemplateService(req.scope)
  const body = (req.body ?? {}) as Record<string, any>

  if (!body.name) {
    return res.status(400).json({ message: "name is required" })
  }
  if (body.doc_kind && !ALLOWED_DOC_KINDS.includes(body.doc_kind)) {
    return res.status(400).json({ message: `Unknown doc_kind: ${body.doc_kind}` })
  }
  if (body.category && !ALLOWED_CATEGORIES.includes(body.category)) {
    return res.status(400).json({ message: `Unknown category: ${body.category}` })
  }
  if (body.status && !ALLOWED_STATUSES.includes(body.status)) {
    return res.status(400).json({ message: `Unknown status: ${body.status}` })
  }
  if (body.page_size && !ALLOWED_PAGE_SIZES.includes(body.page_size)) {
    return res.status(400).json({ message: `Unknown page_size: ${body.page_size}` })
  }
  if (
    body.page_orientation &&
    !ALLOWED_PAGE_ORIENTATIONS.includes(body.page_orientation)
  ) {
    return res
      .status(400)
      .json({ message: `Unknown page_orientation: ${body.page_orientation}` })
  }

  const created = await service.createEmailTemplates({
    format: "pdf", // force document format regardless of input
    name: body.name,
    description: body.description ?? null,
    doc_kind: body.doc_kind ?? "custom",
    category: body.category ?? "custom",
    event_key: body.event_key ?? null,
    page_size: body.page_size ?? "A4",
    page_orientation: body.page_orientation ?? "portrait",
    page_margin: body.page_margin ?? "12",
    watermark: body.watermark ?? null,
    subject: body.subject ?? "",
    design: body.design ?? null,
    html: body.html ?? null,
    placeholders: Array.isArray(body.placeholders) ? body.placeholders : null,
    status: body.status ?? "draft",
    tags: body.tags ?? ["document", body.doc_kind ?? "custom"],
    metadata: body.metadata ?? {},
  })

  return res.json({ template: created })
}
