import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveDocumentService } from "../../../../../../../lib/document-templates"
import { renderPdf, type PdfGeometry } from "../../../../../../../lib/pdf"

/**
 * Admin document file delivery (document-builder D8).
 * GET /admin/documents/:id/versions/:version/file
 *
 * Streams the persisted File-module asset when present; otherwise regenerates
 * from the version's HTML snapshot — an admin can always retrieve any issued
 * version, even after MinIO data loss.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  try {
    const documentId = String(req.params.id)
    const versionId = String(req.params.version)

    const docs = resolveDocumentService(req.scope)
    const headers = await docs.listDocuments({ id: documentId }, { take: 1 })
    if (!headers[0]) {
      return res.status(404).json({ message: "Document not found" })
    }
    const rows = await docs.listDocumentVersions(
      { id: versionId, document_id: documentId },
      { take: 1 }
    )
    const version = rows[0]
    if (!version) {
      return res.status(404).json({ message: "Version not found" })
    }

    if (version.file_url) {
      // Same-origin proxy keeps admin auth meaningful end-to-end.
      const fileRes = await fetch(version.file_url)
      if (fileRes.ok) {
        const buf = Buffer.from(await fileRes.arrayBuffer())
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${headers[0].kind}-v${version.version_number}.pdf"`
        )
        return res.send(buf)
      }
      console.warn(
        `File asset unreachable (${version.file_url}) — regenerating from snapshot`
      )
    }

    if (!version.rendered_html) {
      return res.status(410).json({ message: "Version content unavailable." })
    }
    const geometry: PdfGeometry = (version.metadata as any)?.geometry ?? {}
    const buffer = await renderPdf(version.rendered_html, geometry)
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${headers[0].kind}-v${version.version_number}.pdf"`
    )
    return res.send(buffer)
  } catch (err: any) {
    console.error("Admin document file error:", err?.message ?? err)
    return res.status(500).json({ message: err?.message ?? String(err) })
  }
}
