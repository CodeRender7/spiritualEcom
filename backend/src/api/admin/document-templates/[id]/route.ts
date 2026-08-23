import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  parsePlaceholders,
  resolveEmailTemplateService,
} from "../../../../lib/email-templates"
import {
  ALLOWED_DOC_KINDS,
  ALLOWED_PAGE_ORIENTATIONS,
  ALLOWED_PAGE_SIZES,
} from "../../../../lib/document-templates"

/**
 * Admin Document Template Gallery API (document-builder D2, ADR-0002)
 * GET    /admin/document-templates/:id → single document template
 * PATCH  /admin/document-templates/:id → update document template
 * DELETE /admin/document-templates/:id → soft-delete document template
 *
 * All operations are scoped to `format: "pdf"` rows; `format` can never be
 * changed to "email" through this surface (keeps the email gallery E1 intact).
 */

const ALLOWED_CATEGORIES = ["brm", "order", "transactional", "custom"]
const ALLOWED_STATUSES = ["draft", "active", "archived"]

const ALLOWED = [
  "name", "description", "doc_kind", "category", "event_key",
  "page_size", "page_orientation", "page_margin", "watermark",
  "subject", "design", "html", "placeholders", "status", "tags", "metadata",
]

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = resolveEmailTemplateService(req.scope)
    const rows = await service.listEmailTemplates(
      { id: String(req.params.id), format: "pdf" },
      { take: 1 }
    )
    if (!rows[0]) {
      return res.status(404).json({ message: "Document template not found" })
    }
    return res.json({ template: rows[0] })
  } catch (err: any) {
    console.error("DocumentTemplate GET error:", err?.message ?? err)
    return res.status(500).json({ message: err?.message ?? String(err) })
  }
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveEmailTemplateService(req.scope)
  const body = (req.body ?? {}) as Record<string, any>

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

  const patch: Record<string, any> = {}
  for (const key of ALLOWED) {
    if (body[key] !== undefined) patch[key] = body[key]
  }

  if (Object.keys(patch).length === 0) {
    return res
      .status(400)
      .json({ message: "No updatable fields provided" })
  }

  // Re-derive placeholders whenever html changed but the caller didn't pass an
  // explicit catalog (keeps the suggestive picker in sync, mirroring E1).
  if (body.placeholders === undefined && body.html !== undefined) {
    const current = await service.listEmailTemplates(
      { id: String(req.params.id), format: "pdf" },
      { take: 1 }
    )
    const prev = current[0]
    if (!prev) {
      return res.status(404).json({ message: "Document template not found" })
    }
    patch.placeholders = parsePlaceholders(
      `${body.subject ?? prev.subject ?? ""}\n${body.html ?? prev.html ?? ""}`
    )
  }

  const updated = await service.updateEmailTemplates({
    id: String(req.params.id),
    ...patch,
  })
  return res.json({ template: updated })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveEmailTemplateService(req.scope)
  const rows = await service.listEmailTemplates(
    { id: String(req.params.id), format: "pdf" },
    { take: 1 }
  )
  if (!rows[0]) {
    return res.status(404).json({ message: "Document template not found" })
  }
  await service.softDeleteEmailTemplates([String(req.params.id)])
  return res.json({ deleted: true })
}
