import { StatusBadge } from "@medusajs/ui"
import { SESSION_STATUS, SESSION_STATUS_FALLBACK } from "./tokens"

/**
 * StatusBadge for a WhatsApp session status, colored from the shared token map.
 * Replaces the hand-rolled hex `STATUS_COLORS` map in whatsapp/page.tsx.
 */
export function SessionStatusBadge({ status }: { status: string }) {
  const meta = SESSION_STATUS[status] ?? SESSION_STATUS_FALLBACK
  return <StatusBadge color={meta.tone}>{meta.label}</StatusBadge>
}