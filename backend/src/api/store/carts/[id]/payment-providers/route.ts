import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  getStoreSettings,
  PAYMENT_PROVIDERS,
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_PROVIDER_MODULE_IDS,
} from "../../../../../lib/settings"

/**
 * GET /store/carts/:id/payment-providers — per-cart payment decision tree.
 *
 * A3: the checkout should not render a flat provider list. This endpoint
 * computes the *eligible* set for THIS cart:
 *   - enabled providers from store settings (priority order, test_mode label)
 *   - subscription cart → COD excluded (hard rule)
 *   - region provider set → intersect with payment providers actually
 *     registered for the cart's region
 *   - `best` = first eligible by priority; `auto_selected` = strict
 *     auto-routing when exactly one provider survives (single-provider rule)
 *
 * Returns a public-safe payload (no keys/secrets). The storefront may still
 * let the customer pick any eligible provider (auto tree + override).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const cartId = req.params.id as string
    const cartModule = req.scope.resolve(Modules.CART) as any

    let cart: any = null
    try {
      cart = await cartModule.retrieveCart(cartId, {
        relations: ["items", "region"],
      })
    } catch {
      return res.status(404).json({ message: "Cart not found." })
    }

    const lineItems: any[] = cart?.items ?? []

    // Subscription cart = any line added in subscription mode (metadata.sale_mode).
    const subscriptionCart = lineItems.some(
      (li) => li?.metadata?.sale_mode === "subscription"
    )

    const settings = await getStoreSettings(req.scope)

    // 1. Enabled providers, priority order.
    const eligible = PAYMENT_PROVIDERS.map((key) => {
      const cfg = settings.payments[key]
      return {
        id: key,
        label: PAYMENT_PROVIDER_LABELS[key],
        enabled: cfg.enabled,
        priority: cfg.priority,
        test_mode: cfg.test_mode,
      }
    })
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority)

    // 2. Hard rule: subscription cart → COD hidden.
    const codHidden = subscriptionCart && eligible.some((p) => p.id === "cod")
    if (codHidden) {
      const idx = eligible.findIndex((p) => p.id === "cod")
      if (idx !== -1) eligible.splice(idx, 1)
    }

    // 3. Region provider set: only providers actually registered for the
    //    cart's region may be offered. Best-effort — if the payment module
    //    lookup fails, fall back to the settings list.
    let regionProviderIds: string[] | null = null
    try {
      const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
      const regionId = cart?.region?.id
      const providers = await paymentModule.listPaymentProviders(
        regionId ? { region_id: regionId } : {},
        { select: ["id"] }
      )
      regionProviderIds = (providers ?? []).map((p: any) => p.id)
    } catch {
      regionProviderIds = null
    }

    const filtered =
      regionProviderIds && regionProviderIds.length > 0
        ? eligible.filter((p) =>
            regionProviderIds!.includes(PAYMENT_PROVIDER_MODULE_IDS[p.id as keyof typeof PAYMENT_PROVIDER_MODULE_IDS])
          )
        : eligible

    const providers = filtered.map(({ enabled: _enabled, priority: _priority, ...rest }) => rest)

    const best = providers[0]?.id ?? null
    const autoSelected = providers.length === 1

    return res.json({
      cart_id: cartId,
      providers,
      best,
      auto_selected: autoSelected,
      subscription_cart: subscriptionCart,
      cod_hidden: codHidden,
      fallback_hint: codHidden
        ? "Cash on Delivery is not available for subscription orders."
        : providers.length === 0
          ? "No payment methods are currently available. Please contact support."
          : null,
    })
  } catch (err) {
    console.error("Payment providers eligibility failed:", err)
    return res.status(500).json({ message: "Could not compute payment providers." })
  }
}