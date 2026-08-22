import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { sendTestEmail, isSmtpConfigured, SMTP_PROVIDER_PRESETS } from "../../../../lib/emailer"
import { getStoreSettings } from "../../../../lib/settings"

const TestSendSchema = z.object({
  to: z.string().email(),
})

/**
 * Admin SMTP utilities (document-builder D6).
 *
 * GET  /admin/email/smtp → presets + whether transport is live (no secrets)
 * POST /admin/email/smtp/test-send {to} → sends a test email via saved config
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const settings = await getStoreSettings(req.scope)
  return res.json({
    presets: SMTP_PROVIDER_PRESETS,
    configured: isSmtpConfigured(settings.smtp),
    enabled: Boolean(settings.smtp?.enabled),
    from_email: settings.smtp?.from_email ?? "",
    host: settings.smtp?.host ?? "",
    port: settings.smtp?.port ?? null,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<z.infer<typeof TestSendSchema>>,
  res: MedusaResponse
) => {
  const body = (req.validatedBody ?? req.body ?? {}) as { to?: string }
  if (!body.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
    return res.status(400).json({ message: "A valid `to` email is required." })
  }

  const result = await sendTestEmail(req.scope, body.to)
  if (result.sent) {
    return res.json({ sent: true, messageId: result.messageId })
  }
  if (result.reason === "disabled") {
    return res.status(400).json({
      sent: false,
      message:
        "SMTP is not enabled/configured. Save host, port, user and password in Settings first.",
    })
  }
  return res.status(502).json({ sent: false, message: result.error ?? "SMTP send failed." })
}
