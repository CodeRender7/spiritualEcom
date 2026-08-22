import { Modules } from "@medusajs/framework/utils"

/**
 * Email template gallery domain logic (email-builder map, E1–E4).
 *
 * A gallery template carries:
 *  - `design`: the Unlayer design JSON the visual editor loads
 *  - `html`:   the exported HTML (keeps `{{key:value}}` pairs intact)
 *  - `subject`: the email subject (also may carry `{{key:value}}` pairs)
 *  - `placeholders`: the catalog parsed from the design/html
 *
 * Placeholder syntax is `{{key:value}}` — key is the runtime variable name,
 * value is the example/default shown in the editor and used as the render
 * fallback when the runtime variable is missing. The dispatcher substitutes
 * `{{key:value}}` from the event's runtime variables at send time.
 *
 * `EVENT_AVAILABLE_KEYS` is the per-process-event variable catalog used by
 * the suggestive admin picker (E3): a template is suggested for an event
 * when its placeholder keys ⊆ the event's available keys.
 */

export type EmailPlaceholder = {
  key: string
  /** Example / default value shown in the editor and used as render fallback. */
  value: string
  description?: string
}

/** Placeholder catalog keyed by process event name. */
export const EVENT_AVAILABLE_KEYS: Record<string, string[]> = {
  // BRM lifecycle events (A5 vars from brm-notify.ts buildVars)
  activated: ["name", "phone", "offer", "subscription", "amount", "period_end", "status"],
  renewal_success: ["name", "phone", "offer", "subscription", "amount", "period_end", "status"],
  renewal_failure: [
    "name", "phone", "offer", "subscription", "amount", "period_end", "status", "attempts", "next_retry",
  ],
  grace_start: [
    "name", "phone", "offer", "subscription", "amount", "period_end", "status", "attempts", "next_retry",
  ],
  past_due: [
    "name", "phone", "offer", "subscription", "amount", "period_end", "status", "attempts", "next_retry",
  ],
  paused: [
    "name", "phone", "offer", "subscription", "amount", "period_end", "status", "attempts", "next_retry",
  ],
  cancelled: ["name", "phone", "offer", "subscription", "amount", "period_end", "status"],
  expiry_warning: ["name", "phone", "offer", "subscription", "amount", "period_end", "status", "next_retry"],
  // Order pipeline (whatsapp.ts orderToRecv vars)
  order_confirmation: ["name", "phone", "order_id", "total"],
  order_shipped: ["name", "phone", "order_id", "total"],
  // Document pipeline (document-builder D3 — full doc var set; see
  // document-templates.ts EVENT_DOC_KEYS / collectOrderVars)
  invoice: ["name", "phone", "order_id", "total"],
  payment_captured: [
    "name", "phone", "order_id", "total", "amount",
    "txn_id", "payment_mode", "receipt_number", "invoice_number", "paid_to", "payment_date",
  ],
  payment_refunded: [
    "name", "phone", "order_id", "total", "amount",
    "refund_id", "refund_amount", "refund_reason", "refund_date",
  ],
  quote: ["name", "phone", "quote_no", "valid_until", "grand_total"],
  // Transactional
  welcome: ["name", "phone"],
  refund: ["name", "phone", "order_id", "total", "amount"],
}

/** Human labels for the admin event picker. */
export const EVENT_LABELS: Record<string, string> = {
  activated: "BRM — Subscription activated",
  renewal_success: "BRM — Renewal successful",
  renewal_failure: "BRM — Renewal failed",
  grace_start: "BRM — Grace period started",
  past_due: "BRM — Payment past due",
  paused: "BRM — Subscription paused",
  cancelled: "BRM — Subscription cancelled",
  expiry_warning: "BRM — Expiry warning",
  order_confirmation: "Order — Confirmation",
  order_shipped: "Order — Shipped",
  welcome: "Transactional — Welcome",
  invoice: "Transactional — Invoice",
  refund: "Transactional — Refund",
}

/** Parse `{{key:value}}` pairs out of a string (subject or HTML). */
export function parsePlaceholders(text: string): EmailPlaceholder[] {
  if (!text) return []
  const out: EmailPlaceholder[] = []
  const seen = new Set<string>()
  const re = /\{\{(\w+):([^}]*)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    out.push({ key: m[1], value: m[2] ?? "", description: EVENT_AVAILABLE_KEYS_DESC[m[1]] })
  }
  return out
}

/** Short descriptions for known keys (editor tooltip). */
const EVENT_AVAILABLE_KEYS_DESC: Record<string, string> = {
  name: "Customer name",
  phone: "Customer phone",
  offer: "Offer / plan code",
  subscription: "Subscription id",
  amount: "Charge amount (₹)",
  period_end: "Current period end date",
  status: "Subscription status",
  attempts: "Renewal attempt number",
  next_retry: "Next retry date",
  order_id: "Order id",
  total: "Order total (₹)",
}

/**
 * Render a string (subject or HTML) by substituting every `{{key:value}}`
 * with `vars[key]`, falling back to the placeholder's own value when the
 * runtime variable is missing. Unknown keys render as their example value.
 */
export function renderEmailString(
  text: string,
  vars: Record<string, string | number | undefined | null>
): string {
  if (!text) return ""
  return text.replace(/\{\{(\w+):([^}]*)\}\}/g, (_full, key: string, fallback: string) => {
    const v = vars[key]
    if (v === undefined || v === null || v === "") return fallback || ""
    return String(v)
  })
}

/** Convenience: render the HTML body. */
export function renderEmailHtml(
  html: string,
  vars: Record<string, string | number | undefined | null>
): string {
  return renderEmailString(html, vars)
}

/** Convenience: render the subject line. */
export function renderEmailSubject(
  subject: string,
  vars: Record<string, string | number | undefined | null>
): string {
  return renderEmailString(subject, vars)
}

/**
 * Suggest gallery templates for a process event: those whose placeholder key
 * set is a subset of the event's available keys (surplus keys would render
 * with example values, so they're excluded). Sorted: exact key-match first,
 * then by name.
 */
export function suggestTemplatesForEvent(
  templates: any[],
  eventKey: string
): any[] {
  const available = new Set<string>(EVENT_AVAILABLE_KEYS[eventKey] ?? [])
  const scored = templates
    .filter((t: any) => {
      const keys = ((t.placeholders ?? []) as EmailPlaceholder[]).map((p) => p.key)
      return keys.every((k) => available.has(k))
    })
    .map((t: any) => {
      const keys = new Set<string>(
        ((t.placeholders ?? []) as EmailPlaceholder[]).map((p) => p.key)
      )
      const exact = keys.size === 0 || [...keys].every((k) => available.has(k))
      return { t, exact }
    })
    .sort((a, b) => Number(b.exact) - Number(a.exact) || a.t.name.localeCompare(b.t.name))
  return scored.map((s) => s.t)
}

/** Resolve the email-template module service from any Medusa container. */
export function resolveEmailTemplateService(container: any): any {
  return container.resolve("email_template")
}

/** Minimal but valid Unlayer design JSON (a text block with the placeholders). */
export function buildSeedDesign(opts: {
  title: string
  bodyText: string
  footerText?: string
}): any {
  const bodyText = `<p><strong>${opts.title}</strong></p><p>${opts.bodyText}</p>`
  const footer = opts.footerText
    ? `<p style="font-size:12px;color:#666666;">${opts.footerText}</p>`
    : `<p style="font-size:12px;color:#666666;">Thank you for shopping at DivineKart! 🙏</p>`
  return {
    counter: 0,
    body: {
      rows: [
        {
          id: "seed-header",
          cells: [1],
          columns: [
            {
              id: "seed-header-col",
              contents: [
                {
                  id: "seed-header-text",
                  type: "text",
                  values: {
                    text: `<p style="color:#F97316;font-size:24px;"><strong>🕉️ DivineKart</strong></p>`,
                    containerPadding: "10px",
                  },
                },
              ],
              values: { backgroundColor: "#ffffff", padding: "10px" },
            },
          ],
          values: { backgroundColor: "#ffffff", padding: "0px" },
        },
        {
          id: "seed-body",
          cells: [1],
          columns: [
            {
              id: "seed-body-col",
              contents: [
                {
                  id: "seed-body-text",
                  type: "text",
                  values: { text: bodyText, containerPadding: "20px" },
                },
              ],
              values: { backgroundColor: "#ffffff", padding: "10px" },
            },
          ],
          values: { backgroundColor: "#ffffff", padding: "0px" },
        },
        {
          id: "seed-footer",
          cells: [1],
          columns: [
            {
              id: "seed-footer-col",
              contents: [
                {
                  id: "seed-footer-text",
                  type: "text",
                  values: { text: footer, containerPadding: "10px" },
                },
              ],
              values: { backgroundColor: "#f2f3f4", padding: "10px" },
            },
          ],
          values: { backgroundColor: "#f2f3f4", padding: "0px" },
        },
      ],
      values: {
        backgroundColor: "#f2f3f4",
        contentWidth: "600px",
        fontFamily: { label: "Arial", value: "Arial, Helvetica, sans-serif" },
      },
    },
  }
}

/** Seed row shape for the gallery (E4). */
export type SeedEmailTemplate = {
  name: string
  description: string
  category: "brm" | "order" | "transactional" | "custom"
  event_key: string
  subject: string
  /** Body HTML with {{key:value}} placeholders (also becomes the design text). */
  body: string
  footerText?: string
  status: "active" | "draft"
}

/** All prospective mails (gallery seeding, E4). */
export function seedEmailTemplateRows(): SeedEmailTemplate[] {
  return [
    {
      name: "BRM — Subscription activated",
      description: "Sent when a subscription goes live after purchase.",
      category: "brm",
      event_key: "activated",
      subject: "Your DivineKart subscription ({{offer:Plan}}) is active 🎉",
      body: `Namaste {{name:Customer}},<br><br>Your subscription <strong>{{offer:Plan}}</strong> is now active until <strong>{{period_end:—}}</strong>.<br><br>Amount: {{amount:₹499}} · Status: {{status:active}}`,
      status: "active",
    },
    {
      name: "BRM — Renewal successful",
      description: "Sent when an auto-renewal charge succeeds.",
      category: "brm",
      event_key: "renewal_success",
      subject: "Your DivineKart subscription ({{offer:Plan}}) renewed ✅",
      body: `Namaste {{name:Customer}},<br><br>Your subscription <strong>{{offer:Plan}}</strong> renewed successfully. Next period runs until <strong>{{period_end:—}}</strong>.<br><br>Charged: {{amount:₹499}} · Status: {{status:active}}`,
      status: "active",
    },
    {
      name: "BRM — Renewal failed",
      description: "Sent when a renewal charge fails (still in grace).",
      category: "brm",
      event_key: "renewal_failure",
      subject: "Action needed: {{offer:Plan}} renewal failed",
      body: `Namaste {{name:Customer}},<br><br>We couldn't charge <strong>{{amount:₹499}}</strong> for <strong>{{offer:Plan}}</strong> (attempt {{attempts:1}}).<br><br>We'll retry on {{next_retry:—}}. Please ensure your payment method is valid.`,
      status: "active",
    },
    {
      name: "BRM — Grace period started",
      description: "Sent when the first failed charge opens the grace window.",
      category: "brm",
      event_key: "grace_start",
      subject: "Your {{offer:Plan}} is in its grace period",
      body: `Namaste {{name:Customer}},<br><br>Your subscription <strong>{{offer:Plan}}</strong> entered its grace period after a failed payment. Keep using it until <strong>{{period_end:—}}</strong> while we retry.`,
      status: "active",
    },
    {
      name: "BRM — Payment past due",
      description: "Dunning escalation — grace elapsed, retries continue.",
      category: "brm",
      event_key: "past_due",
      subject: "Payment past due: {{offer:Plan}}",
      body: `Namaste {{name:Customer}},<br><br>Your payment of <strong>{{amount:₹499}}</strong> for <strong>{{offer:Plan}}</strong> is past due.<br><br>Next retry: {{next_retry:—}} · Attempts so far: {{attempts:1}}`,
      status: "active",
    },
    {
      name: "BRM — Subscription paused",
      description: "Dunning terminal — retries exhausted, subscription paused.",
      category: "brm",
      event_key: "paused",
      subject: "Your {{offer:Plan}} subscription was paused",
      body: `Namaste {{name:Customer}},<br><br>After <strong>{{attempts:3}}</strong> failed attempts, your subscription <strong>{{offer:Plan}}</strong> has been paused.<br><br>Resume anytime from your account.`,
      status: "active",
    },
    {
      name: "BRM — Subscription cancelled",
      description: "Sent when a subscription is cancelled (admin or customer).",
      category: "brm",
      event_key: "cancelled",
      subject: "Your {{offer:Plan}} subscription was cancelled",
      body: `Namaste {{name:Customer}},<br><br>Your subscription <strong>{{offer:Plan}}</strong> has been cancelled. We're sorry to see you go — you can resubscribe anytime.`,
      status: "active",
    },
    {
      name: "BRM — Expiry warning",
      description: "Sent before a subscription lapses (lifetime/cycle bound).",
      category: "brm",
      event_key: "expiry_warning",
      subject: "Your {{offer:Plan}} subscription is expiring",
      body: `Namaste {{name:Customer}},<br><br>Your subscription <strong>{{offer:Plan}}</strong> is about to expire on <strong>{{period_end:—}}</strong>.<br><br>Renew now to keep your benefits uninterrupted.`,
      status: "active",
    },
    {
      name: "Order — Confirmation",
      description: "Sent when a customer places an order.",
      category: "order",
      event_key: "order_confirmation",
      subject: "Order #{{order_id:0000}} confirmed 🕉️",
      body: `Namaste {{name:Customer}},<br><br>Your DivineKart order <strong>#{{order_id:0000}}</strong> is confirmed.<br><br>Total: {{total:₹0}} — we'll notify you when it ships.`,
      status: "active",
    },
    {
      name: "Order — Shipped",
      description: "Sent when an order ships.",
      category: "order",
      event_key: "order_shipped",
      subject: "Order #{{order_id:0000}} has shipped 🚚",
      body: `Namaste {{name:Customer}},<br><br>Your DivineKart order <strong>#{{order_id:0000}}</strong> is on its way!<br><br>Track your shipment for the latest updates.`,
      status: "active",
    },
    {
      name: "Transactional — Welcome",
      description: "Sent to new customers after registration.",
      category: "transactional",
      event_key: "welcome",
      subject: "Welcome to DivineKart, {{name:friend}}! 🙏",
      body: `Namaste {{name:friend}},<br><br>Welcome to DivineKart — your home for devotional art and puja essentials. Browse our collection and find something special.`,
      status: "active",
    },
    {
      name: "Transactional — Invoice",
      description: "Order invoice sent after checkout.",
      category: "transactional",
      event_key: "invoice",
      subject: "Invoice for order #{{order_id:0000}}",
      body: `Namaste {{name:Customer}},<br><br>Here is the invoice for your order <strong>#{{order_id:0000}}</strong>.<br><br>Total: {{total:₹0}}`,
      status: "active",
    },
    {
      name: "Transactional — Refund",
      description: "Sent when a refund is processed.",
      category: "transactional",
      event_key: "refund",
      subject: "Refund issued for order #{{order_id:0000}}",
      body: `Namaste {{name:Customer}},<br><br>A refund of <strong>{{amount:₹0}}</strong> has been issued for order <strong>#{{order_id:0000}}</strong>. It may take 3–7 days to appear on your statement.`,
      status: "active",
    },
  ]
}