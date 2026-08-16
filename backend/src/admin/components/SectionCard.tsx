import { Button, Container, Heading, Text } from "@medusajs/ui"
import type { ReactNode } from "react"
import { saffron } from "./tokens"

/**
 * A titled card with an optional "Save changes" footer. Replaces the local
 * `SectionCard` helper that used to live inside settings/page.tsx.
 */
export function SectionCard({
  title,
  description,
  children,
  onSave,
  saving,
  saveLabel = "Save changes",
}: {
  title: string
  description: string
  children: ReactNode
  onSave?: () => void | Promise<void>
  saving?: boolean
  saveLabel?: string
}) {
  return (
    <Container className="border-ui-border-base mb-6">
      <div className="mb-6">
        <Heading level="h1" className="text-xl">
          {title}
        </Heading>
        <Text className="text-sm text-ui-fg-subtle">{description}</Text>
      </div>
      <div className="space-y-4">{children}</div>
      {onSave && (
        <div className="mt-6 flex justify-end">
          <Button
            style={{ backgroundColor: saffron.DEFAULT, color: saffron.ON, border: `1px solid ${saffron.DEFAULT}` }}
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Saving…" : saveLabel}
          </Button>
        </div>
      )}
    </Container>
  )
}