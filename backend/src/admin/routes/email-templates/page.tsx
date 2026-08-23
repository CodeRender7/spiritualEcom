"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Input, Select, Table, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { PageHeader, useConfirm } from "../../components"

/**
 * Email template gallery (email-builder map, E2) — route /email-templates.
 *
 * Lists every gallery template (BRM lifecycle, order pipeline, transactional)
 * with category/event/status filters, create + seed + soft-delete, and deep
 * links into the Unlayer visual editor at /email-templates/[id]/edit.
 */

interface GalleryTemplate {
  id: string
  name: string
  description?: string | null
  category: string
  event_key?: string | null
  subject: string
  status: string
  placeholders?: { key: string; value: string }[]
  created_at: string
}

const CATEGORIES = ["brm", "order", "transactional", "custom"]
const STATUSES = ["draft", "active", "archived"]

const CATEGORY_LABELS: Record<string, string> = {
  brm: "BRM",
  order: "Order",
  transactional: "Transactional",
  custom: "Custom",
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<GalleryTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")
  const [q, setQ] = useState("")
  const [creating, setCreating] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const confirm = useConfirm()

  async function fetchTemplates() {
    try {
      const params = new URLSearchParams()
      if (category !== "all") params.set("category", category)
      if (status !== "all") params.set("status", status)
      if (q.trim()) params.set("q", q.trim())
      const res = await fetch(`/admin/email-templates?${params.toString()}`, {
        credentials: "same-origin",
      })
      const data = (await res.json()) as { templates: GalleryTemplate[] }
      setTemplates(data.templates ?? [])
    } catch (err) {
      console.error("Failed to fetch templates:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, status, q])

  async function createTemplate() {
    setCreating(true)
    try {
      const res = await fetch("/admin/email-templates", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled template",
          category: "custom",
          status: "draft",
          subject: "",
        }),
      })
      const data = (await res.json()) as { template?: GalleryTemplate; message?: string }
      if (!res.ok || !data.template) {
        throw new Error(data.message || "Failed to create template")
      }
      toast.success("Template created — opening editor")
      window.location.assign(`/app/email-templates/${data.template.id}/edit`)
    } catch (err) {
      toast.error((err as Error).message || "Failed to create template")
    } finally {
      setCreating(false)
    }
  }

  async function seedGallery() {
    setSeeding(true)
    try {
      const res = await fetch("/admin/email-templates/seed", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = (await res.json()) as { created?: number; updated?: number; skipped?: string[] }
      if (!res.ok) throw new Error("Seed failed")
      toast.success(
        `Gallery seeded: ${data.created ?? 0} created, ${data.updated ?? 0} updated, ${data.skipped?.length ?? 0} skipped`
      )
      fetchTemplates()
    } catch (err) {
      toast.error((err as Error).message || "Failed to seed gallery")
    } finally {
      setSeeding(false)
    }
  }

  async function deleteTemplate(t: GalleryTemplate) {
    const ok = await confirm({
      title: "Delete template",
      description: `Delete "${t.name}"? Templates bound to a notification event will fall back to inline bodies.`,
      confirmText: "Delete",
      variant: "danger",
    })
    if (!ok) return
    try {
      await fetch(`/admin/email-templates/${t.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      })
      toast.success("Template deleted")
      fetchTemplates()
    } catch {
      toast.error("Failed to delete template")
    }
  }

  return (
    <div>
      <PageHeader
        title="Email Templates"
        description="Library of reusable email templates for process events — edit them in the visual builder."
        badge="Email"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={seedGallery}
              disabled={seeding}
            >
              {seeding ? "Seeding…" : "Seed gallery"}
            </Button>
            <Button
              onClick={createTemplate}
              disabled={creating}
              style={{ backgroundColor: "var(--bg-saffron, #F97316)", color: "#fff" }}
            >
              + New template
            </Button>
          </>
        }
      />

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search templates…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={category} onValueChange={setCategory}>
          <Select.Trigger className="w-[160px]">
            <Select.Value placeholder="Category" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All categories</Select.Item>
            {CATEGORIES.map((c) => (
              <Select.Item key={c} value={c}>
                {CATEGORY_LABELS[c] ?? c}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <Select.Trigger className="w-[140px]">
            <Select.Value placeholder="Status" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All statuses</Select.Item>
            {STATUSES.map((s) => (
              <Select.Item key={s} value={s}>
                {s}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Category</Table.HeaderCell>
            <Table.HeaderCell>Event</Table.HeaderCell>
            <Table.HeaderCell>Placeholders</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {!loading && templates.length === 0 && (
            <Table.Row>
              <td colSpan={6} className="p-4 text-center">
                <Text className="text-ui-fg-subtle">
                  No templates yet. Create one or seed the gallery.
                </Text>
              </td>
            </Table.Row>
          )}
          {templates.map((t) => (
            <Table.Row key={t.id}>
              <Table.Cell>
                <button
                  className="text-left font-medium hover:underline"
                  onClick={() => window.location.assign(`/app/email-templates/${t.id}/edit`)}
                >
                  {t.name}
                </button>
              </Table.Cell>
              <Table.Cell>
                <Badge color={t.category === "brm" ? "orange" : t.category === "order" ? "green" : t.category === "transactional" ? "blue" : "grey"}>
                  {CATEGORY_LABELS[t.category] ?? t.category}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text className="text-ui-fg-subtle">{t.event_key ?? "—"}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text className="text-ui-fg-subtle">
                  {(t.placeholders ?? []).map((p) => `{{${p.key}}}`).join(" ") || "—"}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Badge color={t.status === "active" ? "green" : t.status === "archived" ? "grey" : "blue"}>
                  {t.status}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <div className="flex gap-2">
                  <Button
                    size="small"
                    onClick={() => window.location.assign(`/app/email-templates/${t.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button size="small" variant="danger" onClick={() => deleteTemplate(t)}>
                    Delete
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Email Templates",
})