import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { serveOrderDocument } from "../../../../../lib/document-generator"

/**
 * Store-facing delivery waybill document (document-builder D4).
 *
 * Default: real PDF (application/pdf) via Puppeteer; `?format=html` keeps the
 * legacy print page. Auth required (admin or owning customer) — see
 * serveOrderDocument for the shared contract.
 *
 * GET /store/orders/:id/waybill?format=html|pdf
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  return serveOrderDocument(req, res, "waybill")
}
