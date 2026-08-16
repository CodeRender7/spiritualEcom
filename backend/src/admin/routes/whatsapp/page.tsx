"use client"

import { useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Table, Text, Textarea, toast } from "@medusajs/ui"
import {
  AdminModal,
  PageHeader,
  SessionStatusBadge,
  saffron,
  useConfirm,
} from "../../components"

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
  const confirm = useConfirm()

  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])

  async function fetchSessions() {
    try {
      const res = await fetch("/admin/whatsapp/sessions", { credentials: "same-origin" })
      const data = (await res.json()) as { sessions?: WhatsAppSession[] }
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
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) {
        // A1: surface the real conflict (409 → which name/session_key) instead
        // of a generic toast.
        throw new Error(data.message || "Failed to create session")
      }
      toast.success("Session created")
      setNewSessionName("")
      setShowCreateModal(false)
      fetchSessions()
    } catch (err) {
      toast.error((err as Error).message || "Failed to create session")
    }
  }

  async function startSession(session: WhatsAppSession) {
    try {
      const res = await fetch(`/admin/whatsapp/sessions/${session.id}/start`, {
        method: "POST",
        credentials: "same-origin",
      })
      const data = (await res.json()) as { qr?: string }
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
    const ok = await confirm({
      title: "Delete session",
      description: `Delete session "${session.name}"? This cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    })
    if (!ok) return
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

  if (loading) {
    return (
      <Container>
        <Text>Loading WhatsApp sessions...</Text>
      </Container>
    )
  }

  return (
    <Container>
      <PageHeader
        title="WhatsApp Management"
        description="Manage WhatsApp sessions used for notifications and broadcasts."
        actions={
          <Button
            onClick={() => setShowCreateModal(true)}
            style={{ backgroundColor: saffron.DEFAULT, color: saffron.ON }}
          >
            + New Session
          </Button>
        }
      />

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
              <td colSpan={4} className="p-4 text-center">
                <Text className="text-ui-fg-subtle">
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
                <SessionStatusBadge status={s.status} />
              </Table.Cell>
              <Table.Cell>
                <div className="flex gap-2">
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
                        style={{ backgroundColor: "#22c55e", color: "#fff" }}
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
      <AdminModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Create WhatsApp Session"
        footer={
          <>
            <Button
              onClick={createSession}
              style={{ backgroundColor: saffron.DEFAULT, color: saffron.ON }}
            >
              Create
            </Button>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <Input
          placeholder="Session name (e.g., Main Account)"
          value={newSessionName}
          onChange={(e) => setNewSessionName(e.target.value)}
        />
      </AdminModal>

      {/* QR Code Modal */}
      <AdminModal
        open={showQRModal && Boolean(selectedSession?.qr_code)}
        onOpenChange={setShowQRModal}
        title="Scan QR Code"
      >
        <Text className="text-ui-fg-subtle">
          Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → Scan this QR code
        </Text>
        <div className="mt-4 flex justify-center">
          {selectedSession?.qr_code && (
            <img src={selectedSession.qr_code} alt="QR Code" style={{ maxWidth: "300px" }} />
          )}
        </div>
      </AdminModal>

      {/* Send Message Modal */}
      <AdminModal
        open={showSendModal}
        onOpenChange={setShowSendModal}
        title="Send WhatsApp Message"
        footer={
          <>
            <Button
              onClick={sendWhatsApp}
              style={{ backgroundColor: "#22c55e", color: "#fff" }}
            >
              Send
            </Button>
            <Button variant="secondary" onClick={() => setShowSendModal(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            placeholder="Phone (e.g., +919876543210)"
            value={sendTo}
            onChange={(e) => setSendTo(e.target.value)}
          />
          <Textarea
            placeholder="Message"
            value={sendMessage}
            onChange={(e) => setSendMessage(e.target.value)}
            rows={4}
          />
        </div>
      </AdminModal>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "WhatsApp",
})