import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { sessionRegistry, sendMessage } from "../lib/whatsapp-session"
import { getStoreSettings } from "../lib/settings"

/**
 * Cart Abandonment Recovery Subscriber
 * Monitors cart creation/updates and sends reminder after 1 hour of inactivity.
 * 
 * Triggers on: cart.created, cart.updated
 * Action: Schedule WhatsApp reminder if cart has items and no checkout started
 */

const ABANDONMENT_THRESHOLD = 60 * 60 * 1000 // 1 hour in milliseconds

export default async function cartAbandonmentHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const settings = await getStoreSettings(container)
  if (!settings.whatsapp.enabled) return

  const cartId = event.data.id
  
  // Schedule check after threshold
  setTimeout(async () => {
    try {
      const cartModule = container.resolve(Modules.CART)
      const carts = await cartModule.listCarts({ id: cartId })
      const cart = carts[0]
      
      if (!cart || cart.completed_at) return // Cart was checked out
      if (!cart.items?.length) return // Empty cart
      if (!cart.email && !cart.customer_id) return // No contact info

      // Get customer phone
      let phone: string | undefined = cart.shipping_address?.phone || undefined
      if (!phone && cart.customer_id) {
        const customerModule = container.resolve(Modules.CUSTOMER)
        const customers = await customerModule.listCustomers({ id: cart.customer_id })
        phone = customers[0]?.phone || undefined
      }

      if (!phone) return

      // Get first connected session
      const connectedSession = sessionRegistry.all().find(s => s.status === "connected")
      if (!connectedSession) return

      const itemCount = cart.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
      const total = cart.total || 0
      const message = `Namaste! 🕉️ You left ${itemCount} divine items in your DivineKart cart (₹${total}). Complete your order now and receive blessings! ${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:8000"}/cart`

      await sendMessage(connectedSession.session_key, phone, message)
    } catch (err) {
      console.error("Cart abandonment WhatsApp failed:", err)
    }
  }, ABANDONMENT_THRESHOLD)
}

export const config: SubscriberConfig = {
  event: ["cart.created", "cart.updated"],
}
