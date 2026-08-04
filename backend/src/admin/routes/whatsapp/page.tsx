"use client"

import { useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Badge,
  Text,
  Table,
  Input,
  Textarea,
  toast,
} from "@medusajs/ui"

type SessionStatus = "disconnected" | "qr_ready" | "connecting" | "connected" | "error"

interface WhatsAppSession {
  id: string
  name: string
  phone_number?: string
  session_key: string
  status: SessionStatus
  qr_code?: string
  created_at: string
  updated_at: string
}

const STATUS_COLORS: Record<SessionStatus, string> = {
  disconnected: "#6b7280",
  qr_ready: "#F97316",
  connecting: "#EAB308",
  connected: "#22c55e",
  error: "#ef4444",
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  disconnected: "Disconnected",
  qr_ready: "QR Ready",
  connecting: "Connecting...",
  connected: "Connected",
  error: "Error",
}

export default function WhatsAppManagementPage() {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState<WhatsAppSession | null>(null)
  const [newSessionName, setNewSessionName] = useState("")
  const [sendTo, setSendTo] = useState("")
  const [sendMessage, setSendMessage] = useState("")

  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])

  async function fetchSessions() {
    try {
      const res = await fetch("/admin/whatsapp/sessions", { credentials: "same-origin" })
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error("Failed to fetch sessions:", err)
    } finally {
      setLoading(false)
    }
  }

  async function createSession() {
    if (!newSessionName.trim()) {
      toast.error("Session name is required")
      return
    }
    try {
      const res = await fetch("/admin/whatsapp/sessions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSessionName }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Session created")
      setNewSessionName("")
      setShowCreateModal(false)
      fetchSessions()
    } catch {
      toast.error("Failed to create session")
    }
  }

  async function startSession(session: WhatsAppSession) {
    try {
      const res = await fetch(`/admin/whatsapp/sessions/${session.id}/start`, {
        method: "POST",
        credentials: "same-origin",
      })
      const data = await res.json()
      if (data.qr) {
        setSelectedSession({ ...session, qr_code: data.qr })
        setShowQRModal(true)
      }
      toast.success("Session starting...")
      fetchSessions()
    } catch {
      toast.error("Failed to start session")
    }
  }

  async function stopSession(session: WhatsAppSession) {
    try {
      await fetch(`/admin/whatsapp/sessions/${session.id}/stop`, {
        method: "POST",
        credentials: "same-origin",
      })
      toast.success("Session stopped")
      fetchSessions()
    } catch {
      toast.error("Failed to stop session")
    }
  }

  async function deleteSession(session: WhatsAppSession) {
    if (!confirm(`Delete session "${session.name}"?`)) return
    try {
      await fetch(`/admin/whatsapp/sessions/${session.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      })
      toast.success("Session deleted")
      fetchSessions()
    } catch {
      toast.error("Failed to delete session")
    }
  }

  async function sendWhatsApp() {
    if (!selectedSession || !sendTo.trim() || !sendMessage.trim()) {
      toast.error("Phone and message are required")
      return
    }
    try {
      const res = await fetch(`/admin/whatsapp/sessions/${selectedSession.id}/send`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: sendTo, message: sendMessage }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Message sent")
      setSendTo("")
      setSendMessage("")
      setShowSendModal(false)
    } catch {
      toast.error("Failed to send message")
    }
  }

  if (loading) return <Container><Text>Loading WhatsApp sessions...</Text></Container>

  return (
    <Container>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <Heading level="h1">WhatsApp Management</Heading>
        <Button onClick={() => setShowCreateModal(true)} style={{ backgroundColor: "#F97316" }}>
          + New Session
        </Button>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Phone</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sessions.length === 0 && (
            <Table.Row>
              <td colSpan={4} style={{ padding: "16px", textAlign: "center" }}>
                <Text style={{ color: "#6b7280" }}>
                  No sessions yet. Create one to get started.
                </Text>
              </td>
            </Table.Row>
          )}
          {sessions.map((s) => (
            <Table.Row key={s.id}>
              <Table.Cell>{s.name}</Table.Cell>
              <Table.Cell>{s.phone_number || "—"}</Table.Cell>
              <Table.Cell>
                <Badge style={{ backgroundColor: STATUS_COLORS[s.status] }}>
                  {STATUS_LABELS[s.status]}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <div style={{ display: "flex", gap: "8px" }}>
                  {s.status === "disconnected" && (
                    <Button size="small" onClick={() => startSession(s)}>
                      Start
                    </Button>
                  )}
                  {s.status === "qr_ready" && (
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedSession(s)
                        setShowQRModal(true)
                      }}
                    >
                      Show QR
                    </Button>
                  )}
                  {s.status === "connected" && (
                    <>
                      <Button size="small" onClick={() => stopSession(s)}>
                        Stop
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedSession(s)
                          setShowSendModal(true)
                        }}
                        style={{ backgroundColor: "#22c55e" }}
                      >
                        Send
                      </Button>
                    </>
                  )}
                  <Button size="small" variant="danger" onClick={() => deleteSession(s)}>
                    Delete
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <Heading level="h2">Create WhatsApp Session</Heading>
            <Input
              placeholder="Session name (e.g., Main Account)"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              style={{ marginTop: "16px" }}
            />
            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <Button onClick={createSession} style={{ backgroundColor: "#F97316" }}>
                Create
              </Button>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedSession?.qr_code && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <Heading level="h2">Scan QR Code</Heading>
            <Text style={{ marginTop: "12px", color: "#6b7280" }}>
              Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → Scan this QR code
            </Text>
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <img src={selectedSession.qr_code} alt="QR Code" style={{ maxWidth: "300px" }} />
            </div>
            <Button
              onClick={() => setShowQRModal(false)}
              style={{ marginTop: "20px", width: "100%" }}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showSendModal && selectedSession && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <Heading level="h2">Send WhatsApp Message</Heading>
            <Input
              placeholder="Phone (e.g., +919876543210)"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              style={{ marginTop: "16px" }}
            />
            <Textarea
              placeholder="Message"
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              rows={4}
              style={{ marginTop: "12px" }}
            />
            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <Button onClick={sendWhatsApp} style={{ backgroundColor: "#22c55e" }}>
                Send
              </Button>
              <Button variant="secondary" onClick={() => setShowSendModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "WhatsApp",
  icon: "ChatBubbleLeftRight",
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
