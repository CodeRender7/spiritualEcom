"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { PageHeader, Row, SectionCard } from "../../../../components"
import DocumentSectionBuilder, {
  DEFAULT_SECTIONS,
  composeSectionsHtml,
  type SectionType,
} from "../../../../components/DocumentSectionBuilder"
import DocumentCanvas, {
  composeCanvasHtml,
  type CanvasBlock,
} from "../../../../components/DocumentCanvas"

/**
 * Document template editor (document-builder D5 v2) — all three modes:
 *  - Code: raw HTML/CSS with `{{key:value}}` chips + sandboxed live preview
 *  - Sections: dnd-kit drag-reorder blocks composed into the page body
 *  - Canvas: absolute-position blocks on an A4 sheet (waybills/labels)
 *
 * The design JSON round-trips through template.design ({mode, ...}); on save
 * the composed HTML is written to template.html — the engine's source of truth.
 */

type EditorMode = "code" | "sections" | "canvas"

type Catalog = {
  kinds: string[]
  kind_labels: Record<string, string>
  key_catalog: Record<string, { key: string; value: string; description: string }[]>
  event_keys: Record<string, string[]>
}

export default function DocumentTemplateEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tpl, setTpl] = useState<any>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewDoc, setPreviewDoc] = useState("")
  const [mode, setMode] = useState<EditorMode>("code")
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    fetch("/admin/document-templates/catalog", { credentials: "include" })
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => {})
    if (id && id !== "new") {
      fetch(`/admin/document-templates/${id}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          const t = d.template
          setTpl(t)
          const m = (t?.design as any)?.mode
          if (m === "sections" || m === "canvas") setMode(m)
        })
        .catch(() => toast.error("Failed to load template"))
    } else {
      setTpl({
        name: "",
        description: "",
        doc_kind: "invoice",
        status: "draft",
        page_size: "A4",
        page_orientation: "portrait",
        page_margin: "12",
        watermark: "",
        subject: "",
        html: "",
        design: null,
      })
    }
  }, [id])

  const patch = useCallback(
    (p: Record<string, any>) => setTpl((cur: any) => ({ ...(cur ?? {}), ...p })),
    []
  )

  const insertAtCursor = useCallback(
    (snippet: string) => {
      const el = textareaRef.current
      if (!el || !tpl) return
      const start = el.selectionStart ?? tpl.html?.length ?? 0
      const end = el.selectionEnd ?? start
      const next =
        (tpl.html ?? "").slice(0, start) + snippet + (tpl.html ?? "").slice(end)
      patch({ html: next })
      requestAnimationFrame(() => {
        el.focus()
        el.selectionStart = el.selectionEnd = start + snippet.length
      })
    },
    [tpl, patch]
  )

  const save = useCallback(async () => {
    if (!tpl) return
    setSaving(true)
    try {
      // Visual modes compose their structure into the body; design JSON is
      // persisted alongside so the template stays re-editable in-place.
      const payload: Record<string, any> = { ...tpl }
      if (mode === "sections") {
        payload.html = composeSectionsHtml(tpl.design?.sections ?? [])
        payload.design = { ...(tpl.design ?? {}), mode: "sections" }
      } else if (mode === "canvas") {
        payload.html = composeCanvasHtml(tpl.design?.blocks ?? [])
        payload.design = { ...(tpl.design ?? {}), mode: "canvas" }
      } else {
        payload.design = tpl.design?.mode ? tpl.design : null
      }
      const body = JSON.stringify(payload)
      const url =
        id && id !== "new" ? `/admin/document-templates/${id}` : "/admin/document-templates"
      const res = await fetch(url, {
        method: id && id !== "new" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? "Save failed")
      toast.success("Template saved")
      if ((!id || id === "new") && data.template?.id) {
        navigate(`/documents/templates/${data.template.id}`, { replace: true })
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }, [tpl, id, navigate, mode])

  const livePreview = useMemo(() => {
    // Sandbox preview: substitute {{key:value}} with their example values so
    // the admin sees representative output (same fallback rule as the engine).
    return (tpl?.html ?? "").replace(
      /\{\{qrcode:[^}]*\}\}/g,
      '<div style="width:90px;height:90px;border:1px dashed #bbb;display:flex;align-items:center;justify-content:center;font-size:9px;color:#999;">QR preview</div>'
    )
  }, [tpl?.html])

  if (!tpl) return <Container className="py-6"><Text>Loading…</Text></Container>

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title={tpl.name || "New document template"}
        description={`${catalog?.kind_labels[tpl.doc_kind] ?? tpl.doc_kind} · ${tpl.page_size} ${tpl.page_orientation}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/documents/templates")}>
              Back
            </Button>
            <Button variant="primary" onClick={setPreviewDoc.bind(null, livePreview)}>
              Preview
            </Button>
            <Button variant="primary" isLoading={saving} onClick={save}>
              Save
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <SectionCard title="Template" description="Identity and classification for the gallery.">
          <Row label="Name">
            <Input value={tpl.name ?? ""} onChange={(e) => patch({ name: e.target.value })} />
          </Row>
          <Row label="Description">
            <Input
              value={tpl.description ?? ""}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Row>
          <Row label="Kind">
            <Select value={tpl.doc_kind} onValueChange={(v) => patch({ doc_kind: v })}>
              {catalog?.kinds.map((k) => (
                <Select.Item key={k} value={k}>
                  {catalog.kind_labels[k] ?? k}
                </Select.Item>
              ))}
            </Select>
          </Row>
          <Row label="Status">
            <Select value={tpl.status} onValueChange={(v) => patch({ status: v })}>
              <Select.Item value="draft">Draft</Select.Item>
              <Select.Item value="active">Active</Select.Item>
              <Select.Item value="archived">Archived</Select.Item>
            </Select>
          </Row>
        </SectionCard>
        <SectionCard title="Page geometry" description="Paper size, orientation, margins and optional watermark — honored by the PDF engine.">
          <Row label="Size">
            <Select value={tpl.page_size ?? "A4"} onValueChange={(v) => patch({ page_size: v })}>
              <Select.Item value="A4">A4</Select.Item>
              <Select.Item value="A5">A5</Select.Item>
              <Select.Item value="Letter">Letter</Select.Item>
            </Select>
          </Row>
          <Row label="Orientation">
            <Select
              value={tpl.page_orientation ?? "portrait"}
              onValueChange={(v) => patch({ page_orientation: v })}
            >
              <Select.Item value="portrait">Portrait</Select.Item>
              <Select.Item value="landscape">Landscape</Select.Item>
            </Select>
          </Row>
          <Row label="Margin (mm)">
            <Input
              type="number"
              value={String(tpl.page_margin ?? "12")}
              onChange={(e) => patch({ page_margin: e.target.value })}
            />
          </Row>
          <Row label="Watermark">
            <Input
              placeholder='e.g. DRAFT — empty disables'
              value={tpl.watermark ?? ""}
              onChange={(e) => patch({ watermark: e.target.value })}
            />
          </Row>
        </SectionCard>
      </div>

      <SectionCard
        title="Design"
        description="Code writes HTML directly; Sections drag-composes blocks; Canvas free-positions on the sheet. Saving composes your structure into the body."
      >
        <div className="mb-3 flex gap-2">
          {(
            [
              ["code", "Code"],
              ["sections", "Sections (drag)"],
              ["canvas", "Canvas (A4)"],
            ] as [EditorMode, string][]
          ).map(([m, label]) => (
            <Button
              key={m}
              variant={mode === m ? "primary" : "secondary"}
              size="small"
              onClick={() => {
                if (m !== "code" && !(tpl.design as any)?.[m === "sections" ? "sections" : "blocks"]) {
                  // Seed a sensible starting structure the first time.
                  patch({
                    design: {
                      ...(tpl.design ?? {}),
                      mode: m,
                      ...(m === "sections"
                        ? { sections: DEFAULT_SECTIONS }
                        : {
                            blocks: [
                              {
                                id: `blk-${Date.now()}`,
                                type: "text",
                                x: 8,
                                y: 6,
                                w: 50,
                                text: "{{company_name:DivineKart}}",
                                size: 16,
                              },
                            ] as CanvasBlock[],
                          }),
                    },
                  })
                }
                setMode(m)
              }}
            >
              {label}
            </Button>
          ))}
        </div>

        {mode === "code" && (
          <>
            <div className="mb-3 flex flex-wrap gap-1">
              {Object.entries(catalog?.key_catalog ?? {}).flatMap(([group, entries]) =>
                entries.map((entry) => (
                  <button
                    key={`${group}.${entry.key}`}
                    title={entry.description}
                    onClick={() => insertAtCursor(`{{${entry.key}:${entry.value}}}`)}
                    className="rounded-full border border-ui-border-base px-2 py-0.5 text-[11px] hover:bg-ui-bg-interactive hover:text-white"
                    type="button"
                  >
                    +{entry.key}
                  </button>
                ))
              )}
            </div>
            <Textarea
              ref={textareaRef as any}
              className="font-mono text-xs min-h-[420px]"
              value={tpl.html ?? ""}
              onChange={(e) => patch({ html: e.target.value })}
              placeholder="Paste or write print-ready HTML… use the chips to insert {{key:value}} placeholders."
            />
          </>
        )}

        {mode === "sections" && (
          <DocumentSectionBuilder
            sections={((tpl.design as any)?.sections ?? []) as { id: string; type: SectionType }[]}
            onChange={(next) =>
              patch({ design: { ...(tpl.design ?? {}), mode: "sections", sections: next } })
            }
          />
        )}

        {mode === "canvas" && (
          <DocumentCanvas
            blocks={((tpl.design as any)?.blocks ?? []) as CanvasBlock[]}
            onChange={(next) =>
              patch({ design: { ...(tpl.design ?? {}), mode: "canvas", blocks: next } })
            }
          />
        )}
      </SectionCard>

      {previewDoc && (
        <SectionCard title="Live preview (sandboxed)" description="Rendered with example values, exactly like the engine's fallback rule.">
          <iframe
            title="preview"
            srcDoc={previewDoc}
            className="h-[640px] w-full rounded-md border border-ui-border-base bg-white"
          />
        </SectionCard>
      )}
    </div>
  )
}
