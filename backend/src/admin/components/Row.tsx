import { Label, Text } from "@medusajs/ui"
import type { ReactNode } from "react"

/**
 * A single settings row: label on the left, control(s) on the right.
 * Replaces the local `Row` helper that used to live inside settings/page.tsx.
 */
export function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-2">
      <div className="flex-1">
        <Label className="font-medium">{label}</Label>
        {hint && <Text className="text-xs text-ui-fg-subtle">{hint}</Text>}
      </div>
      <div className="flex w-1/2 flex-col gap-1">{children}</div>
    </div>
  )
}