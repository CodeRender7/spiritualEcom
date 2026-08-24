"use client"

import { useCallback, useRef, useState } from "react"
import { Button, Input, Text } from "@medusajs/ui"

/**
 * Absolute-positioning canvas (document-builder D5 v2).
 *
 * Free-form placement of blocks on an A4-proportioned sheet — for fixed
 * single-page documents like waybills and labels. Blocks store x/y/w/h in
 * percent so the composed HTML scales to any paper size; text content keeps
 * `{{key:value}}` placeholders verbatim for render-time substitution, and QR
 * blocks carry a `{{qrcode:$key}}` payload.
 *
 * Design JSON: { mode: "canvas", blocks: [{ id, type, x, y, w, h, text?, size? }] }
 */

export type CanvasBlockType = "text" | "qr" | "rule"

export type CanvasBlock = {
  id: string
  type: CanvasBlockType
  x: number // % of sheet width
  y: number // % of sheet height
  w: number // %
  h?: number // % (text only)
  text?: string
  size?: number // px font size for text
}

/** A4 aspect: 297/210 ≈ 1.414 — sheet height is 141.4% of its width. */
const SHEET_PADDING_BOTTOM = "141.42%"

export function composeCanvasHtml(blocks: CanvasBlock[]): string {
  const inner = blocks
    .map((b) => {
      const pos = `position:absolute;left:${b.x}%;top:${b.y}%;width:${b.w}%;${
        b.h ? `height:${b.h}%;` : ""
      }`
      if (b.type === "rule") {
        return `<div style="${pos}border-top:1px solid #111;"></div>`
      }
      if (b.type === "qr") {
        return `<div style="${pos}"><div class="qr" style="width:100%;height:100%;">${b.text ?? "{{qrcode:$receipt_number}}"}</div></div>`
      }
      return `<div style="${pos}font-size:${b.size ?? 13}px;line-height:1.35;">${b.text ?? ""}</div>`
    })
    .join("\n")

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{margin:0;font-family:'Helvetica Neue',Arial,sans-serif;}
.sheet{width:210mm;height:296mm;position:relative;background:#fff;}
.qr{border:1px dashed #bbb;display:flex;align-items:center;justify-content:center;font-size:9px;color:#999;overflow:hidden;}
@page{size:A4 portrait;margin:0;}
</style></head>
<body><div class="sheet">
${inner}
</div></body></html>`
}

type DragState = {
  id: string
  startX: number
  startY: number
  origX: number
  origY: number
} | null

export default function DocumentCanvas({
  blocks,
  onChange,
}: {
  blocks: CanvasBlock[]
  onChange: (next: CanvasBlock[]) => void
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const pctFromEvent = useCallback((clientX: number, clientY: number) => {
    const rect = sheetRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      xPct: ((clientX - rect.left) / rect.width) * 100,
      yPct: ((clientY - rect.top) / rect.height) * 100,
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent, block: CanvasBlock) => {
      e.stopPropagation()
      setSelected(block.id)
      dragRef.current = {
        id: block.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: block.x,
        origY: block.y,
      }
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    []
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const rect = sheetRef.current?.getBoundingClientRect()
      if (!rect) return
      const dxPct = ((e.clientX - d.startX) / rect.width) * 100
      const dyPct = ((e.clientY - d.startY) / rect.height) * 100
      onChange(
        blocks.map((b) =>
          b.id === d.id
            ? {
                ...b,
                x: Math.max(0, Math.min(98 - b.w, d.origX + dxPct)),
                y: Math.max(0, Math.min(99, d.origY + dyPct)),
              }
            : b
        )
      )
    },
    [blocks, onChange]
  )

  const onPointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const addBlock = useCallback(
    (type: CanvasBlockType) => {
      const nb: CanvasBlock = {
        id: `blk-${Date.now()}`,
        type,
        x: 8,
        y: 8 + blocks.length * 4,
        w: type === "rule" ? 84 : type === "qr" ? 12 : 40,
        h: type === "qr" ? 12 : undefined,
        text:
          type === "text"
            ? "{{customer_name:Customer}}"
            : type === "qr"
              ? "{{qrcode:$receipt_number}}"
              : undefined,
        size: 13,
      }
      onChange([...blocks, nb])
      setSelected(nb.id)
    },
    [blocks, onChange]
  )

  const updateSelected = useCallback(
    (patch: Partial<CanvasBlock>) => {
      onChange(blocks.map((b) => (b.id === selected ? { ...b, ...patch } : b)))
    },
    [blocks, selected, onChange]
  )

  const sel = blocks.find((b) => b.id === selected)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="small" onClick={() => addBlock("text")}>
          + Text
        </Button>
        <Button variant="secondary" size="small" onClick={() => addBlock("qr")}>
          + QR
        </Button>
        <Button variant="secondary" size="small" onClick={() => addBlock("rule")}>
          + Rule
        </Button>
        {sel && (
          <Button
            variant="danger"
            size="small"
            onClick={() => {
              onChange(blocks.filter((b) => b.id !== sel.id))
              setSelected(null)
            }}
          >
            Delete block
          </Button>
        )}
      </div>

      <div
        ref={sheetRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative mx-auto w-full max-w-[420px] rounded-md border border-ui-border-base bg-white shadow-sm"
        style={{ paddingBottom: SHEET_PADDING_BOTTOM }}
        onPointerDown={() => setSelected(null)}
      >
        {blocks.map((b) => (
          <div
            key={b.id}
            onPointerDown={(e) => onPointerDown(e as unknown as React.PointerEvent, b)}
            className={`absolute cursor-move select-none ${
              selected === b.id ? "outline outline-2 outline-ui-bg-interactive" : ""
            }`}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.w}%`,
              height: b.h ? `${b.h}%` : "auto",
              fontSize: b.size ? `${b.size / 2.2}px` : undefined, // scaled preview
              lineHeight: 1.35,
            }}
          >
            {b.type === "rule" ? (
              <div style={{ borderTop: "1px solid #111", width: "100%" }} />
            ) : b.type === "qr" ? (
              <div className="flex h-full w-full items-center justify-center border border-dashed border-ui-border-strong text-[7px] text-ui-fg-subtle">
                QR
              </div>
            ) : (
              b.text
            )}
          </div>
        ))}
      </div>

      {sel && (
        <div className="grid grid-cols-4 gap-2">
          {( ["x", "y", "w"] as const ).map((k) => (
            <label key={k} className="text-xs uppercase text-ui-fg-subtle">
              {k}%
              <Input
                type="number"
                value={String(Math.round(sel[k] ?? 0))}
                onChange={(e) =>
                  updateSelected({ [k]: Number(e.target.value) } as Partial<CanvasBlock>)
                }
              />
            </label>
          ))}
          {sel.type === "text" && (
            <label className="col-span-1 text-xs uppercase text-ui-fg-subtle">
              px
              <Input
                type="number"
                value={String(sel.size ?? 13)}
                onChange={(e) => updateSelected({ size: Number(e.target.value) })}
              />
            </label>
          )}
          {sel.type !== "rule" && (
            <label className="col-span-4 text-xs uppercase text-ui-fg-subtle">
              Content (placeholders allowed)
              <Input
                value={sel.text ?? ""}
                onChange={(e) => updateSelected({ text: e.target.value })}
              />
            </label>
          )}
          <Text size="xsmall" className="col-span-4 text-ui-fg-subtle">
            Drag blocks on the sheet to reposition; fine-tune with the fields.
          </Text>
        </div>
      )}
    </div>
  )
}
