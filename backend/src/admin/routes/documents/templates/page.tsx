"use client"

import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Badge, Button, Container, Table, Text, toast } from "@medusajs/ui"
import { PageHeader } from "../../../components"

/**
 * Document template gallery (document-builder D5 v1) — list, create, seed the
 * default gallery. Editing opens the code-mode editor; sectional dnd-kit and
 * absolute-canvas modes are charted as follow-up fog.
 */
export const config = defineRouteConfig({
  label: "Documents",
  icon: DocumentText,
})

export default function DocumentTemplatesPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<any[]>([])
  const [seeding, setSeeding] = useState(false)

  const load = useCallback(() => {
    fetch("/admin/document-templates?take=200", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRows(d.templates ?? []))
      .catch(() => toast.error("Failed to load templates"))
  }, [])

  useEffect(load, [load])

  const seed = useCallback(async () => {
    setSeeding(true)
    try {
      const res = await fetch("/admin/document-templates/seed", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message)
      toast.success(`Seeded: ${d.created} created, ${d.updated} updated`)
      load()
    } catch (e: any) {
      toast.error(e?.message ?? "Seed failed")
    } finally {
      setSeeding(false)
    }
  }, [load])

  const statusColor = (s: string) =>
    s === "active" ? "green" : s === "archived" ? "grey" : "orange"

  return (
    <div>
      <PageHeader
        title="Documents"
        badge="PDF Templates"
        description="Design the invoices, waybills, receipts and e-bills your pipelines send."
        actions={
          <>
            <Button variant="secondary" isLoading={seeding} onClick={seed}>
              Seed defaults
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate("/documents/templates/new")}
            >
              + New template
            </Button>
          </>
        }
      />
      <Container className="divide-y p-0">
        {rows.length === 0 && (
          <div className="p-6">
            <Text>No document templates yet — click “Seed defaults” to install all seven kinds.</Text>
          </div>
        )}
        {(rows ?? []).map((t) => (
          <Table key={t.id}>
            <Table.Body>
              <Table.Row
                className="cursor-pointer"
                onClick={() => navigate(`/documents/templates/${t.id}`)}
              >
                <Table.Cell>
                  <Text size="small" weight="plus">
                    {t.name}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color="orange">
                    {t.doc_kind}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={statusColor(t.status) as any}>
                    {t.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="xsmall">
                    {t.page_size} · {t.page_orientation} · {t.page_margin}mm
                  </Text>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        ))}
      </Container>
    </div>
  )
}
