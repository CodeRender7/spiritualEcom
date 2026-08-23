import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { signShareToken } from "../../../../../lib/document-generator"
import { resolveDocumentService } from "../../../../../lib/document-templates"

/**
 * Admin share-link minting (document-builder D4, ADR-0002 §10).
 *
 * POST /admin/documents/:id/share-link
 * body: { version_number?: number, ttl_minutes?: number (default 7 days) }
 * → { url, expires_at }
 *
 * Mints an HMAC-signed expiring token for one immutable version of this
 * document. No state is stored — the URL dies exactly when the signature says.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const documentId = String(req.params.id)
    const body = (req.body ?? {}) as Record<string, any>
    const ttlMinutes = Number(body.ttl_minutes ?? 7 * 24 * 60)

    if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0 || ttlMinutes > 60 * 24 * 90) {
      return res.status(400).json({ message: "ttl_minutes must be between 1 and 129600." })
    }

    const docs = resolveDocumentService(req.scope)
    const headers = await docs.listDocuments({ id: documentId }, { take: 1 })
    const header = headers[0]
    if (!header) {
      return res.status(404).json({ message: "Document not found" })
    }

    let version
    if (body.version_number) {
      const rows = await docs.listDocumentVersions(
        { document_id: documentId, version_number: Number(body.version_number) },
        { take: 1 }
      )
      version = rows[0]
    } else {
      const rows = await docs.listDocumentVersions(
        { document_id: documentId },
        { order: { version_number: "DESC" }, take: 1 }
      )
      version = rows[0]
    }
    if (!version) {
      return res.status(404).json({ message: "Document version not found" })
    }

    const { token, expiresAt } = signShareToken(version.id, ttlMinutes)
    const proto = req.protocol ?? "http"
    const host = req.get?.("host") ?? req.headers?.host ?? "localhost:9000"

    return res.json({
      url: `${proto}://${host}/share/documents?token=${token}`,
      expires_at: expiresAt.toISOString(),
      version_number: version.version_number,
    })
  } catch (err: any) {
    console.error("Share-link mint error:", err?.message ?? err)
    return res.status(500).json({ message: err?.message ?? String(err) })
  }
}
