import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { serveOrderDocument } from "../../../../../lib/document-generator"

/**
 * Store-facing tax invoice document (document-builder D4).
 *
 * Default: real PDF (application/pdf) rendered server-side via Puppeteer.
 * `?format=html` → the legacy print-ready page.
 * Auth required: admin ("user"), or the customer who owns the order
 * (`req.auth_context.actor_id` — same pattern as /store/referrals/me).
 *
 * GET /store/orders/:id/invoice?format=html|pdf
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  return serveOrderDocument(req, res, "invoice")
}
