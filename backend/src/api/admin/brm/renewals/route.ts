import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { processRenewals } from "../../../../lib/brm"

/**
 * Admin BRM API — manual renewal sweep
 * POST /admin/brm/renewals
 *
 * Runs the same renewal + grace/dunning sweep the scheduler job runs, on
 * demand. Returns the summary counts.
 */

export const POST = async (_req: MedusaRequest, res: MedusaResponse) => {
  const summary = await processRenewals(_req.scope)
  return res.json({ summary })
}