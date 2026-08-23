import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { verifyShareToken } from "../../../lib/document-generator"
import { renderPdf, type PdfGeometry } from "../../../lib/pdf"
import { resolveDocumentService } from "../../../lib/document-templates"

/**
 * Expiring signed share-link redemption (document-builder D4, ADR-0002 §10).
 *
 * GET /store/documents/shared?token=<versionId>.<expiryMs>.<hmac>
 *
 * Serves one immutable document version to ANYONE holding a valid,
 * unexpired token — the mechanism WhatsApp captions (D7) and admin "copy
 * share link" (D8) use. Serves the persisted File-module upload when present;
 * otherwise regenerates the PDF from the version's HTML snapshot so a missing
 * file never breaks a legitimate link.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const token = String((req.query as Record<string, any>).token ?? "")
    const versionId = verifyShareToken(token)
    if (!versionId) {
      return res.status(403).json({ message: "This share link is invalid or has expired." })
    }

    const docs = resolveDocumentService(req.scope)
    const rows = await docs.listDocumentVersions({ id: versionId }, { take: 1 })
    const version = rows[0]
    if (!version) {
      return res.status(404).json({ message: "Document not found." })
    }

    // Prefer the durable File-module asset (MinIO/S3 or local uploads).
    if (version.file_url) {
      return res.redirect(version.file_url)
    }

    const html = version.rendered_html
    if (!html) {
      return res.status(410).json({ message: "Document content is no longer available." })
    }

    const geometry: PdfGeometry = (version.metadata as any)?.geometry ?? {}
    const buffer = await renderPdf(html, geometry)
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `inline; filename="document-v${version.version_number}.pdf"`)
    return res.send(buffer)
  } catch (err: any) {
    console.error("Shared document error:", err?.message ?? err)
    return res.status(500).json({ message: err?.message ?? String(err) })
  }
}
