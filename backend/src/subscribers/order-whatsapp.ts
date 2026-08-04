import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { OrderWorkflowEvents } from "@medusajs/framework/utils"
import { fetchOrderForNotify, orderToRecv, sendWhatsApp } from "../lib/whatsapp"

/**
 * Sends order lifecycle WhatsApp messages (confirmation on placed,
 * shipped on fulfillment) when the WhatsApp settings are enabled.
 */
export default async function orderWhatsAppHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data.id
  const order = await fetchOrderForNotify(container, orderId)
  if (!order) return

  const recv = orderToRecv(order)
  if (!recv) return

  const isShipped = event.name === OrderWorkflowEvents.FULFILLMENT_CREATED
  await sendWhatsApp(container, recv, isShipped ? "shipped" : "confirmation")
}

export const config: SubscriberConfig = {
  event: [OrderWorkflowEvents.PLACED, OrderWorkflowEvents.FULFILLMENT_CREATED],
}