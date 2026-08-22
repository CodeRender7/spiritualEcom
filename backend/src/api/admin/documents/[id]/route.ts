import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveDocumentService } from "../../../../lib/document-templates"

/**
 * Admin Document Issuance API (document-builder D2, ADR-0002 §9)
 * GET /admin/documents/:id → header + full immutable version history
 *                            (newest first).
 *
 * Powers the admin version-history surface (D8): every regeneration of an
 * order's invoice / subscription's receipt is retrievable here forever.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const service = resolveDocumentService(req.scope)
    const id = String(req.params.id)

    const headers = await service.listDocuments({ id }, { take: 1 })
    const header = headers[0]
    if (!header) {
      return res.status(404).json({ message: "Document not found" })
    }

    const versions = await service.listDocumentVersions(
      { document_id: id },
      { order: { version_number: "DESC" }, take: 100 }
    )

    return res.json({ document: header, versions })
  } catch (err: any) {
    console.error("Document GET error:", err?.message ?? err)
    return res.status(500).json({ message: err?.message ?? String(err) })
  }
}
