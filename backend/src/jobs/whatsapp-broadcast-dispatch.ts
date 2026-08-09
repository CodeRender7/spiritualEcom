import { MedusaContainer } from "@medusajs/framework/types"
import { dispatchDue } from "../lib/whatsapp-broadcast"

/**
 * Scheduled dispatch job for WhatsApp broadcast campaigns.
 *
 * Runs every 30s and drains any broadcast that is `queued` or `scheduled`
 * with a due (or missing) `scheduled_at`. One per-second send per recipient
 * is enforced inside dispatchDue.
 *
 * `concurrency: "forbid"` guarantees a second execution never overlaps the
 * first — apps with default workerMode (shared) pick this up automatically.
 */
export default async function (container: MedusaContainer): Promise<number> {
  const handled = await dispatchDue(container)
  return handled
}

export const config = {
  name: "whatsapp-broadcast-dispatcher",
  schedule: {
    interval: 30000,
    concurrency: "forbid",
  },
}