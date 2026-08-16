import { Badge, Heading, Text } from "@medusajs/ui"
import type { ReactNode } from "react"
import { saffron } from "./tokens"

/**
 * Consistent page header: title, optional description, optional saffron badge,
 * and an optional actions area (e.g. "+ New" button). Replaces the per-page
 * hand-styled header rows that used to live in each custom route.
 */
export function PageHeader({
  title,
  description,
  badge,
  actions,
}: {
  title: string
  description?: string
  badge?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <Heading level="h1" className="text-2xl">
          {title}
        </Heading>
        {badge && (
          <Badge style={{ backgroundColor: saffron.DEFAULT, color: saffron.ON }}>{badge}</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
      {description && (
        <Text className="text-sm text-ui-fg-subtle">{description}</Text>
      )}
    </div>
  )
}