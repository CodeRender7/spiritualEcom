import { Text } from "@medusajs/ui"

/**
 * Small stat tile (e.g. broadcast delivery counts). Replaces inline
 * `<Text>` stat rows in the broadcast detail view.
 */
export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
      <Text className="text-xl font-semibold">{value}</Text>
      <Text className="text-xs text-ui-fg-subtle">{label}</Text>
    </div>
  )
}