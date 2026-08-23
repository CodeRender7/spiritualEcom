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
      // Candidate URLs, most reliable first. The public file_url uses the
      // HOST-mapped MinIO port — unreachable from inside the container's
      // network namespace ("fetch failed") — so prefer the internal
      // endpoint/bucket path rebuilt from env, then the public URL, then the
      // HTML-snapshot regeneration below.
      const candidates: string[] = []
      const objectKey =
        version.file_key || version.file_url?.split("/").pop() || null
      if (objectKey && process.env.S3_ENDPOINT && process.env.S3_BUCKET) {
        candidates.push(
          `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${objectKey}`
        )
      }
      if (version.file_url) candidates.push(version.file_url)

      for (const url of candidates) {
        try {
          const fileRes = await fetch(url)
          if (fileRes.ok) {
            const buf = Buffer.from(await fileRes.arrayBuffer())
            res.setHeader("Content-Type", "application/pdf")
            res.setHeader(
              "Content-Disposition",
              `inline; filename="${headers[0].kind}-v${version.version_number}.pdf"`
            )
            return res.send(buf)
          }
        } catch {
          /* try next candidate */
        }
      }
      console.warn(
        `File asset unreachable (${candidates.join(", ")}) — regenerating from snapshot`
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
