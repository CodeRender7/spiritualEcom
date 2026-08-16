import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Input, Select, Switch, Text, Textarea, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { PageHeader, Row, SectionCard, saffron } from "../../components"

type PaymentProviderKey =
  | "cod"
  | "razorpay"
  | "payu"
  | "stripe"
  | "easybuzz"
  | "justpay"
  | "paypal"
  | "hyperswitch"

type PaymentProviderConfig = {
  enabled: boolean
  priority: number
  key_id: string
  key_secret: string
  test_mode: boolean
}

type PaymentsSettings = Record<PaymentProviderKey, PaymentProviderConfig>

const PAYMENT_PROVIDERS: PaymentProviderKey[] = [
  "cod",
  "razorpay",
  "payu",
  "stripe",
  "easybuzz",
  "justpay",
  "paypal",
  "hyperswitch",
]

const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderKey, string> = {
  cod: "Cash on Delivery",
  razorpay: "Razorpay (UPI / Cards / NetBanking)",
  payu: "PayU",
  stripe: "Stripe",
  easybuzz: "EasyBuzz",
  justpay: "JustPay",
  paypal: "PayPal",
  hyperswitch: "Hyperswitch (self-hosted)",
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

async function apiGet(): Promise<Settings | null> {
  try {
    const res = await fetch("/admin/settings", { credentials: "same-origin" })
    if (!res.ok) return null
    const data = (await res.json()) as { settings: Settings }
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
    const data = (await res.json()) as { settings: Settings }
    return Boolean(data.settings)
  } catch {
    return false
  }
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

  const update = (key: PaymentProviderKey, patch: Partial<PaymentProviderConfig>) =>
    setP((prev) => (prev ? { ...prev, [key]: { ...prev[key], ...patch } } : prev))

  if (!p) return <Text className="text-sm">Loading payment settings…</Text>

  return (
    <SectionCard
      title="Payment providers"
      description="Enable or disable payment options shown at checkout, set their display priority (lower = first), and store per-provider credentials. Only providers with an installed module appear at checkout until T7 wires the rest."
      onSave={save}
      saving={saving}
    >
      {PAYMENT_PROVIDERS.map((key) => {
        const cfg = p[key]
        return (
          <div key={key} style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
            <Row label={`${PAYMENT_PROVIDER_LABELS[key]} (${key})`}>
              <Switch checked={cfg.enabled} onCheckedChange={(v) => update(key, { enabled: v })} />
            </Row>
            <Row label="Priority (lower = first)">
              <Input
                type="number"
                value={cfg.priority}
                onChange={(e) => update(key, { priority: Number(e.target.value) || 0 })}
                min={0}
              />
            </Row>
            {key === "cod" ? null : (
              <>
                <Row label="Test mode">
                  <Switch checked={cfg.test_mode} onCheckedChange={(v) => update(key, { test_mode: v })} />
                </Row>
                <Row label="Key ID">
                  <Input
                    value={cfg.key_id}
                    onChange={(e) => update(key, { key_id: e.target.value })}
                    placeholder={key === "razorpay" ? "rzp_test_…" : "…"}
                  />
                </Row>
                <Row label="Key Secret">
                  <Input
                    type="password"
                    value={cfg.key_secret}
                    onChange={(e) => update(key, { key_secret: e.target.value })}
                    placeholder="••••••••"
                  />
                </Row>
              </>
            )}
          </div>
        )
      })}
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
      <PageHeader title="🕉️ Settings" description="Configure DivineKart store features" badge="Admin" />

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: tab === t.key ? saffron.DEFAULT : "transparent",
              color: tab === t.key ? saffron.ON : "inherit",
              border: "1px solid",
              borderColor: tab === t.key ? saffron.DEFAULT : "rgba(255,255,255,0.15)",
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