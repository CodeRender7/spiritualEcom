import { Modules } from "@medusajs/framework/utils"
import { notifyBrmEvent } from "./brm-notify"

/**
 * BRM (Business Revenue Management) domain logic — T9 runtime (A4).
 *
 * Writes go through the `brm` module service's generated CRUD methods
 * (createSubscriptions, updateOfferTemplates, ...) — the remote-query
 * `query.graph()` path is read-only in the installed Medusa version.
 *
 * Key invariants (telecom model, T9):
 *  - price-plan ≠ charge-plan: subscription snapshots plan prices into
 *    subscription_item; renewals re-rate from the snapshot.
 *  - recharge ≠ top-up: add_on_template never touches the base subscription.
 *
 * Notifications (A5): lifecycle transitions fire `notifyBrmEvent` through the
 * admin-configurable dispatcher — the BRM state machine never blocks on it.
 */

export type OfferContext = {
  /** Payment provider id actually chosen at checkout (T6/T7), e.g. "razorpay". */
  provider?: string | null
  /** Plan family from sale_type / plan kind (T8), e.g. "subscription". */
  plan_family?: string | null
  /** Payment method type, e.g. "card" | "upi" | "wallet" | "cod". */
  payment_method?: string | null
  /** Cart region id. */
  region?: string | null
}

const BRM_PREFIX = "brm"

/** Short id generator matching the repo convention. */
export function brmId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** Resolve the brm module service from any Medusa container. */
export function resolveBrmService(container: any): any {
  return container.resolve("brm")
}

/**
 * 4-way offer resolution (T9 (a)): find way_groups whose filters match the
 * customer context (null filter = wildcard), priority-ordered, then the
 * active offer_templates bound to those way groups. Templates with no
 * way_group (way_group_id null) are treated as always-eligible fallbacks.
 */
export async function resolveOffers(
  container: any,
  ctx: OfferContext
): Promise<any[]> {
  const brm = resolveBrmService(container)

  const [wayGroups, templates] = await Promise.all([
    brm.listWayGroups({ status: "active" }),
    brm.listOfferTemplates({ status: "active" }),
  ])

  const matches = (wg: any): boolean =>
    (!wg.provider || wg.provider === ctx.provider) &&
    (!wg.plan_family || wg.plan_family === ctx.plan_family) &&
    (!wg.payment_method || wg.payment_method === ctx.payment_method) &&
    (!wg.region || wg.region === ctx.region)

  const scored = wayGroups
    .map((wg: any) => ({
      wg,
      specificity:
        (wg.provider ? 1 : 0) +
        (wg.plan_family ? 1 : 0) +
        (wg.payment_method ? 1 : 0) +
        (wg.region ? 1 : 0),
    }))
    .filter((s: { wg: any }) => matches(s.wg))
    .sort(
      (a: { specificity: number; wg: any }, b: { specificity: number; wg: any }) =>
        b.specificity - a.specificity || (a.wg.priority ?? 100) - (b.wg.priority ?? 100)
    )

  const ids = new Set<string>()
  for (const s of scored) ids.add(s.wg.id)

  const bound = templates.filter((t: any) => (t.way_group_id ? ids.has(t.way_group_id) : true))
  const resolved: any[] = []
  for (const t of bound) {
    const wg = t.way_group_id
      ? scored.find((s: { wg: any }) => s.wg.id === t.way_group_id)?.wg
      : null
    resolved.push({ template: t, way_group: wg ?? null })
  }
  return resolved
}

/** Full template tree: template + way group + plan lines + add-ons. */
export async function getTemplateTree(container: any, templateId: string): Promise<any> {
  const brm = resolveBrmService(container)
  const [templates, wayGroups, planLines, addOns] = await Promise.all([
    brm.listOfferTemplates({ id: templateId }),
    brm.listWayGroups({}),
    brm.listPlanLines({ offer_template_id: templateId }),
    brm.listAddOnTemplates({ offer_template_id: templateId }),
  ])
  const template = templates[0]
  if (!template) throw new Error(`Offer template ${templateId} not found`)
  return {
    template,
    way_group: template.way_group_id
      ? wayGroups.find((w: any) => w.id === template.way_group_id) ?? null
      : null,
    plan_lines: planLines,
    add_ons: addOns,
  }
}

const INTERVAL_MS: Record<string, number> = {
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  year: 31_536_000_000,
}

/** Advance a date by the template's interval (calendar-ish approximation). */
export function addInterval(
  from: Date,
  interval: string,
  intervalCount: number
): Date {
  const ms = INTERVAL_MS[interval] ?? INTERVAL_MS.month
  return new Date(from.getTime() + ms * intervalCount)
}

/**
 * Create a subscription from a resolved offer — snapshots template + plan
 * lines into `subscription` + `subscription_item` rows (price-plan ≠
 * charge-plan). Returns the created subscription.
 */
export async function createSubscription(
  container: any,
  input: {
    customer_id: string
    template_id: string
    way_group_id?: string | null
    currency?: string
    payment_method_id?: string | null
    provider_payment_customer?: string | null
    /** Override the anchor (default: now). */
    billing_anchor?: Date | null
    metadata?: Record<string, unknown> | null
  }
): Promise<any> {
  const brm = resolveBrmService(container)
  const { template, way_group, plan_lines } = await getTemplateTree(container, input.template_id)

  const anchor = input.billing_anchor ?? new Date()
  const periodStart = new Date(anchor)
  const periodEnd = addInterval(periodStart, template.interval, template.interval_count)
  const graceUntil = new Date(periodEnd.getTime() + (template.grace_days ?? 3) * 86_400_000)
  const maxCycles = template.max_cycles ?? null

  const subId = brmId("sub")
  const created = await brm.createSubscriptions({
    id: subId,
    customer_id: input.customer_id,
    offer_template_id: template.id,
    way_group_id: way_group?.id ?? input.way_group_id ?? null,
    status: "active",
    current_period_start: periodStart,
    current_period_end: periodEnd,
    billing_anchor_date: anchor,
    cycles_remaining: maxCycles,
    auto_renew: template.auto_renew ?? true,
    grace_until: graceUntil,
    currency: input.currency ?? "inr",
    payment_method_id: input.payment_method_id ?? null,
    provider_payment_customer: input.provider_payment_customer ?? null,
    metadata: input.metadata ?? { template_code: template.code },
  })

  const items = plan_lines.map((pl: any) => ({
    id: brmId("sbi"),
    subscription_id: subId,
    plan_line_id: pl.id,
    product_id: pl.product_id ?? null,
    quantity: pl.quantity ?? 1,
    unit_price: pl.unit_price ?? 0,
    included_qty: pl.included_qty ?? 0,
    used_qty: 0,
    next_charge_at: periodEnd,
    status: "active",
  }))
  if (items.length) await brm.createSubscriptionItems(items)

  // A5: notify the configured channels that the subscription went live.
  await notifyBrmEvent(container, "activated", { subscription: created, template })

  return created
}

/** Compute a line's per-cycle charge from its snapshot (snapshot re-rating). */
export function lineCycleAmount(item: any): number {
  return (item.unit_price ?? 0) * (item.quantity ?? 1)
}

/** Usage overage for a usage-charge line: units beyond the free pool. */
export function lineUsageOverage(item: any): number {
  const used = item.used_qty ?? 0
  const included = item.included_qty ?? 0
  return used > included ? used - included : 0
}

/** Record admin-entered usage against a subscription item (v1 metering). */
export async function recordUsage(
  container: any,
  input: {
    subscription_item_id: string
    quantity: number
    metadata?: Record<string, unknown> | null
  }
): Promise<any> {
  const brm = resolveBrmService(container)
  const [items] = await Promise.all([
    brm.listSubscriptionItems({ id: input.subscription_item_id }),
  ])
  const item = items[0]
  if (!item) throw new Error(`Subscription item ${input.subscription_item_id} not found`)
  const updated = await brm.updateSubscriptionItems({
    id: item.id,
    used_qty: (item.used_qty ?? 0) + input.quantity,
    metadata: { ...(item.metadata ?? {}), ...(input.metadata ?? {}) },
  })
  return updated
}

/**
 * Renewal scheduler step (A4 / T10): find subscriptions due for renewal,
 * write a renewal_event, attempt the charge through the T7 router seam
 * (T32 implements the actual router; this is the seam it plugs into), then
 * apply grace/dunning transitions.
 *
 * Dunning honours the template knobs:
 *   - grace_days (0–30): window after period end before a failed charge
 *     escalates. While inside grace the subscription stays active.
 *   - retry_attempts + retry_interval_days: a failed attempt schedules the
 *     next retry at period_end + interval[attempt] (stored as `next_retry_at`
 *     in subscription metadata). Attempts past max_attempts with grace
 *     expired → expired.
 *   - past_due → paused once grace has elapsed without a successful retry;
 *     admin resumes via setSubscriptionStatus.
 *   - max_cycles / auto_renew / validity_days bound the lifetime on success.
 *
 * Returns summary counts for the job log.
 */
export async function processRenewals(container: any): Promise<{
  checked: number
  renewed: number
  failed: number
  pastDue: number
  paused: number
  expired: number
}> {
  const brm = resolveBrmService(container)
  const now = new Date()
  const due = await brm.listSubscriptions({
    status: ["active", "past_due"],
    current_period_end: { $lte: now } as any,
  })

  const summary = { checked: due.length, renewed: 0, failed: 0, pastDue: 0, paused: 0, expired: 0 }

  for (const sub of due) {
    // Snapshot the template knobs at renewal time.
    const [templates] = await Promise.all([brm.listOfferTemplates({ id: sub.offer_template_id })])
    const template = templates[0]
    const [items] = await Promise.all([brm.listSubscriptionItems({ subscription_id: sub.id })])
    const amount = items.reduce((acc: number, it: any) => acc + lineCycleAmount(it), 0)

    const graceDays = template?.grace_days ?? 3
    const graceExpired = new Date(
      (sub.current_period_end?.getTime() ?? now.getTime()) + graceDays * 86_400_000
    ) <= now

    // Honor retry_interval_days: don't re-attempt before the scheduled retry.
    const nextRetryAt = sub.metadata?.next_retry_at ? new Date(sub.metadata.next_retry_at) : null
    if (nextRetryAt && nextRetryAt > now) {
      summary.failed += 1
      continue
    }

    const eventId = brmId("rev")
    await brm.createRenewalEvents({
      id: eventId,
      subscription_id: sub.id,
      period_start: sub.current_period_start ?? null,
      period_end: sub.current_period_end ?? null,
      amount,
      kind: "renewal",
      attempt: (sub.metadata?.renewal_attempts ?? 0) + 1,
      status: "pending",
    })

    // Router seam: charge the saved method via the payment module. T32 swaps
    // this for the real weighted-round-robin router; until then, a missing
    // payment method means the attempt fails into grace/dunning.
    const chargeResult = await attemptRenewalCharge(container, sub, amount)
    await brm.updateRenewalEvents({
      id: eventId,
      status: chargeResult.ok ? "succeeded" : "failed",
      payment_id: chargeResult.paymentId ?? null,
      error: chargeResult.error ?? null,
    })

    if (chargeResult.ok) {
      // Advance to next period.
      const nextStart = sub.current_period_end ?? now
      const nextEnd = addInterval(nextStart, template?.interval ?? "month", template?.interval_count ?? 1)
      const cyclesLeft =
        sub.cycles_remaining == null ? null : Math.max(0, (sub.cycles_remaining ?? 1) - 1)

      const anchor = sub.billing_anchor_date ?? nextStart
      const lifetimeExpired =
        template?.validity_days != null &&
        new Date(anchor.getTime() + template.validity_days * 86_400_000) <= nextEnd

      if (cyclesLeft === 0 || template?.auto_renew === false || lifetimeExpired) {
        // Terminal: max_cycles exhausted, auto_renew off, or validity window.
        await brm.updateSubscriptions({
          id: sub.id,
          status: template?.auto_renew === false ? "non_renewing" : "expired",
          cycles_remaining: cyclesLeft,
          metadata: { ...(sub.metadata ?? {}), renewal_attempts: 0, next_retry_at: null },
        })
        // A5: warn the customer before the subscription lapses.
        await notifyBrmEvent(container, "expiry_warning", { subscription: { ...sub, status: "expired" }, template })
        summary.expired += 1
        continue
      }

      await brm.updateSubscriptions({
        id: sub.id,
        status: "active",
        current_period_start: nextStart,
        current_period_end: nextEnd,
        cycles_remaining: cyclesLeft,
        grace_until: new Date(nextEnd.getTime() + graceDays * 86_400_000),
        metadata: { ...(sub.metadata ?? {}), renewal_attempts: 0, next_retry_at: null },
      })
      // A5: renewal charged OK — confirm to the customer.
      await notifyBrmEvent(container, "renewal_success", {
        subscription: { ...sub, current_period_start: nextStart, current_period_end: nextEnd, cycles_remaining: cyclesLeft, status: "active" },
        template,
        amount,
      })
      summary.renewed += 1
      continue
    }

    // Failed attempt → grace / dunning state machine.
    const attempts = (sub.metadata?.renewal_attempts ?? 0) + 1
    const maxAttempts = template?.retry_attempts ?? 3
    const intervals: number[] = template?.retry_interval_days ?? [0, 3, 6]
    const nextRetryDelayDays = intervals[Math.min(attempts, intervals.length - 1)] ?? 3
    const nextRetry = new Date(
      (sub.current_period_end?.getTime() ?? now.getTime()) + nextRetryDelayDays * 86_400_000
    )

    if (graceExpired && attempts >= maxAttempts) {
      // Retries exhausted AND grace elapsed → terminal dunning state; the admin
      // resumes via setSubscriptionStatus (T9: past_due → paused → expired is
      // reachable by admin action; expired also fires on lifetime bounds).
      await brm.updateSubscriptions({
        id: sub.id,
        status: "paused",
        metadata: { ...(sub.metadata ?? {}), renewal_attempts: attempts, next_retry_at: null },
      })
      // A5: hard dunning state reached.
      await notifyBrmEvent(container, "paused", { subscription: { ...sub, status: "paused" }, template, amount, attempts })
      summary.paused += 1
    } else if (graceExpired) {
      // Grace elapsed but retries remain → escalate to past_due; retry at the
      // scheduled interval from period end.
      await brm.updateSubscriptions({
        id: sub.id,
        status: "past_due",
        metadata: { ...(sub.metadata ?? {}), renewal_attempts: attempts, next_retry_at: nextRetry.toISOString() },
      })
      // A5: dunning escalation.
      await notifyBrmEvent(container, "past_due", { subscription: { ...sub, status: "past_due" }, template, amount, attempts, next_retry: nextRetry.toISOString() })
      summary.pastDue += 1
    } else {
      // Still inside grace: stay active, retry on schedule.
      await brm.updateSubscriptions({
        id: sub.id,
        status: "active",
        metadata: { ...(sub.metadata ?? {}), renewal_attempts: attempts, next_retry_at: nextRetry.toISOString() },
      })
      // A5: a charge failed but we're still in grace. First failure also marks
      // the grace period start; every failure fires renewal_failure.
      await notifyBrmEvent(container, "renewal_failure", { subscription: { ...sub, status: "active" }, template, amount, attempts, next_retry: nextRetry.toISOString() })
      if (attempts === 1) {
        await notifyBrmEvent(container, "grace_start", { subscription: { ...sub, status: "active" }, template, amount, attempts, next_retry: nextRetry.toISOString() })
      }
      summary.failed += 1
    }
  }

  return summary
}

/**
 * The T7 router seam for renewal auto-charge. Today this best-effort tries a
 * payment session via the payment module; T32 replaces the body with the
 * weighted round-robin router while keeping this signature.
 */
export async function attemptRenewalCharge(
  container: any,
  sub: any,
  amount: number
): Promise<{ ok: boolean; paymentId?: string; error?: string }> {
  if (!sub.payment_method_id) {
    return { ok: false, error: "no_payment_method" }
  }
  try {
    const paymentModule = container.resolve(Modules.PAYMENT)
    const created = await paymentModule.createPaymentSession({
      provider_id: sub.payment_method_id,
      amount,
      currency_code: sub.currency ?? "inr",
      data: { brm_subscription_id: sub.id, automatic: true },
    })
    return { ok: Boolean(created?.id), paymentId: created?.id ?? undefined }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) }
  }
}

/** Lifecycle helpers for admin actions (A5 UI + A6 verification). */
export async function setSubscriptionStatus(
  container: any,
  subscriptionId: string,
  status: string,
  note?: string
): Promise<any> {
  const brm = resolveBrmService(container)
  const [rows] = await Promise.all([brm.listSubscriptions({ id: subscriptionId })])
  const sub = rows[0]
  if (!sub) throw new Error(`Subscription ${subscriptionId} not found`)
  const updated = await brm.updateSubscriptions({
    id: subscriptionId,
    status,
    metadata: { ...(sub.metadata ?? {}), status_note: note ?? null },
  })
  // A5: admin lifecycle action → notify (cancelled is the primary target;
  // other admin-set states fall through the same dispatcher for future events).
  if (status === "cancelled") {
    await notifyBrmEvent(container, "cancelled", { subscription: { ...sub, status }, template: undefined })
  }
  return updated
}

/** Compute a prorated amount for a mid-cycle change (T9 (c)). */
export function prorateAmount(
  fullAmount: number,
  remainingMs: number,
  cycleMs: number,
  mode: string
): number {
  if (mode === "none" || !remainingMs || !cycleMs) return fullAmount
  const fraction = remainingMs / cycleMs
  if (mode === "per_day_ceil") {
    const days = Math.ceil(remainingMs / 86_400_000)
    return Math.round((fullAmount * days) / Math.max(1, Math.round(cycleMs / 86_400_000)))
  }
  return Math.round(fullAmount * fraction)
}

/** Resolve a subscription's current period in ms (default month). */
export function cycleMsFor(sub: any, template: any): number {
  return INTERVAL_MS[template?.interval ?? "month"] * (template?.interval_count ?? 1)
}