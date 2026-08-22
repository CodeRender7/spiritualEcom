import { Modules } from "@medusajs/framework/utils"
import {
  PAYMENT_PROVIDER_MODULE_IDS,
  PaymentProviderKey,
  getStoreSettings,
} from "./settings"
/**
 * T7/T32 payment router (Medusa-side authoritative router).
 *
 * Builds a fallback chain of payment providers from the T6 settings
 * (`payments[key]: {enabled, priority}`) filtered to providers whose modules
 * are actually installed, ordered by priority ascending, and picks a provider
 * weighted round-robin within the top priority tier.
 *
 * Rules locked by T7 (`issues/07-payment-router.md`):
 *  - Medusa-side routing is authoritative; the hyperswitch routing engine is
 *    connector-level secondary.
 *  - COD is excluded for subscription auto-charge (it cannot auto-collect) —
 *    it is demoted to the tail of the chain when other options exist.
 *  - A subscription's saved method (token locality) is charged first; the
 *    round-robin applies when no saved method exists and as the fallback walk
 *    order after a failure.
 *
 * The decision is audit-logged as a structured `[payment-router]` line and
 * carried on the created payment collection's metadata.
 */

export type RouteCandidate = {
  key: PaymentProviderKey
  /** Registered module provider id ("pp_cod_cod" …). */
  providerId: string
  priority: number
}

export type RouteDecision = {
  /** Chosen provider key ("cod" | "razorpay" | "hyperswitch" …). */
  key: PaymentProviderKey
  /** Full registered id of the chosen provider. */
  providerId: string
  /** Ordered fallback chain (full ids) this decision was made from. */
  chain: string[]
  /** Human-readable reason for the audit log. */
  reason: string
}

/**
 * Round-robin cursor. Redis INCR (key `divinekart:router:rr`) so concurrent
 * replicas share the rotation; falls back to an in-process counter when Redis
 * is unavailable (local event-bus dev setups).
 */
let localCursor = 0
let redisClient: any = null
let redisBroken = false

function getRedis(): any | null {
  if (redisBroken) return null
  if (redisClient) return redisClient
  const url = process.env.REDIS_URL
  if (!url) {
    redisBroken = true
    return null
  }
  try {
    // Lazy require: keep the lib optional at build time.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IoRedis = require("ioredis")
    redisClient = new IoRedis(url, { maxRetriesPerRequest: 1, lazyConnect: false })
    redisClient.on?.("error", () => {
      /* connection hiccups fall back per-call below */
    })
    return redisClient
  } catch {
    redisBroken = true
    return null
  }
}

async function nextRotation(tierSize: number): Promise<number> {
  if (tierSize <= 1) return 0
  try {
    const redis = getRedis()
    if (redis) {
      const n = await redis.incr("divinekart:router:rr")
      return (((n - 1) % tierSize) + tierSize) % tierSize
    }
  } catch {
    // Redis unavailable → local fallback below
  }
  localCursor = (localCursor + 1) % tierSize
  return (localCursor - 1 + tierSize) % tierSize
}

/** Normalize any provider reference (key or full pp_ id) to the full id. */
export function toProviderId(ref: string): string {
  const id = String(ref ?? "")
  if (!id) return ""
  if (id.startsWith("pp_")) return id
  const mapped = PAYMENT_PROVIDER_MODULE_IDS[id as PaymentProviderKey]
  return mapped ?? `pp_${id}_${id}`
}

/** Enabled + installed providers from T6 settings, priority ascending. */
export async function listEligibleProviders(container: any): Promise<RouteCandidate[]> {
  const settings = await getStoreSettings(container)
  const payments = settings.payments

  let installedIds: string[] = []
  try {
    const paymentModule = container.resolve(Modules.PAYMENT)
    const rows = await paymentModule.listPaymentProviders(
      { is_enabled: true },
      { select: ["id"] }
    )
    installedIds = (rows ?? []).map((r: any) => r.id)
  } catch {
    installedIds = []
  }

  return (Object.keys(payments) as PaymentProviderKey[])
    .filter((k) => payments[k]?.enabled)
    .filter((k) => installedIds.includes(PAYMENT_PROVIDER_MODULE_IDS[k]))
    .sort((a, b) => (payments[a].priority ?? 100) - (payments[b].priority ?? 100))
    .map((k) => ({
      key: k,
      providerId: PAYMENT_PROVIDER_MODULE_IDS[k],
      priority: payments[k].priority ?? 100,
    }))
}

/**
 * Build the ordered fallback chain for an auto-charge:
 *  - saved provider first when eligible (token locality),
 *  - then online providers by (priority asc, round-robin within the top tier),
 *  - COD demoted to the tail (cannot auto-collect) unless nothing else exists.
 */
export async function buildAutoChargeChain(
  container: any,
  opts: { savedProviderRef?: string | null } = {}
): Promise<{ chain: RouteCandidate[]; reason: string }> {
  const eligible = await listEligibleProviders(container)
  if (!eligible.length) return { chain: [], reason: "no_eligible_provider" }

  const online = eligible.filter((c) => c.key !== "cod")
  const cod = eligible.filter((c) => c.key === "cod")
  // Auto-charge rule (T7): online methods first, COD only as last resort.
  const base = [...online, ...cod]

  const savedId = opts.savedProviderRef ? toProviderId(opts.savedProviderRef) : ""
  const savedIdx = savedId ? base.findIndex((c) => c.providerId === savedId) : -1

  if (savedIdx > 0) {
    // Move the saved provider to the front of its position in the chain.
    const chain = [base[savedIdx], ...base.slice(0, savedIdx), ...base.slice(savedIdx + 1)]
    const demotedCod = cod.length > 0 && base[savedIdx].key !== "cod"
    return {
      chain,
      reason: demotedCod
        ? `saved_method:${base[savedIdx].key}+cod_demoted`
        : `saved_method:${base[savedIdx].key}`,
    }
  }
  if (savedIdx === 0) {
    return { chain: base, reason: `saved_method:${base[0].key}` }
  }

  // No usable saved method: weighted round-robin within the TOP priority tier
  // of the online providers, keeping the rest as pure fallback order.
  if (!online.length) return { chain: base, reason: "cod_only_fallback" }

  const topPriority = Math.min(...online.map((c) => c.priority))
  const tier = online.filter((c) => c.priority === topPriority)
  const idx = await nextRotation(tier.length)
  const pick = tier[idx]
  const rest = online.filter((c) => c !== pick)
  return {
    chain: [pick, ...rest, ...cod],
    reason: `round_robin:${pick.key}(tier@${topPriority})`,
  }
}

/** Structured audit line for every routing decision. */
export function logRouteDecision(decision: RouteDecision, context?: Record<string, unknown>) {
  console.log(
    `[payment-router] chose=${decision.providerId} reason=${decision.reason} ` +
      `chain=[${decision.chain.join(" -> ")}] ctx=${JSON.stringify(context ?? {})}`
  )
}
