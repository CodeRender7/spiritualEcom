import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveAudience } from "../../../../lib/whatsapp-broadcast"

/**
 * Admin WhatsApp Audience Preview
 * POST /admin/whatsapp/segments
 * Body: { audienceType, audience?, filters? }
 * → { total, sample } without persisting anything (used to size a campaign
 *   before creation).
 */

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = (req.body || {}) as {
      audienceType?: string
      audience?: string[]
      filters?: Record<string, unknown>
    }

    const audienceType = (body.audienceType as "manual_numbers" | "all_customers" | "customers_with_orders") || "manual_numbers"

    const { total, sample } = await resolveAudience(
      req.scope,
      audienceType,
      body.filters || null,
      body.audience || []
    )

    return res.json({ total, sample })
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message })
  }
}