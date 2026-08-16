import { usePrompt } from "@medusajs/ui"

/**
 * Promise-based confirm dialog built on @medusajs/ui `usePrompt`.
 * Replaces the native `confirm()` calls in the custom admin pages (which are
 * blocked/ugly in the admin SPA and do not match the design system).
 *
 * Usage:
 *   const confirm = useConfirm()
 *   const ok = await confirm({ title: "Delete", description: "Are you sure?" })
 */
export function useConfirm() {
  const prompt = usePrompt()
  return (
    opts: {
      title: string
      description: string
      confirmText?: string
      cancelText?: string
      variant?: "danger" | "confirmation"
    }
  ): Promise<boolean> => prompt(opts)
}