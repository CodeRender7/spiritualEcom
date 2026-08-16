"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Input, Switch, Text, Textarea, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { PageHeader, Row, SectionCard } from "../../../components"

/**
 * BRM notification flow config (A5) — route /brm/notifications.
 *
 * Maps each BRM lifecycle event (activated, renewal_success, renewal_failure,
 * grace_start, past_due, paused, cancelled, expiry_warning) to channels
 * (whatsapp / email) with editable templates. Persisted in the
 * divinekart_settings blob via /admin/brm/notifications.
 */

type BrmNotifyEventKey =
  | "activated"
  | "renewal_success"
  | "renewal_failure"
  | "grace_start"
  | "past_due"
  | "paused"
  | "cancelled"
  | "expiry_warning"

type BrmChannelConfig = {
  whatsapp: { enabled: boolean; template: string }
  email: { enabled: boolean; subject: string; body: string }
}

type BrmNotifySettings = {
  enabled: boolean
  events: Record<BrmNotifyEventKey, BrmChannelConfig>
}

const BRM_NOTIFY_EVENTS: BrmNotifyEventKey[] = [
  "activated",
  "renewal_success",
  "renewal_failure",
  "grace_start",
  "past_due",
  "paused",
  "cancelled",
  "expiry_warning",
]

const BRM_NOTIFY_EVENT_LABELS: Record<BrmNotifyEventKey, string> = {
  activated: "Subscription activated",
  renewal_success: "Renewal successful",
  renewal_failure: "Renewal failed",
  grace_start: "Grace period started",
  past_due: "Payment past due",
  paused: "Subscription paused",
  cancelled: "Subscription cancelled",
  expiry_warning: "Expiry warning",
}

const PLACEHOLDER_HINT =
  "Placeholders: {name} {offer} {subscription} {amount} {period_end} {next_retry} {status} {attempts} {phone}"

function emptyChannel(): BrmChannelConfig {
  return {
    whatsapp: { enabled: false, template: "" },
    email: { enabled: false, subject: "", body: "" },
  }
}

function emptySettings(): BrmNotifySettings {
  const events = {} as BrmNotifySettings["events"]
  for (const key of BRM_NOTIFY_EVENTS) events[key] = emptyChannel()
  return { enabled: false, events }
}

async function apiGet(): Promise<BrmNotifySettings | null> {
  try {
    const res = await fetch("/admin/brm/notifications", { credentials: "same-origin" })
    if (!res.ok) return null
    const data = (await res.json()) as { notifications: BrmNotifySettings }
    return data.notifications
  } catch {
    return null
  }
}

async function apiPost(patch: Partial<BrmNotifySettings>): Promise<boolean> {
  try {
    const res = await fetch("/admin/brm/notifications", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { notifications: BrmNotifySettings }
    return Boolean(data.notifications)
  } catch {
    return false
  }
}

export default function BrmNotificationsPage() {
  const [cfg, setCfg] = useState<BrmNotifySettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet().then((s) => setCfg(s ?? emptySettings()))
  }, [])

  const save = async () => {
    if (!cfg) return
    setSaving(true)
    const ok = await apiPost(cfg)
    setSaving(false)
    if (ok) toast.success("BRM notification flow saved")
    else toast.error("Failed to save BRM notification flow")
  }

  const updateEvent = (key: BrmNotifyEventKey, patch: Partial<BrmChannelConfig>) =>
    setCfg((prev) =>
      prev ? { ...prev, events: { ...prev.events, [key]: { ...prev.events[key], ...patch } } } : prev
    )

  const updateWhatsapp = (key: BrmNotifyEventKey, patch: Partial<BrmChannelConfig["whatsapp"]>) =>
    setCfg((prev) =>
      prev
        ? {
            ...prev,
            events: {
              ...prev.events,
              [key]: { ...prev.events[key], whatsapp: { ...prev.events[key].whatsapp, ...patch } },
            },
          }
        : prev
    )

  const updateEmail = (key: BrmNotifyEventKey, patch: Partial<BrmChannelConfig["email"]>) =>
    setCfg((prev) =>
      prev
        ? {
            ...prev,
            events: {
              ...prev.events,
              [key]: { ...prev.events[key], email: { ...prev.events[key].email, ...patch } },
            },
          }
        : prev
    )

  if (!cfg) return <Text className="text-sm">Loading BRM notification flow…</Text>

  return (
    <div>
      <PageHeader
        title="BRM Notifications"
        description="Route BRM lifecycle events to WhatsApp / email with editable templates."
        badge="BRM"
      />

      <SectionCard
        title="Notification flow"
        description="Master switch for the whole flow. Each event below is independently configurable; a channel only fires when the event and the channel are both enabled."
        onSave={save}
        saving={saving}
      >
        <Row label="Enable BRM notifications">
          <Switch
            checked={cfg.enabled}
            onCheckedChange={(v) => setCfg((prev) => (prev ? { ...prev, enabled: v } : prev))}
          />
        </Row>
      </SectionCard>

      {BRM_NOTIFY_EVENTS.map((key) => {
        const ev = cfg.events[key] ?? emptyChannel()
        return (
          <SectionCard
            key={key}
            title={BRM_NOTIFY_EVENT_LABELS[key]}
            description={PLACEHOLDER_HINT}
            onSave={save}
            saving={saving}
          >
            <Row label={`Notify on "${BRM_NOTIFY_EVENT_LABELS[key]}"`}>
              <Switch
                checked={ev.whatsapp.enabled || ev.email.enabled}
                onCheckedChange={(v) => updateEvent(key, v ? {} : { whatsapp: { ...ev.whatsapp, enabled: false }, email: { ...ev.email, enabled: false } })}
              />
            </Row>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
              <Row label="WhatsApp">
                <Switch
                  checked={ev.whatsapp.enabled}
                  onCheckedChange={(v) => updateWhatsapp(key, { enabled: v })}
                />
              </Row>
              {ev.whatsapp.enabled && (
                <Row label="WhatsApp template">
                  <Textarea
                    value={ev.whatsapp.template}
                    onChange={(e) => updateWhatsapp(key, { template: e.target.value })}
                    placeholder="Namaste {name}! Your DivineKart subscription ({offer}) is active…"
                    rows={3}
                  />
                </Row>
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
              <Row label="Email">
                <Switch
                  checked={ev.email.enabled}
                  onCheckedChange={(v) => updateEmail(key, { enabled: v })}
                />
              </Row>
              {ev.email.enabled && (
                <>
                  <Row label="Email subject">
                    <Input
                      value={ev.email.subject}
                      onChange={(e) => updateEmail(key, { subject: e.target.value })}
                      placeholder="Your DivineKart subscription ({offer}) is active"
                    />
                  </Row>
                  <Row label="Email body">
                    <Textarea
                      value={ev.email.body}
                      onChange={(e) => updateEmail(key, { body: e.target.value })}
                      placeholder="Namaste {name}, your subscription is active…"
                      rows={4}
                    />
                  </Row>
                </>
              )}
            </div>
          </SectionCard>
        )
      })}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "BRM Notifications",
})