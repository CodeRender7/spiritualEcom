import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  BRM_NOTIFY_EVENTS,
  BrmNotifySettings,
  getStoreSettings,
  writeStoreSettings,
} from "../../../../lib/settings"

/**
 * Admin BRM API — notification flow config (A5)
 * GET  /admin/brm/notifications   → current brm_notify settings
 * POST /admin/brm/notifications   → patch brm_notify (partial, deep-merged)
 *
 * POST body: { enabled?: boolean, events?: { <event>: {
 *              whatsapp?: { enabled?: boolean, template?: string },
 *              email?: { enabled?: boolean, subject?: string, body?: string }
 *            } } }
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const settings = await getStoreSettings(req.scope)
  return res.json({ notifications: settings.brm_notify })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Partial<BrmNotifySettings>

  // Validate event keys so a typo can't silently write a dead config slot.
  if (body.events) {
    for (const key of Object.keys(body.events)) {
      if (!BRM_NOTIFY_EVENTS.includes(key as any)) {
        return res.status(400).json({ message: `Unknown event: ${key}` })
      }
    }
  }

  try {
    const settings = await writeStoreSettings(req.scope, {
      brm_notify: body as BrmNotifySettings,
    })
    return res.json({ notifications: settings.brm_notify })
  } catch (err: any) {
    return res.status(400).json({ message: err?.message ?? String(err) })
  }
}