import nodemailer, { type Transporter } from "nodemailer"
import { getStoreSettings, type SmtpSettings } from "./settings"

/**
 * SMTP email transport with attachments (document-builder D6, ADR-0002 §7).
 *
 * Reliability contract:
 *  - `getTransport` returns null whenever SMTP is disabled or unconfigured —
 *    callers fall back to the log seam (A5 behavior preserved exactly).
 *  - `sendEmail` never throws: failures are returned as { sent: false, error }
 *    so a dead SMTP box degrades dispatch instead of breaking a pipeline event.
 *  - The transport is cached per-process and rebuilt only when the saved
 *    settings change (cheap config fingerprint check on every call).
 */

export const SMTP_PROVIDER_PRESETS: Record<
  string,
  { label: string; host: string; port: number; secure: boolean; userHint?: string }
> = {
  ses: { label: "Amazon SES", host: "email-smtp.us-east-1.amazonaws.com", port: 587, secure: false },
  sendgrid: { label: "SendGrid", host: "smtp.sendgrid.net", port: 587, secure: false, userHint: "apikey" },
  mailgun: { label: "Mailgun", host: "smtp.mailgun.org", port: 587, secure: false },
  gmail: { label: "Gmail", host: "smtp.gmail.com", port: 465, secure: true },
  custom: { label: "Custom SMTP", host: "", port: 587, secure: false },
}

let cached: { fingerprint: string; transporter: Transporter } | null = null

function fingerprint(cfg: SmtpSettings): string {
  return [cfg.host, cfg.port, cfg.secure ? 1 : 0, cfg.user, cfg.password].join("|")
}

export function isSmtpConfigured(cfg: SmtpSettings | undefined | null): boolean {
  return Boolean(cfg?.enabled && cfg?.host && cfg?.port && cfg?.user)
}

/** Nodemailer transport from the admin-saved settings; null when disabled. */
export async function getTransport(container: any): Promise<Transporter | null> {
  const settings = await getStoreSettings(container)
  const cfg = settings.smtp
  if (!isSmtpConfigured(cfg) || !cfg) return null

  const fp = fingerprint(cfg)
  if (cached && cached.fingerprint === fp) return cached.transporter

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: Number(cfg.port),
    secure: Boolean(cfg.secure),
    auth: { user: cfg.user, pass: cfg.password },
    // Reliability defaults for transactional sends inside a container.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
  })

  cached = { fingerprint: fp, transporter }
  return transporter
}

export type EmailAttachment = {
  filename: string
  content?: Buffer
  path?: string
  contentType?: string
}

export type SendEmailResult =
  | { sent: true; messageId: string }
  | { sent: false; reason: "disabled" | "error"; error?: string }

/**
 * Send one email. Attachments carry D4 PDF buffers directly.
 * Falls back to {sent:false, reason:'disabled'} when SMTP is unset — the
 * caller decides what the fallback means (brm-notify logs the seam output).
 */
export async function sendEmail(
  container: any,
  options: {
    to: string
    subject: string
    html: string
    text?: string
    attachments?: EmailAttachment[]
  }
): Promise<SendEmailResult> {
  try {
    const settings = await getStoreSettings(container)
    const cfg = settings.smtp as SmtpSettings | undefined
    const transporter = await getTransport(container)
    if (!transporter || !cfg) {
      return { sent: false, reason: "disabled" }
    }

    const info = await transporter.sendMail({
      from: cfg.from_email
        ? { name: cfg.from_name || "DivineKart", address: cfg.from_email }
        : cfg.user,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    })

    return { sent: true, messageId: String(info.messageId ?? "") }
  } catch (err: any) {
    console.error("DivineKart email send failed:", err?.message ?? err)
    return { sent: false, reason: "error", error: String(err?.message ?? err) }
  }
}

/** Admin "Send Test Email" — proves credentials + from-address end to end. */
export async function sendTestEmail(
  container: any,
  to: string
): Promise<SendEmailResult> {
  const settings = await getStoreSettings(container)
  const brand = settings.invoicing?.company_name || "DivineKart"
  return sendEmail(container, {
    to,
    subject: `${brand} — test email`,
    html: `<div style="font-family:Arial,sans-serif;padding:16px;">
      <h2 style="color:#F97316;margin:0 0 8px;">🕉️ ${brand}</h2>
      <p>Your SMTP configuration works. Transactional emails and document deliveries will use this connection.</p>
      <p style="color:#777;font-size:12px;">Sent ${new Date().toISOString()} by the DivineKart document system (D6).</p>
    </div>`,
  })
}
