import { Modules } from "@medusajs/framework/utils"
import { getStoreSettings, ShippingProductOverride } from "./settings"

/**
 * T18 — DivineKart delivery-charge rules engine.
 *
 * Layered, deterministic composition over a cart:
 *   1. Per-line charges: Σ(product override charge_per_unit × line qty);
 *      lines whose product is free_shipping contribute nothing.
 *   2. Base charge: from the highest matching quantity tier
 *      (total cart qty), else the global base_charge.
 *   3. Threshold waiver: order value ≥ free_shipping_threshold waives the
 *      BASE layer only — per-unit product charges still apply (they price
 *      handling specific goods, not delivery itself).
 *   4. Premium members (customer metadata.premium_member) ship free when
 *      premium_free_shipping is on (T21 hook).
 *
 * Server-authoritative by design (T19 direction): the storefront displays
 * this quote; T20's checkout shipping stage applies it to the real cart.
 */

export type ShippingQuoteLine = {
  product_id: string
  title?: string
  quantity: number
  per_unit_charge: number
  line_charge: number
}

export type ShippingQuote = {
  enabled: boolean
  /** Final DivineKart delivery charge for the order (paise). */
  charge: number
  base_charge: number
  tier_applied: { min_qty: number; base_charge: number } | null
  threshold_waived_base: boolean
  premium_free_shipping: boolean
  lines: ShippingQuoteLine[]
  order_value: number
  total_quantity: number
}

/** Resolve a customer's premium flag (missing customer → false). */
async function isPremiumMember(container: any, customerId?: string | null): Promise<boolean> {
  if (!customerId) return false
  try {
    const customerModule = container.resolve(Modules.CUSTOMER)
    const rows = await customerModule.listCustomers(
      { id: customerId },
      { select: ["id", "metadata"] }
    )
    const c = Array.isArray(rows) ? rows[0] : rows?.data?.[0]
    return Boolean(c?.metadata?.premium_member)
  } catch {
    return false
  }
}

export async function quoteShipping(
  container: any,
  cartId: string
): Promise<ShippingQuote | null> {
  const settings = await getStoreSettings(container)
  const cfg = settings.shipping
  if (!cfg.enabled) {
    return {
      enabled: false,
      charge: 0,
      base_charge: 0,
      tier_applied: null,
      threshold_waived_base: false,
      premium_free_shipping: false,
      lines: [],
      order_value: 0,
      total_quantity: 0,
    }
  }

  // Load the cart with items (+ variant/product refs for titles).
  const cartModule = container.resolve(Modules.CART)
  let cart: any
  try {
    cart = await cartModule.retrieveCart(cartId, { relations: ["items"] })
  } catch {
    return null
  }
  if (!cart) return null

  const overrides = new Map<string, ShippingProductOverride>(
    (cfg.product_overrides ?? []).map((o) => [o.product_id, o])
  )

  const lines: ShippingQuoteLine[] = []
  let orderValue = 0
  let totalQty = 0
  let perUnitTotal = 0

  for (const item of cart.items ?? []) {
    const productId = String(item.product_id ?? item.variant?.product_id ?? "")
    const qty = Number(item.quantity ?? 0)
    const lineValue = Number(item.subtotal ?? (item.unit_price ?? 0) * qty)
    orderValue += lineValue
    totalQty += qty

    const ov = overrides.get(productId)
    const perUnit = ov && !ov.free_shipping ? Math.max(0, Number(ov.charge_per_unit ?? 0) || 0) : 0
    const lineCharge = perUnit * qty
    perUnitTotal += lineCharge

    lines.push({
      product_id: productId,
      title: item.title ?? item.product_title ?? undefined,
      quantity: qty,
      per_unit_charge: perUnit,
      line_charge: lineCharge,
    })
  }

  // Quantity-tier selection for the BASE layer.
  const sortedTiers = [...(cfg.tiers ?? [])].sort((a, b) => a.min_qty - b.min_qty)
  let tierApplied: ShippingQuote["tier_applied"] = null
  let baseCharge = cfg.base_charge
  for (const t of sortedTiers) {
    if (totalQty >= t.min_qty) {
      tierApplied = { min_qty: t.min_qty, base_charge: t.base_charge }
      baseCharge = t.base_charge
    }
  }

  // Threshold waiver: applies to the BASE layer only.
  const thresholdActive =
    cfg.free_shipping_threshold != null && orderValue >= (cfg.free_shipping_threshold ?? Infinity)
  if (thresholdActive) baseCharge = 0

  // Premium members ship free entirely (T21 hook).
  const premium =
    cfg.premium_free_shipping && (await isPremiumMember(container, cart.customer_id))
  if (premium) {
    baseCharge = 0
    for (const l of lines) l.line_charge = 0
    perUnitTotal = 0
  }

  const charge = baseCharge + perUnitTotal
  return {
    enabled: true,
    charge,
    base_charge: baseCharge,
    tier_applied: tierApplied,
    threshold_waived_base: Boolean(thresholdActive),
    premium_free_shipping: premium,
    lines,
    order_value: orderValue,
    total_quantity: totalQty,
  }
}
