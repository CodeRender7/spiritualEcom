/**
 * DivineKart admin design tokens.
 *
 * Single source of truth for the saffron accent used across the custom admin
 * routes. Import these instead of hardcoding hex values in page components.
 */

export const saffron = {
  /** Primary accent — buttons, active tabs, badges. */
  DEFAULT: "#F97316",
  /** Hover / pressed state. */
  DARK: "#EA580C",
  /** Soft tint for active rows / backgrounds. */
  SOFT: "#FFF7ED",
  /** Subtle saffron border. */
  BORDER: "#FDBA74",
  /** Text on top of saffron fills. */
  ON: "#FFFFFF",
} as const

/** Allowed `StatusBadge` colors in @medusajs/ui. */
export type BadgeTone = "green" | "red" | "blue" | "orange" | "grey" | "purple"

/**
 * WhatsApp session status → StatusBadge tone + label.
 * Replaces the hand-rolled `STATUS_COLORS` hex map in the old page.
 */
export const SESSION_STATUS: Record<string, { tone: BadgeTone; label: string }> = {
  disconnected: { tone: "grey", label: "Disconnected" },
  qr_ready: { tone: "orange", label: "QR Ready" },
  connecting: { tone: "orange", label: "Connecting…" },
  connected: { tone: "green", label: "Connected" },
  error: { tone: "red", label: "Error" },
}

/** Fallback for unknown / future session statuses. */
export const SESSION_STATUS_FALLBACK: { tone: BadgeTone; label: string } = {
  tone: "grey",
  label: "Unknown",
}