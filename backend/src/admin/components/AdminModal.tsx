import { FocusModal, Button } from "@medusajs/ui"
import type { ReactNode } from "react"

/**
 * Shared modal built on @medusajs/ui FocusModal (Radix Dialog under the hood).
 * Replaces the hand-rolled `modalOverlayStyle` / `modalStyle` overlays that
 * used to be copy-pasted into whatsapp/page.tsx and broadcasts/page.tsx.
 */
export function AdminModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  /** Optional custom footer; defaults to a Close button. */
  footer?: ReactNode
  /** Wider layout (e.g. broadcast detail with recipient table). */
  wide?: boolean
}) {
  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content className={wide ? "max-w-4xl" : "max-w-xl"}>
        <FocusModal.Header>
          <FocusModal.Title>{title}</FocusModal.Title>
          {description && <FocusModal.Description>{description}</FocusModal.Description>}
        </FocusModal.Header>
        <FocusModal.Body className="flex-1 overflow-y-auto p-6">{children}</FocusModal.Body>
        <FocusModal.Footer>
          {footer ?? (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}