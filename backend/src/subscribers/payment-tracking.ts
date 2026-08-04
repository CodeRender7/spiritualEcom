import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { sessionRegistry, sendMessage } from "../lib/whatsapp-session"
import { getStoreSettings } from "../lib/settings"

/**
 * Payment Status Tracking Subscriber
 * Sends WhatsApp updates for payment lifecycle events:
 * - payment.captured → "Payment received"
 * - payment.refund.created → "Refund initiated"
 * 
 * Also handles sending payment links when payment is pending.
 */

export default async function paymentTrackingHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; order_id?: string }>) {
  const settings = await getStoreSettings(container)
  if (!settings.whatsapp.enabled) return

  const connectedSession = sessionRegistry.all().find(s => s.status === "connected")
  if (!connectedSession) return

  try {
    const orderId = event.data.order_id || event.data.id
    const orderModule = container.resolve(Modules.ORDER)
    const orders = await orderModule.listOrders(
      { id: orderId },
      { select: ["id", "display_id", "email", "total", "currency_code", "shipping_address.phone", "shipping_address.first_name", "shipping_address.last_name"] as string[] }
    )
    const order = orders[0]
    if (!order) return

    const phone = (order as any).shipping_address?.phone
    if (!phone) return

    const name = [(order as any).shipping_address?.first_name, (order as any).shipping_address?.last_name].filter(Boolean).join(" ") || "Customer"
    const total = `₹${Math.round(Number(order.total || 0))}`

    let message: string | null = null

    if (event.name === "payment.captured") {
      message = `Namaste ${name}! ✅ Payment of ${total} received for your DivineKart order #${order.display_id || order.id}. Your divine items are being prepared for dispatch!`
    }

    if (event.name === "payment.refund.created") {
      message = `Namaste ${name}! 💰 A refund has been initiated for your DivineKart order #${order.display_id || order.id}. You will receive the amount within 5-7 business days.`
    }

    if (event.name === "order.payment_status_changed") {
      message = `Namaste ${name}! 📋 Payment status update for your DivineKart order #${order.display_id || order.id}. Please check your order details.`
    }

    if (message) {
      await sendMessage(connectedSession.session_key, phone, message)
    }
  } catch (err) {
    console.error("Payment tracking WhatsApp failed:", err)
  }
}

export const config: SubscriberConfig = {
  event: ["payment.captured", "payment.refund.created"],
}
