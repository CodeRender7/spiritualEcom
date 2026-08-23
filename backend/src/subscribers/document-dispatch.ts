import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { OrderWorkflowEvents } from "@medusajs/framework/utils"
import { handleOrderDocDispatch } from "../lib/document-dispatch"

/**
 * Document auto-dispatch for the order/payment pipeline (document-builder D7).
 *
 * On each configured stage (order placed / fulfillment / payment captured /
 * refund) this generates the bound document kinds (invoice, waybill,
 * payment_receipt, …), persists immutable versions, and delivers them as an
 * email attachment + optional WhatsApp file — all gated by the admin's
 * doc_dispatch settings (default: everything off).
 */
async function handler({
  event,
  container,
}: SubscriberArgs<{ id: string; customer?: { email?: string; phone?: string } }>) {
  await handleOrderDocDispatch(
    container,
    event.name,
    String(event.data.id),
    event.data.customer?.email ?? null,
    event.data.customer?.phone ?? null
  )
}

export const config: SubscriberConfig = {
  event: [
    OrderWorkflowEvents.PLACED,
    OrderWorkflowEvents.FULFILLMENT_CREATED,
    "payment.captured",
    "payment.refund.created",
  ],
}

export default handler
