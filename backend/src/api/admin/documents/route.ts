import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveDocumentService } from "../../../lib/document-templates"

/**
 * Admin Document Issuance API (document-builder D2, ADR-0002 §9)
 * GET /admin/documents?entity_type=&entity_id=&kind=&take=&skip=
 *   → list document headers (one per entity+kind) with current_version.
 *
 * Read-only in D2: rows are created by the generation engine (D4) via
 * `recordDocumentIssuance`; this surface is what the admin version-history UI
 * (D8) and the dispatcher (D7) read from.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = resolveDocumentService(req.scope)
    const query = req.query as Record<string, any>

    const filters: Record<string, any> = {}
    for (const k of ["entity_type", "entity_id", "kind"]) {
      if (query[k]) filters[k] = query[k]
    }

    const [rows, count] = await service.listAndCountDocuments(filters, {
      order: { updated_at: "DESC" },
      take: query.take ? Number(query.take) : 50,
      skip: query.skip ? Number(query.skip) : 0,
    })

    return res.json({ documents: rows, count, total: count })
  } catch (err: any) {
    console.error("Documents GET error:", err?.message ?? err)
    return res.status(500).json({ message: err?.message ?? String(err) })
  }
}
