"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Input, Text, Textarea, toast } from "@medusajs/ui"

interface Conversation {
  session_id: string
  phone: string
  customer_id: string | null
  contact_name: string | null
  last_message: string | null
  last_direction: "inbound" | "outbound" | null
  last_message_at: string | null
  unread_count: number
  status: "open" | "resolved"
  assigned_to: string | null
}

interface ChatMessage {
  id: string
  session_id: string
  direction: "inbound" | "outbound"
  phone: string
  body: string | null
  media_type: string | null
  media_url: string | null
  wa_message_id: string | null
  status: string
  timestamp: string
}

export default function WhatsAppChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [thread, setThread] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const searchRef = useRef("")

  useEffect(() => {
    searchRef.current = search
  }, [search])

  const fetchConversations = useCallback(async (overrideSearch?: string) => {
    const q = overrideSearch !== undefined ? overrideSearch : searchRef.current
    try {
      const res = await fetch(
        `/admin/whatsapp/chat/conversations?take=100${q ? `&search=${encodeURIComponent(q)}` : ""}`,
        { credentials: "same-origin" }
      )
      const data = await res.json()
      const list = data.conversations || []
      setConversations(list)
      // Keep the selected row pointing at the freshest copy so the thread
      // refreshes whenever the conversation poll updates it.
      setSelected((prev) => {
        if (!prev) return prev
        return (
          list.find((c: Conversation) => c.session_id === prev.session_id && c.phone === prev.phone) ||
          prev
        )
      })
    } catch (err) {
      console.error("Failed to fetch conversations:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(() => fetchConversations(), 5000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  // Auto-select the newest conversation the first time one lands.
  useEffect(() => {
    if (!selected && conversations.length > 0 && !loading) {
      setSelected(conversations[0])
    }
  }, [conversations, selected, loading])

  const fetchThread = useCallback(async (conv: Conversation) => {
    try {
      const res = await fetch(
        `/admin/whatsapp/chat/conversations/${encodeURIComponent(conv.phone)}?sessionId=${encodeURIComponent(
          conv.session_id
        )}`,
        { credentials: "same-origin" }
      )
      const data = await res.json()
      setThread(data.messages || [])
    } catch (err) {
      console.error("Failed to fetch thread:", err)
    }
  }, [])

  // Refresh the thread whenever the selected conversation refreshes.
  useEffect(() => {
    if (selected) fetchThread(selected)
  }, [selected, fetchThread])

  async function sendReply() {
    if (!selected || !draft.trim()) return
    try {
      const res = await fetch(
        `/admin/whatsapp/chat/conversations/${encodeURIComponent(selected.phone)}/reply`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: draft, sessionId: selected.session_id }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (res.status === 400 && data.error === "no_connected_session") {
        toast.error("No connected WhatsApp session. Open the Sessions page to connect one.")
        return
      }
      if (!res.ok) throw new Error("Failed")
      toast.success("Message sent")
      setDraft("")
      fetchThread(selected)
      fetchConversations()
    } catch {
      toast.error("Failed to send message")
    }
  }

  async function toggleResolve() {
    if (!selected) return
    const action = selected.status === "resolved" ? "unresolve" : "resolve"
    try {
      const res = await fetch(
        `/admin/whatsapp/chat/conversations/${encodeURIComponent(selected.phone)}`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, sessionId: selected.session_id }),
        }
      )
      if (!res.ok) throw new Error("Failed")
      toast.success(selected.status === "resolved" ? "Conversation reopened" : "Conversation resolved")
      fetchConversations()
    } catch {
      toast.error("Failed to update conversation")
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      searchRef.current = search
      fetchConversations(search)
    }
  }

  if (loading) {
    return (
      <Container>
        <Text>Loading WhatsApp inbox…</Text>
      </Container>
    )
  }

  return (
    <Container style={{ padding: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
        <Heading level="h1">WhatsApp Chat</Heading>
        <Badge style={{ backgroundColor: "#F97316", color: "#fff" }}>Inbox</Badge>
      </div>

      <div style={twoPaneStyle}>
        {/* LEFT: conversation list */}
        <div style={listPaneStyle}>
          <div style={{ padding: "12px" }}>
            <Input
              placeholder="Search phone or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          {conversations.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <Text style={{ color: "#6b7280" }}>
                No conversations yet. Incoming WhatsApp messages will appear here.
              </Text>
            </div>
          )}

          {conversations.map((c) => {
            const active = selected?.session_id === c.session_id && selected?.phone === c.phone
            const highlighted = c.unread_count > 0 || active
            return (
              <button
                key={`${c.session_id}:${c.phone}`}
                onClick={() => setSelected(c)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  borderBottom: "1px solid #e2e8f0",
                  background: active ? "#fff7ed" : c.unread_count > 0 ? "#fef3c7" : "transparent",
                  padding: "12px 16px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: highlighted ? 600 : 400, fontSize: 14 }}>{displayName(c)}</span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{timeAgo(c.last_message_at)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      marginRight: 8,
                    }}
                  >
                    {c.last_message || "—"}
                  </Text>
                  {c.unread_count > 0 && (
                    <Badge style={{ backgroundColor: "#F97316", color: "#fff", minWidth: 20, textAlign: "center" }}>
                      {c.unread_count}
                    </Badge>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* RIGHT: thread */}
        <div style={threadPaneStyle}>
          {selected ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <Text style={{ fontWeight: 600 }}>{displayName(selected)}</Text>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>{selected.phone}</Text>
                </div>
                <Button size="small" variant={selected.status === "resolved" ? "secondary" : "danger"} onClick={toggleResolve}>
                  {selected.status === "resolved" ? "Reopen" : "Resolve"}
                </Button>
              </div>

              <div style={messagesStyle}>
                {thread.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 16px" }}>
                    <Text style={{ color: "#6b7280" }}>No messages yet in this thread.</Text>
                  </div>
                )}
                {thread.map((m) => {
                  const inbound = m.direction === "inbound"
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: inbound ? "flex-start" : "flex-end" }}>
                      <div
                        style={{
                          maxWidth: "70%",
                          marginBottom: 8,
                          padding: "8px 12px",
                          borderRadius: 12,
                          backgroundColor: inbound ? "#f1f5f9" : "#dbeafe",
                        }}
                      >
                        <Text style={{ fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {m.body || (m.media_type ? `[${m.media_type}]` : "")}
                        </Text>
                        {m.media_url && (
                          <img
                            src={m.media_url}
                            alt="media"
                            style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginTop: 8 }}
                          />
                        )}
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, textAlign: "right" }}>
                          {formatTimestamp(m.timestamp)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: "1px solid #e2e8f0" }}>
                <Textarea
                  rows={2}
                  placeholder="Type a reply… (Enter to send)"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      sendReply()
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <Button onClick={sendReply} style={{ backgroundColor: "#F97316", alignSelf: "flex-end" }}>
                  Send
                </Button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <Text style={{ color: "#6b7280" }}>Select a conversation to view the thread.</Text>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}

function displayName(c: Conversation): string {
  return c.contact_name || c.phone
}

function timeAgo(ts: string | null): string {
  if (!ts) return ""
  const time = new Date(ts).getTime()
  if (Number.isNaN(time)) return ""
  const diffMin = Math.floor((Date.now() - time) / 60000)
  if (diffMin < 1) return "now"
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  return `${Math.floor(diffHr / 24)}d`
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export const config = defineRouteConfig({
  label: "WhatsApp Chat",
  icon: "ChatBubbleBottomCenterText",
})

const twoPaneStyle: React.CSSProperties = {
  display: "flex",
  height: "calc(100vh - 110px)",
}

const listPaneStyle: React.CSSProperties = {
  width: 300,
  minWidth: 300,
  borderRight: "1px solid #e2e8f0",
  overflowY: "auto",
  background: "#ffffff",
}

const threadPaneStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
}

const messagesStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px",
  background: "#f8fafc",
}