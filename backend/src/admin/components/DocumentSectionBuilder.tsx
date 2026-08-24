"use client"

import { useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button, Text } from "@medusajs/ui"

/**
 * Sectional block builder (document-builder D5 v2).
 *
 * Drag-reorder document sections; each section carries a small print-ready
 * HTML snippet (saffron style matching the seed templates). The ordered list
 * is serialized to `{ mode: "sections", sections: [{ id, type }] }` design
 * JSON and composed into the template body on save — the HTML stays the
 * engine's source of truth, the design JSON makes it re-editable.
 */

export type SectionType =
  | "header"
  | "parties"
  | "items"
  | "totals"
  | "logistics"
  | "qrblock"
  | "signature"
  | "footer"

export const SECTION_LIBRARY: Record<
  SectionType,
  { label: string; description: string; html: string }
> = {
  header: {
    label: "Header",
    description: "Brand, address, GSTIN + document title and number/date",
    html: `<div class="head">
  <div><div class="brand">🕉️ {{company_name:DivineKart}}</div>
    <small>{{company_address:address}} · GSTIN: {{company_gstin:GSTIN}}</small></div>
  <div style="text-align:right;"><div style="font-size:20px;font-weight:700;">{{doc_title:DOCUMENT}}</div>
    <div>No. {{invoice_number:INV-000001}} · {{order_date:2026-08-17}}</div></div>
</div>`,
  },
  parties: {
    label: "Parties",
    description: "Billed-to / ship-to two-column grid",
    html: `<div class="parties">
  <div><h4>Billed To</h4><strong>{{customer_name:Customer}}</strong><br>{{billing_address:address}}<br>{{customer_phone:phone}}</div>
  <div><h4>Ship To</h4>{{shipping_address:address}}<br>{{customer_email:email}}</div>
</div>`,
  },
  items: {
    label: "Line items table",
    description: "Itemised rows injected from the order at render time",
    html: `<table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th class="nums">Price</th><th class="nums">Amount</th></tr></thead>
<tbody>{{line_items:_rows_}}</tbody></table>`,
  },
  totals: {
    label: "Totals",
    description: "Subtotal / discount / tax / grand total stack",
    html: `<div class="totals">
  <div class="row"><span>Subtotal</span><span class="nums">{{subtotal:₹0}}</span></div>
  <div class="row"><span>GST</span><span class="nums">{{tax_amount:₹0}}</span></div>
  <div class="row grand"><span>Total ({{currency:INR}})</span><span class="nums">{{grand_total:₹0}}</span></div>
</div>`,
  },
  logistics: {
    label: "Logistics",
    description: "Consignor/consignee + carrier route and parcel facts",
    html: `<div class="parties">
  <div><h4>Consignor</h4><strong>{{consignor_name:Shipper}}</strong><br>{{consignor_address:address}}</div>
  <div><h4>Consignee</h4><strong>{{consignee_name:Recipient}}</strong><br>{{consignee_address:address}}</div>
</div>
<div class="meta">Carrier: {{carrier_name:BlueDart}} · AWB {{waybill_number:WB-1}} · Pieces {{pieces:2}} · {{weight_kg:3.5}} kg<br>
Origin {{origin_station:Hub A}} → Destination {{destination_station:Hub B}}</div>`,
  },
  qrblock: {
    label: "QR block",
    description: "Verification QR — payload supports $key refs",
    html: `<div class="qr">{{qrcode:$receipt_number}}</div>`,
  },
  signature: {
    label: "Signature line",
    description: "Authorised signatory rule",
    html: `<div class="sig" style="margin-top:32px;display:flex;justify-content:flex-end;">
  <div style="width:200px;border-bottom:1px solid #111;padding-bottom:4px;text-align:center;font-size:11px;color:#666;">Authorised Signatory</div>
</div>`,
  },
  footer: {
    label: "Footer",
    description: "Thank-you note and document reference",
    html: `<div class="foot" style="margin-top:28px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#777;">
Thank you for shopping at {{company_name:DivineKart}} · Computer generated document.</div>`,
  },
}

/** Sensible starting order for a new sectional template (invoice-like). */
export const DEFAULT_SECTIONS: { id: string; type: SectionType }[] = [
  { id: "sec-header", type: "header" },
  { id: "sec-parties", type: "parties" },
  { id: "sec-items", type: "items" },
  { id: "sec-totals", type: "totals" },
  { id: "sec-signature", type: "signature" },
  { id: "sec-footer", type: "footer" },
]

/** Compose the ordered section snippets into a full print-ready page. */
export function composeSectionsHtml(sections: { id: string; type: SectionType }[]): string {
  const body = sections
    .map((s) => SECTION_LIBRARY[s.type]?.html ?? "")
    .join("\n")
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;font-size:13px;margin:0;}
.wrap{max-width:820px;margin:0 auto;padding:24px;}
.head{display:flex;justify-content:space-between;border-bottom:3px solid #F97316;padding-bottom:12px;}
.brand{font-size:22px;font-weight:700;color:#F97316;}
.brand small,.head small{display:block;font-size:11px;color:#666;margin-top:2px;}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0;font-size:12px;}
.parties h4{margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#F97316;}
.parties div{line-height:1.45;}
.meta{font-size:11px;color:#555;margin-top:8px;}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}
th{text-align:left;background:#FFF3E6;padding:8px 10px;border-bottom:2px solid #F97316;}
td{padding:8px 10px;border-bottom:1px solid #eee;}
.nums{text-align:right;}
.totals{margin-left:auto;margin-top:12px;width:280px;}
.totals .row{display:flex;justify-content:space-between;padding:4px 10px;font-size:12px;}
.totals .row.grand{border-top:2px solid #111;font-weight:700;font-size:16px;margin-top:4px;padding-top:8px;}
.qr{width:110px;height:110px;margin:16px auto;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;}
</style></head>
<body><div class="wrap">
${body}
</div></body></html>`
}

function SortableRow({
  id,
  type,
  onRemove,
}: {
  id: string
  type: SectionType
  onRemove?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2"
    >
      <button
        type="button"
        className="cursor-grab select-none px-1 text-ui-fg-subtle"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${SECTION_LIBRARY[type].label}`}
      >
        ⠿
      </button>
      <div className="flex-1">
        <Text size="small" weight="plus">
          {SECTION_LIBRARY[type].label}
        </Text>
        <Text size="xsmall" className="text-ui-fg-subtle">
          {SECTION_LIBRARY[type].description}
        </Text>
      </div>
      {onRemove && (
        <Button variant="danger" size="small" onClick={onRemove}>
          Remove
        </Button>
      )}
    </div>
  )
}

export default function DocumentSectionBuilder({
  sections,
  onChange,
}: {
  sections: { id: string; type: SectionType }[]
  onChange: (next: { id: string; type: SectionType }[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = sections.findIndex((s) => s.id === active.id)
      const newIndex = sections.findIndex((s) => s.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      onChange(arrayMove(sections, oldIndex, newIndex))
    },
    [sections, onChange]
  )

  const addSection = useCallback(
    (type: SectionType) => {
      onChange([...sections, { id: `sec-${Date.now()}`, type }])
    },
    [sections, onChange]
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1">
        {(Object.keys(SECTION_LIBRARY) as SectionType[]).map((type) => (
          <button
            key={type}
            type="button"
            title={SECTION_LIBRARY[type].description}
            onClick={() => addSection(type)}
            className="rounded-full border border-ui-border-base px-2 py-0.5 text-[11px] hover:bg-ui-bg-interactive hover:text-white"
          >
            +{SECTION_LIBRARY[type].label}
          </button>
        ))}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {sections.length === 0 && (
              <Text size="small" className="text-ui-fg-subtle">
                No sections yet — add blocks above.
              </Text>
            )}
            {sections.map((s) => (
              <SortableRow
                key={s.id}
                id={s.id}
                type={s.type}
                onRemove={() => onChange(sections.filter((x) => x.id !== s.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
