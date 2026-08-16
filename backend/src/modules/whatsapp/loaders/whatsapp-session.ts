import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sessionRegistry } from "../../../lib/whatsapp-session"

/**
 * WhatsApp module loader — runs when the whatsapp module initializes on
 * application startup (before the module's main service is instantiated).
 *
 * Rehydrates the in-memory `sessionRegistry` from the persisted
 * `whatsapp_sessions` table so admin sessions survive backend restarts.
 *
 * Container notes (Medusa v2 module loaders):
 * - The loader receives the module's own `localContainer`, which proxies a
 *   small set of shared resources (LOGGER, PG_CONNECTION, MANAGER, ...) but
 *   NOT the main container's QUERY — so we read via the raw knex
 *   `PG_CONNECTION` pool (same pattern as `loadsBroadcastSummaries`).
 * - Loaders also run during `medusa db migrate`, so the table may be missing
 *   on first boot; never throw — log and continue.
 */
export default async function whatsappSessionLoader({
  container,
  logger,
}: {
  container: any
  logger?: any
}): Promise<void> {
  try {
    const pool = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    // PG_CONNECTION is a knex instance — knex exposes `.raw()`, not `.query()`.
    const { rows } = await pool.raw(
      `SELECT id, name, phone_number, session_key, status, qr_code, created_at, updated_at
       FROM whatsapp_sessions
       WHERE deleted_at IS NULL`
    )
    for (const row of rows) {
      sessionRegistry.set(row)
    }
    logger?.info?.(`[whatsapp] Rehydrated ${rows.length} session(s) from DB`)
  } catch (err) {
    logger?.warn?.(
      `[whatsapp] Session rehydration skipped (table may not exist yet during migrations): ${
        (err as Error).message
      }`
    )
  }
}