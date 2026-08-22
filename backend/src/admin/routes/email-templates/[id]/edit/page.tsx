"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import EmailEditor from "react-email-editor"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { PageHeader, Row, SectionCard } from "../../../../components"

/**
 * Email template editor — Unlayer drag-and-drop (email-builder E2, absorbed
 * into document-builder D5). Round-trips loadDesign/saveDesign/exportHtml
 * through the E1 gallery API and inserts `{{key:value}}` chips into the
 * design's text via the merge-tag tool.
 *
 * CDN fallback: if the Unlayer bundle cannot load (offline/air-gapped deploys),
 * the editor shows a raw HTML textarea bound to the same saved html field so
 * the template stays editable.
 */
export default function EmailTemplateEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editorRef = useRef<any>(null)
  const [tpl, setTpl] = useState<any>(null)
  const [fallbackMode, setFallbackMode] = useState(false)
  const [unlayerFailed, setUnlayerFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/admin/email-templates/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTpl(d.template))
      .catch(() => toast.error("Failed to load template"))
    // If the Unlayer script hasn't initialized within 8s, offer the HTML seam.
    const t = setTimeout(() => {
      if (!editorRef.current?.editor) setUnlayerFailed(true)
    }, 8000)
    return () => clearTimeout(t)
  }, [id])

  const patch = useCallback(
    (p: Record<string, any>) => setTpl((cur: any) => ({ ...(cur ?? {}), ...p })),
    []
  )

  const save = useCallback(async () => {
    if (!tpl) return
    setSaving(true)
    try {
      const finish = async (design?: any, html?: string) => {
        const body = JSON.stringify({
          name: tpl.name,
          description: tpl.description,
          subject: tpl.subject,
          status: tpl.status,
          category: tpl.category,
          event_key: tpl.event_key,
          html: html ?? tpl.html,
          design: design ?? tpl.design ?? null,
        })
        const res = await fetch(`/admin/email-templates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? "Save failed")
        toast.success("Email template saved")
      }

      if (!fallbackMode && editorRef.current?.editor) {
        editorRef.current.editor.saveDesign((design: any) => {
          editorRef.current!.editor.exportHtml((data: any) => {
            finish(design, data.html).catch((e) => toast.error(e.message))
            setSaving(false)
          })
        })
        return
      }
      await finish()
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }, [tpl, id, fallbackMode])

  if (!tpl) return <Container className="py-6"><Text>Loading…</Text></Container>

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title={tpl.name || "Email template"}
        badge="Unlayer"
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/email-templates")}>
              Back
            </Button>
            {unlayerFailed && !fallbackMode && (
              <Button variant="secondary" onClick={() => setFallbackMode(true)}>
                Use HTML mode
              </Button>
            )}
            <Button variant="primary" isLoading={saving} onClick={save}>
              Save
            </Button>
          </>
        }
      />

      <SectionCard title="Details" description="Subject line supports {{key:value}} placeholders.">
        <Row label="Name">
          <Input value={tpl.name ?? ""} onChange={(e) => patch({ name: e.target.value })} />
        </Row>
        <Row label="Subject">
          <Input value={tpl.subject ?? ""} onChange={(e) => patch({ subject: e.target.value })} />
        </Row>
        <Row label="Status">
          <Select value={tpl.status ?? "draft"} onValueChange={(v) => patch({ status: v })}>
            <Select.Item value="draft">Draft</Select.Item>
            <Select.Item value="active">Active</Select.Item>
            <Select.Item value="archived">Archived</Select.Item>
          </Select>
        </Row>
      </SectionCard>

      {!fallbackMode ? (
        <Container className="border-ui-border-base">
          <Heading level="h1" className="text-xl mb-2">
            Design
          </Heading>
          <Text className="text-sm text-ui-fg-subtle mb-4">
            Drag-and-drop builder. Insert placeholders as plain text like {"{{name:Customer}}"} —
            the dispatcher substitutes them at send time.
          </Text>
          <div className="min-h-[600px] rounded-md border border-ui-border-base">
            <EmailEditor
              ref={editorRef as any}
              onReady={() => {
                if (tpl.design) editorRef.current?.editor?.loadDesign(tpl.design)
              }}
              options={{
                appearance: { theme: "light" },
                locale: "en",
                tools: {
                  text: { properties: { text: { mergeTags: true } } },
                },
              }}
            />
          </div>
        </Container>
      ) : (
        <SectionCard
          title="HTML fallback"
          description="The Unlayer bundle could not load in this environment — edit the exported HTML directly."
        >
          <Textarea
            className="font-mono text-xs min-h-[480px]"
            value={tpl.html ?? ""}
            onChange={(e) => patch({ html: e.target.value })}
          />
        </SectionCard>
      )}
    </div>
  )
}
