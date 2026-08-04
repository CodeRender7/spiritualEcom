import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Input, Label, Select, Switch, Text, Textarea, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type PaymentsSettings = {
  cod_enabled: boolean
  razorpay_enabled: boolean
  razorpay_key_id: string
  razorpay_key_secret: string
  razorpay_test_mode: boolean
}

type ReviewsSettings = {
  enabled: boolean
  require_moderation: boolean
  allow_anonymous: boolean
}

type UpsellSettings = {
  enabled: boolean
  strategy: "related" | "bestsellers" | "cross_sell"
  max_items: number
  min_order_value: number
}

type WhatsappSettings = {
  enabled: boolean
  gateway: "openwa" | "waha"
  gateway_url: string
  api_key: string
  default_country_code: string
  order_confirmation_template: string
  order_shipped_template: string
}

type InvoicingSettings = {
  enabled: boolean
  company_name: string
  company_address: string
  gstin: string
  contact_email: string
  footer_note: string
}

type Settings = {
  payments: PaymentsSettings
  reviews: ReviewsSettings
  upsell: UpsellSettings
  whatsapp: WhatsappSettings
  invoicing: InvoicingSettings
}

const SAFRON = {
  badgeActive: { backgroundColor: "#F97316", color: "#fff" },
  save: { backgroundColor: "#F97316", color: "#fff", border: "1px solid #F97316" },
}

async function apiGet(): Promise<Settings | null> {
  try {
    const res = await fetch("/admin/settings", { credentials: "same-origin" })
    if (!res.ok) return null
    const data = await res.json()
    return data.settings
  } catch {
    return null
  }
}

async function apiPost(patch: Partial<Settings>): Promise<boolean> {
  try {
    const res = await fetch("/admin/settings", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return Boolean(data.settings)
  } catch {
    return false
  }
}

function SectionCard({
  title,
  description,
  children,
  onSave,
  saving,
}: {
  title: string
  description: string
  children: React.ReactNode
  onSave: () => Promise<void>
  saving: boolean
}) {
  return (
    <Container className="border-ui-border-base mb-6">
      <div className="mb-6">
        <Heading level="h1" className="text-xl">
          {title}
        </Heading>
        <Text className="text-sm">{description}</Text>
      </div>
      <div className="space-y-4">{children}</div>
      <div className="mt-6 flex justify-end">
        <Button style={SAFRON.save} disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Container>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-2">
      <div className="flex-1">
        <Label className="font-medium">{label}</Label>
      </div>
      <div className="flex w-1/2 flex-col gap-1">{children}</div>
    </div>
  )
}

function PaymentsTab() {
  const [p, setP] = useState<PaymentsSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet().then((s) => s && setP(s.payments))
  }, [])

  const save = async () => {
    if (!p) return
    setSaving(true)
    const ok = await apiPost({ payments: p })
    setSaving(false)
    if (ok) toast.success("Payment settings saved")
    else toast.error("Failed to save payment settings")
  }

  if (!p) return <Text className="text-sm">Loading payment settings…</Text>

  return (
    <SectionCard
      title="Payment providers"
      description="Enable or disable payment options shown at checkout. Keys are stored locally on your Medusa backend."
      onSave={save}
      saving={saving}
    >
      <Row label="Cash on Delivery (COD)">
        <Switch checked={p.cod_enabled} onCheckedChange={(v) => setP({ ...p, cod_enabled: v })} />
      </Row>
      <Row label="Razorpay (UPI / Cards / NetBanking)">
        <Switch checked={p.razorpay_enabled} onCheckedChange={(v) => setP({ ...p, razorpay_enabled: v })} />
      </Row>
      <Row label="Razorpay test mode">
        <Switch checked={p.razorpay_test_mode} onCheckedChange={(v) => setP({ ...p, razorpay_test_mode: v })} />
      </Row>
      <Row label="Razorpay Key ID">
        <Input value={p.razorpay_key_id} onChange={(e) => setP({ ...p, razorpay_key_id: e.target.value })} placeholder="rzp_test_…" />
      </Row>
      <Row label="Razorpay Key Secret">
        <Input type="password" value={p.razorpay_key_secret} onChange={(e) => setP({ ...p, razorpay_key_secret: e.target.value })} placeholder="••••••••" />
      </Row>
    </SectionCard>
  )
}

function ReviewsTab() {
  const [r, setR] = useState<ReviewsSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet().then((s) => s && setR(s.reviews))
  }, [])

  const save = async () => {
    if (!r) return
    setSaving(true)
    const ok = await apiPost({ reviews: r })
    setSaving(false)
    if (ok) toast.success("Review settings saved")
    else toast.error("Failed to save review settings")
  }

  if (!r) return <Text className="text-sm">Loading review settings…</Text>

  return (
    <SectionCard
      title="Product reviews"
      description="Control how customers leave and view product reviews."
      onSave={save}
      saving={saving}
    >
      <Row label="Enable product reviews">
        <Switch checked={r.enabled} onCheckedChange={(v) => setR({ ...r, enabled: v })} />
      </Row>
      <Row label="Require moderation before publishing">
        <Switch checked={r.require_moderation} onCheckedChange={(v) => setR({ ...r, require_moderation: v })} />
      </Row>
      <Row label="Allow anonymous reviews">
        <Switch checked={r.allow_anonymous} onCheckedChange={(v) => setR({ ...r, allow_anonymous: v })} />
      </Row>
    </SectionCard>
  )
}

function UpsellTab() {
  const [u, setU] = useState<UpsellSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet().then((s) => s && setU(s.upsell))
  }, [])

  const save = async () => {
    if (!u) return
    setSaving(true)
    const ok = await apiPost({ upsell: u })
    setSaving(false)
    if (ok) toast.success("Recommendation settings saved")
    else toast.error("Failed to save recommendation settings")
  }

  if (!u) return <Text className="text-sm">Loading recommendation settings…</Text>

  return (
    <SectionCard
      title="Upsell & recommendations"
      description="Configure how related and bestseller products are recommended across the storefront."
      onSave={save}
      saving={saving}
    >
      <Row label="Enable recommendations">
        <Switch checked={u.enabled} onCheckedChange={(v) => setU({ ...u, enabled: v })} />
      </Row>
      <Row label="Recommendation strategy">
        <Select value={u.strategy} onValueChange={(v) => setU({ ...u, strategy: v as UpsellSettings["strategy"] })}>
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="related">Related products (same collection)</Select.Item>
            <Select.Item value="bestsellers">Bestsellers</Select.Item>
            <Select.Item value="cross_sell">Cross-sell</Select.Item>
          </Select.Content>
        </Select>
      </Row>
      <Row label="Maximum recommendations shown">
        <Input type="number" min={0} value={u.max_items} onChange={(e) => setU({ ...u, max_items: Number(e.target.value) })} />
      </Row>
      <Row label="Minimum order value (₹) to show upsell">
        <Input type="number" min={0} value={u.min_order_value} onChange={(e) => setU({ ...u, min_order_value: Number(e.target.value) })} />
      </Row>
    </SectionCard>
  )
}

function WhatsappTab() {
  const [w, setW] = useState<WhatsappSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet().then((s) => s && setW(s.whatsapp))
  }, [])

  const save = async () => {
    if (!w) return
    setSaving(true)
    const ok = await apiPost({ whatsapp: w })
    setSaving(false)
    if (ok) toast.success("WhatsApp settings saved")
    else toast.error("Failed to save WhatsApp settings")
  }

  if (!w) return <Text className="text-sm">Loading WhatsApp settings…</Text>

  return (
    <SectionCard
      title="WhatsApp notifications"
      description="Send order updates to customers via a WhatsApp gateway (OpenWA or WAHA)."
      onSave={save}
      saving={saving}
    >
      <Row label="Enable WhatsApp notifications">
        <Switch checked={w.enabled} onCheckedChange={(v) => setW({ ...w, enabled: v })} />
      </Row>
      <Row label="Gateway">
        <Select value={w.gateway} onValueChange={(v) => setW({ ...w, gateway: v as WhatsappSettings["gateway"] })}>
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="openwa">OpenWA</Select.Item>
            <Select.Item value="waha">WAHA</Select.Item>
          </Select.Content>
        </Select>
      </Row>
      <Row label="Gateway URL">
        <Input value={w.gateway_url} onChange={(e) => setW({ ...w, gateway_url: e.target.value })} placeholder="http://openwa:3000" />
      </Row>
      <Row label="API key">
        <Input value={w.api_key} onChange={(e) => setW({ ...w, api_key: e.target.value })} placeholder="optional" />
      </Row>
      <Row label="Default country code">
        <Input value={w.default_country_code} onChange={(e) => setW({ ...w, default_country_code: e.target.value })} placeholder="+91" />
      </Row>
      <Row label="Order confirmation template">
        <Textarea value={w.order_confirmation_template} onChange={(e) => setW({ ...w, order_confirmation_template: e.target.value })} />
      </Row>
      <Row label="Order shipped template">
        <Textarea value={w.order_shipped_template} onChange={(e) => setW({ ...w, order_shipped_template: e.target.value })} />
      </Row>
      <Text className="text-xs text-ui-fg-subtle">
        Available placeholders: {"{name}"}, {"{order_id}"}, {"{total}"}
      </Text>
    </SectionCard>
  )
}

function InvoicingTab() {
  const [inv, setInv] = useState<InvoicingSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet().then((s) => s && setInv(s.invoicing))
  }, [])

  const save = async () => {
    if (!inv) return
    setSaving(true)
    const ok = await apiPost({ invoicing: inv })
    setSaving(false)
    if (ok) toast.success("Invoice settings saved")
    else toast.error("Failed to save invoice settings")
  }

  if (!inv) return <Text className="text-sm">Loading invoice settings…</Text>

  return (
    <SectionCard
      title="Invoices & waybills"
      description="Configure the business details printed on order invoices and shipping waybills."
      onSave={save}
      saving={saving}
    >
      <Row label="Enable invoices & waybills">
        <Switch checked={inv.enabled} onCheckedChange={(v) => setInv({ ...inv, enabled: v })} />
      </Row>
      <Row label="Company name">
        <Input value={inv.company_name} onChange={(e) => setInv({ ...inv, company_name: e.target.value })} />
      </Row>
      <Row label="Company address">
        <Textarea value={inv.company_address} onChange={(e) => setInv({ ...inv, company_address: e.target.value })} />
      </Row>
      <Row label="GSTIN">
        <Input value={inv.gstin} onChange={(e) => setInv({ ...inv, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" />
      </Row>
      <Row label="Contact email">
        <Input value={inv.contact_email} onChange={(e) => setInv({ ...inv, contact_email: e.target.value })} />
      </Row>
      <Row label="Footer note">
        <Input value={inv.footer_note} onChange={(e) => setInv({ ...inv, footer_note: e.target.value })} />
      </Row>
    </SectionCard>
  )
}

function SettingsPage() {
  const [tab, setTab] = useState<"payments" | "reviews" | "upsell" | "whatsapp" | "invoicing">("payments")

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "payments", label: "Payments" },
    { key: "reviews", label: "Reviews" },
    { key: "upsell", label: "Recommendations" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "invoicing", label: "Invoices & Waybills" },
  ]

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading level="h1" className="text-2xl">
            🕉️ Settings
          </Heading>
          <Text className="text-sm">Configure DivineKart store features</Text>
        </div>
        <Badge style={SAFRON.badgeActive}>Admin</Badge>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: tab === t.key ? SAFRON.badgeActive.backgroundColor : "transparent",
              color: tab === t.key ? "#fff" : "inherit",
              border: "1px solid",
              borderColor: tab === t.key ? "#F97316" : "rgba(255,255,255,0.15)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "payments" && <PaymentsTab />}
      {tab === "reviews" && <ReviewsTab />}
      {tab === "upsell" && <UpsellTab />}
      {tab === "whatsapp" && <WhatsappTab />}
      {tab === "invoicing" && <InvoicingTab />}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Settings",
})

export default SettingsPage