import { Modules } from "@medusajs/framework/utils"
import { getStoreSettings } from "./settings"

type Recv = {
  phone: string
  name?: string
  order_id?: string
  total?: string
}

/**
 * Fill {name}, {order_id}, {total}, {phone} placeholders in a template.
 */
function renderTemplate(template: string, vars: Recv): string {
  return template
    .replace(/\{name\}/g, vars.name || "")
    .replace(/\{order_id\}/g, vars.order_id || "")
    .replace(/\{total\}/g, vars.total || "")
    .replace(/\{phone\}/g, vars.phone)
}

/**
 * Send a WhatsApp message through the configured gateway.
 * Only acts when whatsapp.enabled is true and a gateway_url is set.
 */
export async function sendWhatsApp(
  container: any,
  recv: Recv & { template?: string },
  event: "confirmation" | "shipped"
): Promise<boolean> {
  const settings = await getStoreSettings(container)
  const wa = settings.whatsapp
  if (!wa.enabled) return false
  if (!wa.gateway_url) return false

  const template =
    recv.template ??
    (event === "shipped" ? wa.order_shipped_template : wa.order_confirmation_template)
  const message = renderTemplate(template, recv)
  const phone = `${wa.default_country_code.replace(/^\+?0+/, "+")}${recv.phone.replace(/^\+?/, "")}`

  try {
    if (wa.gateway === "openwa") {
      // OpenWA / wa.me style HTTP gateway: POST { to, message }
      const res = await fetch(wa.gateway_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(wa.api_key ? { Authorization: `Bearer ${wa.api_key}` } : {}),
        },
        body: JSON.stringify({ to: phone, message }),
      })
      return res.ok
    }
    // waha gateway: same ish shape with apiKey header
    const res = await fetch(wa.gateway_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(wa.api_key ? { "X-Api-Key": wa.api_key } : {}),
      },
      body: JSON.stringify({ to: phone, message }),
    })
    return res.ok
  } catch (err) {
    console.error("DivineKart WhatsApp send failed:", err)
    return false
  }
}

const ORDER_LIST_SELECT = [
  "id",
  "display_id",
  "email",
  "currency_code",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.phone",
  "shipping_address.country_code",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.postal_code",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "totals",
] as const

/** Lightweight order fetch (by id) returning the fields we need. */
export async function fetchOrderForNotify(container: any, orderId: string): Promise<any | null> {
  const orderModule = container.resolve(Modules.ORDER)
  try {
    const orders = await orderModule.listOrders(
      { id: orderId },
      { select: ORDER_LIST_SELECT as unknown as string[] }
    )
    return orders[0] ?? null
  } catch (err) {
    console.error("DivineKart fetch order failed:", err)
    return null
  }
}

/** Build recipient vars from an order payload. */
export function orderToRecv(
  order: any,
  opts?: { total_value?: number }
): Recv | null {
  const addr = order?.shipping_address ?? {}
  const name = [addr.first_name, addr.last_name].filter(Boolean).join(" ") || order?.email || "Customer"
  const phone = addr?.phone || ""
  if (!phone) return null
  const total = opts?.total_value ?? order?.totals?.total_paid ?? order?.total ?? 0
  const inr = order?.currency_code === "inr" ? Number(total) : Number(total)
  return {
    phone,
    name,
    order_id: String(order.display_id ?? order.id ?? ""),
    total: inr ? `₹${Math.round(inr)}` : String(inr),
  }
}