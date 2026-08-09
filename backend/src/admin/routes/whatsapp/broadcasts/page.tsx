"use client"

import { useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  StatusBadge,
  Table,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"

type BroadcastStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "sending"
  | "sent"
  | "partial_failed"
  | "cancelled"
  | "failed"

type RecipientStatus = "queued" | "sent" | "delivered" | "read" | "failed"

interface Broadcast {
  id: string
  name: string
  session_id: string | null
  message: string
  image_url: string | null
  audience_type: string
  status: BroadcastStatus
  scheduled_at: string | null
  started_at: string | null
  finished_at: string | null
  error: string | null
  created_at: string
  recipient_summary?: Record<string, number>
  recipient_total?: number
}

interface Recipient {
  id: string
  broadcast_id: string
  phone: string
  status: RecipientStatus
  wa_message_id: string | null
  error: string | null
}

const STATUS_BADGE_COLORS: Record<BroadcastStatus, "green" | "red" | "blue" | "orange" | "grey" | "purple"> = {
  draft: "grey",
  scheduled: "blue",
  queued: "grey",
  sending: "orange",
  sent: "green",
  partial_failed: "orange",
  cancelled: "purple",
  failed: "red",
}

const STATUS_LABELS: Record<BroadcastStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  queued: "Queued",
  sending: "Sending…",
  sent: "Sent",
  partial_failed: "Partial",
  cancelled: "Cancelled",
  failed: "Failed",
}

const AUDIENCE_LABELS: Record<string, string> = {
  manual_numbers: "Manual numbers",
  all_customers: "All customers",
  customers_with_orders: "Customers with orders",
}

const RECIPIENT_BADGE_COLORS: Record<RecipientStatus, "green" | "red" | "blue" | "orange" | "grey" | "purple"> = {
  queued: "grey",
  sent: "blue",
  delivered: "orange",
  read: "green",
  failed: "red",
}

export default function WhatsAppBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [newImageUrl, setNewImageUrl] = useState("")
  const [newAudienceType, setNewAudienceType] = useState("manual_numbers")
  const [newRecipients, setNewRecipients] = useState("")
  const [newScheduledAt, setNewScheduledAt] = useState("")
  const [creating, setCreating] = useState(false)

  const [detail, setDetail] = useState<Broadcast | null>(null)
  const [detailRecipients, setDetailRecipients] = useState<Recipient[]>([])
  const [detailFilter, setDetailFilter] = useState<string>("")
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchBroadcasts()
    const interval = setInterval(fetchBroadcasts, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (detail) fetchDetail(detail.id)
  }, [detailFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchBroadcasts() {
    try {
      const res = await fetch("/admin/whatsapp/broadcasts?take=100", { credentials: "same-origin" })
      const data = await res.json()
      setBroadcasts(data.broadcasts || [])
    } catch (err) {
      console.error("Failed to fetch broadcasts:", err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchDetail(id: string) {
    setDetailLoading(true)
    try {
      const res = await fetch(`/admin/whatsapp/broadcasts/${id}`, { credentials: "same-origin" })
      const data = await res.json()
      setDetail(data.broadcast || null)
    } catch (err) {
      console.error("Failed to fetch broadcast detail:", err)
    } finally {
      setDetailLoading(false)
    }
  }

  async function fetchRecipients(broadcastId: string, status?: string) {
    try {
      const q = status ? `&status=${encodeURIComponent(status)}` : ""
      const res = await fetch(
        `/admin/whatsapp/broadcasts/${broadcastId}/recipients?take=200${q}`,
        { credentials: "same-origin" }
      )
      const data = await res.json()
      setDetailRecipients(data.recipients || [])
    } catch (err) {
      console.error("Failed to fetch recipients:", err)
    }
  }

  async function createBroadcast() {
    if (!newName.trim() || !newMessage.trim()) {
      toast.error("Name and message are required")
      return
    }
    if (newAudienceType === "manual_numbers" && !newRecipients.trim()) {
      toast.error("Enter at least one phone number")
      return
    }

    const recipientPhones = newRecipients
      .split(/[\n,;]/)
      .map((p) => p.trim())
      .filter(Boolean)

    setCreating(true)
    try {
      const res = await fetch("/admin/whatsapp/broadcasts", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          message: newMessage,
          imageUrl: newImageUrl.trim() || undefined,
          audienceType: newAudienceType,
          recipientPhones,
          scheduledAt: newScheduledAt ? new Date(newScheduledAt).toISOString() : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || "Failed to create broadcast")
      }
      toast.success("Broadcast created")
      setNewName("")
      setNewMessage("")
      setNewImageUrl("")
      setNewRecipients("")
      setNewScheduledAt("")
      setShowCreateModal(false)
      fetchBroadcasts()
    } catch (err) {
      toast.error((err as Error).message || "Failed to create broadcast")
    } finally {
      setCreating(false)
    }
  }

  async function cancelBroadcast(b: Broadcast) {
    if (!confirm(`Cancel broadcast "${b.name}"?`)) return
    try {
      const res = await fetch(`/admin/whatsapp/broadcasts/${b.id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Broadcast cancelled")
      fetchBroadcasts()
    } catch {
      toast.error("Failed to cancel broadcast")
    }
  }

  async function resendBroadcast(b: Broadcast) {
    try {
      const res = await fetch(`/admin/whatsapp/broadcasts/${b.id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend" }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Broadcast queued for resend")
      fetchBroadcasts()
    } catch {
      toast.error("Failed to resend broadcast")
    }
  }

  function openDetail(b: Broadcast) {
    setDetail(b)
    setDetailFilter("")
    setDetailRecipients([])
    fetchDetail(b.id)
    fetchRecipients(b.id)
  }

  function openCreate() {
    setNewName("")
    setNewMessage("")
    setNewImageUrl("")
    setNewAudienceType("manual_numbers")
    setNewRecipients("")
    setNewScheduledAt("")
    setShowCreateModal(true)
  }

  if (loading) return <Container><Text>Loading broadcasts...</Text></Container>

  return (
    <Container>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <Heading level="h1">WhatsApp Broadcasts</Heading>
        <Button onClick={openCreate} style={{ backgroundColor: "#F97316" }}>
          + New Broadcast
        </Button>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Audience</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Sent</Table.HeaderCell>
            <Table.HeaderCell>Failed</Table.HeaderCell>
            <Table.HeaderCell>Scheduled</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {broadcasts.length === 0 && (
            <Table.Row>
              <td colSpan={7} style={{ padding: "16px", textAlign: "center" }}>
                <Text style={{ color: "#6b7280" }}>
                  No broadcasts yet. Create one to reach your customers.
                </Text>
              </td>
            </Table.Row>
          )}
          {broadcasts.map((b) => (
            <Table.Row key={b.id}>
              <Table.Cell>
                <button onClick={() => openDetail(b)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#2563eb", fontFamily: "inherit" }}>
                  {b.name}
                </button>
              </Table.Cell>
              <Table.Cell>
                <Badge>{AUDIENCE_LABELS[b.audience_type] || b.audience_type}</Badge>
              </Table.Cell>
              <Table.Cell>
                <StatusBadge color={STATUS_BADGE_COLORS[b.status]}>{STATUS_LABELS[b.status]}</StatusBadge>
              </Table.Cell>
              <Table.Cell>{b.recipient_summary?.sent || 0}</Table.Cell>
              <Table.Cell>{b.recipient_summary?.failed || 0}</Table.Cell>
              <Table.Cell>{b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : "—"}</Table.Cell>
              <Table.Cell>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(b.status === "partial_failed" || b.status === "failed") && (
                    <Button size="small" onClick={() => resendBroadcast(b)}>
                      Resend
                    </Button>
                  )}
                  {(b.status === "scheduled" || b.status === "queued" || b.status === "draft") && (
                    <Button size="small" variant="danger" onClick={() => cancelBroadcast(b)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {/* Create Broadcast Modal */}
      {showCreateModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <Heading level="h2">New Broadcast</Heading>
            <Input
              placeholder="Campaign name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ marginTop: "16px" }}
            />
            <Textarea
              placeholder="Message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={4}
              style={{ marginTop: "12px" }}
            />
            <Input
              placeholder="Image URL (optional)"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              style={{ marginTop: "12px" }}
            />
            <div style={{ marginTop: "12px" }}>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Audience</Text>
              <Select value={newAudienceType} onValueChange={(v) => setNewAudienceType(v)}>
                <Select.Trigger style={{ width: "100%" }}>
                  <Select.Value placeholder="Select audience" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="manual_numbers">Manual numbers</Select.Item>
                  <Select.Item value="all_customers">All customers</Select.Item>
                  <Select.Item value="customers_with_orders">Customers with orders</Select.Item>
                </Select.Content>
              </Select>
            </div>
            {newAudienceType === "manual_numbers" && (
              <Textarea
                placeholder="Phone numbers, one per line (e.g. +919876543210)"
                value={newRecipients}
                onChange={(e) => setNewRecipients(e.target.value)}
                rows={3}
                style={{ marginTop: "12px" }}
              />
            )}
            <Input
              type="datetime-local"
              placeholder="Schedule (optional — empty sends now)"
              value={newScheduledAt}
              onChange={(e) => setNewScheduledAt(e.target.value)}
              style={{ marginTop: "12px" }}
            />
            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <Button onClick={createBroadcast} disabled={creating} style={{ backgroundColor: "#F97316" }}>
                {creating ? "Creating…" : "Create"}
              </Button>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detail && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalStyle, maxWidth: "700px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Heading level="h2">{detail.name}</Heading>
              <Button variant="secondary" size="small" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>

            {detailLoading ? (
              <Text style={{ marginTop: "16px", color: "#6b7280" }}>Loading…</Text>
            ) : (
              <>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}>
                  <StatusBadge color={STATUS_BADGE_COLORS[detail.status]}>{STATUS_LABELS[detail.status]}</StatusBadge>
                  <Badge>{AUDIENCE_LABELS[detail.audience_type] || detail.audience_type}</Badge>
                </div>
                <Text style={{ marginTop: "12px", whiteSpace: "pre-wrap" }}>{detail.message}</Text>
                {detail.image_url && (
                  <img src={detail.image_url} alt="Broadcast media" style={{ maxWidth: 200, borderRadius: 8, marginTop: 12 }} />
                )}
                <div style={{ display: "flex", gap: "24px", marginTop: "16px" }}>
                  <Text style={{ fontSize: 13 }}>
                    Sent: <strong>{detail.recipient_summary?.sent || 0}</strong>
                  </Text>
                  <Text style={{ fontSize: 13 }}>
                    Failed: <strong>{detail.recipient_summary?.failed || 0}</strong>
                  </Text>
                  <Text style={{ fontSize: 13 }}>
                    Delivered: <strong>{detail.recipient_summary?.delivered || 0}</strong>
                  </Text>
                  <Text style={{ fontSize: 13 }}>
                    Read: <strong>{detail.recipient_summary?.read || 0}</strong>
                  </Text>
                  <Text style={{ fontSize: 13 }}>
                    Queued: <strong>{detail.recipient_summary?.queued || 0}</strong>
                  </Text>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <Input
                    placeholder="Filter by status (queued/sent/delivered/read/failed)"
                    value={detailFilter}
                    onChange={(e) => setDetailFilter(e.target.value)}
                  />
                  <Button size="small" variant="secondary" onClick={() => fetchRecipients(detail.id, detailFilter.trim() || undefined)}>
                    Apply
                  </Button>
                </div>

                <Table style={{ marginTop: "16px" }}>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Phone</Table.HeaderCell>
                      <Table.HeaderCell>Status</Table.HeaderCell>
                      <Table.HeaderCell>WA Message ID</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {detailRecipients.length === 0 && (
                      <Table.Row>
                        <td colSpan={3} style={{ padding: "16px", textAlign: "center" }}>
                          <Text style={{ color: "#6b7280" }}>No recipients in this view.</Text>
                        </td>
                      </Table.Row>
                    )}
                    {detailRecipients.map((r) => (
                      <Table.Row key={r.id}>
                        <Table.Cell>{r.phone}</Table.Cell>
                        <Table.Cell>
                          <StatusBadge color={RECIPIENT_BADGE_COLORS[r.status]}>{r.status}</StatusBadge>
                        </Table.Cell>
                        <Table.Cell>{r.wa_message_id || "—"}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </>
            )}
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Broadcasts",
  icon: "Megaphone",
})

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
}

const modalStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "12px",
  padding: "32px",
  maxWidth: "500px",
  width: "90%",
  maxHeight: "90vh",
  overflow: "auto",
}