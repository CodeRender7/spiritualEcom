import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { buildInvoiceDocument } from "../../../../../lib/invoice"

/**
 * Store-facing invoice/waybill document. Renders a print-ready HTML page that
 * customers (or the admin) can save as PDF. Respects invoicing.enabled.
 *
 * GET /store/orders/:id/invoice        → Tax Invoice
 * GET /store/orders/:id/waybill        → Delivery Waybill
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const orderId = req.params.id as string
  const kind = req.url.includes("/waybill") ? "waybill" : "invoice"

  const { html, enabled, order } = await buildInvoiceDocument(req.scope, orderId, { kind })

  if (!enabled) {
    return res.status(403).json({ message: "Invoicing is disabled for this store." })
  }
  if (!order) {
    return res.status(404).json({ message: "Order not found." })
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8")
  return res.send(html)
}