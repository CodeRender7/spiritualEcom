import { Modules } from "@medusajs/framework/utils"
import {
  BRM_NOTIFY_EVENTS,
  BrmChannelConfig,
  BrmNotifyEventKey,
  getStoreSettings,
} from "./settings"
import { pickConnectedSession, toWaId } from "./whatsapp-utils"
import { sendMessage } from "./whatsapp-session"

/**
 * BRM notification flow (A5): routes BRM lifecycle events
 * (activated, renewal_success, renewal_failure, grace_start, past_due,
 * paused, cancelled, expiry_warning) to configured channels (whatsapp/email)
 * with editable templates stored in the `divinekart_settings` blob.
 *
 * Email is a log-based sender seam for now (real SMTP is a follow-up) —
 * the dispatch still renders the configured subject/body so the seam is
 * transport-ready.
 *
 * Channel wiring:
 *  - whatsapp → the existing OpenWA session sender (sendMessage) using a
 *    connected session (same path as broadcasts). Skipped when no session
 *    is connected — BRM should never block on a missing gateway.
 *  - email    → structured console log (seam). No SMTP dependency.
 */

export type BrmNotifyVars = {
  /** Subscription row (needed for customer_id, id, currency, status…). */
  subscription: any
  /** Offer template (for code). Optional — falls back to subscription fields. */
  template?: any
  /** Charge amount in minor units (for renewal events). */
  amount?: number
  /** Next retry date (ISO string) for dunning events. */
  next_retry?: string | null
  /** Attempt number for failure/dunning events. */
  attempts?: number
}

/** Template placeholder keys we render. */
export type BrmTemplateVars = {
  name: string
  phone: string
  offer: string
  subscription: string
  amount: string
  period_end: string
  next_retry: string
  status: string
  attempts: string
}

/** Render a template, replacing {key} placeholders with their values. */
export function renderBrmTemplate(template: string, vars: BrmTemplateVars): string {
  return template
    .replace(/\{name\}/g, vars.name)
    .replace(/\{phone\}/g, vars.phone)
    .replace(/\{offer\}/g, vars.offer)
    .replace(/\{subscription\}/g, vars.subscription)
    .replace(/\{amount\}/g, vars.amount)
    .replace(/\{period_end\}/g, vars.period_end)
    .replace(/\{next_retry\}/g, vars.next_retry)
    .replace(/\{status\}/g, vars.status)
    .replace(/\{attempts\}/g, vars.attempts)
}

/** Format a minor-unit amount as ₹ (e.g. 49900 → ₹499). */
function formatAmount(amount?: number): string {
  if (amount == null) return ""
  return `₹${Math.round(amount / 100)}`
}

/** Friendly date, local timezone. */
function formatDate(d?: Date | string | null): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

/** Resolve a customer's phone + name from the CUSTOMER module. */
async function resolveCustomer(container: any, customerId: string): Promise<{
  phone: string
  name: string
  email: string
}> {
  try {
    const customerModule = container.resolve(Modules.CUSTOMER)
    const customers = await customerModule.listCustomers(
      { id: customerId },
      { select: ["id", "first_name", "last_name", "phone", "email"] }
    )
    const c = Array.isArray(customers) ? customers[0] : customers?.data?.[0]
    const name = [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email || "Customer"
    return { phone: String(c?.phone ?? ""), name, email: String(c?.email ?? "") }
  } catch (err) {
    console.error("DivineKart BRM notify: customer resolve failed:", err)
    return { phone: "", name: "Customer", email: "" }
  }
}

/** Build the render vars for a subscription event. */
function buildVars(
  customer: { phone: string; name: string; email: string },
  v: BrmNotifyVars
): BrmTemplateVars {
  const sub = v.subscription ?? {}
  const template = v.template ?? {}
  return {
    name: customer.name,
    phone: customer.phone,
    offer: String(template.code ?? sub.offer_template_id ?? ""),
    subscription: String(sub.id ?? ""),
    amount: formatAmount(v.amount),
    period_end: formatDate(sub.current_period_end),
    next_retry: v.next_retry ? formatDate(v.next_retry) : "",
    status: String(sub.status ?? ""),
    attempts: String(v.attempts ?? sub.metadata?.renewal_attempts ?? ""),
  }
}

/** Send via the OpenWA session sender if a session is connected. */
async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  if (!phone || !message) return false
  const sessionKey = pickConnectedSession()
  if (!sessionKey) {
    console.warn("DivineKart BRM notify: whatsapp skipped — no connected session")
    return false
  }
  const result = await sendMessage(sessionKey, toWaId(phone), message)
  if (!result.success) {
    console.error("DivineKart BRM notify: whatsapp send failed for", phone)
  }
  return result.success
}

/**
 * Log-based email sender seam. Renders subject + body and writes a structured
 * log line so the flow is end-to-end traceable before SMTP lands.
 */
function sendEmailSeam(email: string, subject: string, body: string): boolean {
  if (!email || !subject) return false
  console.log(
    `[brm-notify:email] to=${email} subject=${JSON.stringify(subject)} body=${JSON.stringify(body)}`
  )
  return true
}

/**
 * Dispatch one BRM lifecycle event through the configured channels.
 * Never throws — notifications must not break the BRM state machine.
 */
export async function notifyBrmEvent(
  container: any,
  event: BrmNotifyEventKey,
  vars: BrmNotifyVars
): Promise<{ dispatched: boolean; channels: string[] }> {
  const dispatched: string[] = []
  try {
    if (!BRM_NOTIFY_EVENTS.includes(event)) return { dispatched: false, channels: [] }

    const settings = await getStoreSettings(container)
    const cfg: BrmChannelConfig | undefined = settings.brm_notify?.events?.[event]
    if (!settings.brm_notify?.enabled || !cfg) {
      return { dispatched: false, channels: [] }
    }

    const customer = await resolveCustomer(container, vars.subscription?.customer_id)
    const render = buildVars(customer, vars)

    if (cfg.whatsapp?.enabled && cfg.whatsapp.template) {
      const message = renderBrmTemplate(cfg.whatsapp.template, render)
      const ok = await sendWhatsAppMessage(customer.phone, message)
      if (ok) dispatched.push("whatsapp")
    }

    if (cfg.email?.enabled && cfg.email.subject) {
      const subject = renderBrmTemplate(cfg.email.subject, render)
      const body = renderBrmTemplate(cfg.email.body || cfg.email.subject, render)
      if (sendEmailSeam(customer.email, subject, body)) dispatched.push("email")
    }

    return { dispatched: dispatched.length > 0, channels: dispatched }
  } catch (err) {
    console.error(`DivineKart BRM notify: ${event} dispatch failed:`, err)
    return { dispatched: false, channels: [] }
  }
}