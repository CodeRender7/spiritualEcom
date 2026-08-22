"use client"

import { useCallback, useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentSeries } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Input,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { PageHeader } from "../../../components"

/**
 * Issued documents browser (document-builder D8): every generated document
 * version across orders/subscriptions, with expiring share-link minting.
 */
export default function IssuedDocumentsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [entityId, setEntityId] = useState("")
  const [kind, setKind] = useState("")

  const load = useCallback(() => {
    const qs = new URLSearchParams()
    if (entityId) qs.set("entity_id", entityId)
    if (kind) qs.set("kind", kind)
    fetch(`/admin/documents?${qs.toString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRows(d.documents ?? []))
      .catch(() => toast.error("Failed to load documents"))
  }, [entityId, kind])

  useEffect(load, [load])

  const shareLink = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`/admin/documents/${docId}/share-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ttl_minutes: 60 * 24 * 7 }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message)
      await navigator.clipboard?.writeText(d.url).catch(() => {})
      toast.success(`Share link copied (expires ${new Date(d.expires_at).toLocaleString()})`)
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to mint share link")
    }
  }, [])

  return (
    <div>
      <PageHeader
        title="Issued documents"
        badge="Version history"
        description="Every generated document is an immutable version — all retrievable forever."
        actions={
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        }
      />
      <Container className="mb-6">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              placeholder="Filter by order / subscription id…"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Input
              placeholder="Kind (invoice…)"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            />
          </div>
          <Button variant="primary" onClick={load}>
            Search
          </Button>
        </div>
      </Container>

      <Container className="p-0">
        {rows.length === 0 && (
          <div className="p-6">
            <Text>No documents match. Documents appear here as pipelines generate them.</Text>
          </div>
        )}
        {rows.map((doc) => (
          <Table key={doc.id}>
            <Table.Body>
              <Table.Row>
                <Table.Cell>
                  <Badge size="2xsmall" color="orange">
                    {doc.kind}
                  </Badge>{" "}
                  <Text size="small">{doc.entity_type} #{String(doc.entity_id).slice(-8)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall">v{doc.current_version}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="xsmall">{new Date(doc.updated_at).toLocaleString()}</Text>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => shareLink(doc.id)}
                  >
                    Copy share link
                  </Button>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        ))}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Issued",
})
