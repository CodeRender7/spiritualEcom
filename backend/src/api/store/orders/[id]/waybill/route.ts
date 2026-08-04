import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { buildInvoiceDocument } from "../../../../../lib/invoice"

/**
 * Store-facing delivery waybill document (print-ready HTML → PDF).
 * GET /store/orders/:id/waybill
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const orderId = req.params.id as string

  const { html, enabled, order } = await buildInvoiceDocument(req.scope, orderId, { kind: "waybill" })

  if (!enabled) {
    return res.status(403).json({ message: "Invoicing is disabled for this store." })
  }
  if (!order) {
    return res.status(404).json({ message: "Order not found." })
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8")
  return res.send(html)
}