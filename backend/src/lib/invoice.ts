import { Modules } from "@medusajs/framework/utils"
import { getStoreSettings } from "./settings"

const ORDER_SELECT = [
  "id",
  "display_id",
  "email",
  "currency_code",
  "total",
  "subtotal",
  "shipping_total",
  "tax_total",
  "discount_total",
  "created_at",
  "status",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.phone",
  "shipping_address.email",
  "shipping_address.country_code",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.postal_code",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "items.title",
  "items.quantity",
  "items.unit_price",
  "items.subtotal",
] as const

export async function fetchOrderForInvoice(
  container: any,
  orderId: string
): Promise<any | null> {
  const orderModule = container.resolve(Modules.ORDER)
  try {
    const orders = await orderModule.listOrders(
      { id: orderId },
      { select: ORDER_SELECT as unknown as string[] }
    )
    return orders[0] ?? null
  } catch (err) {
    console.error("DivineKart invoice fetch order failed:", err)
    return null
  }
}

const esc = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const inr = (n: number): string => `₹${Number(n || 0).toLocaleString("en-IN")}`

const today = (): string =>
  new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

export type InvoiceKind = "invoice" | "waybill"

/**
 * Render a standalone, print-friendly HTML document (invoice or waybill) for
 * an order. The browser can save this as a PDF via print → Save as PDF.
 */
export function renderInvoiceHtml(
  order: any,
  options: { kind?: InvoiceKind } = {}
): string {
  const kind: InvoiceKind = options.kind ?? "invoice"
  const addr = order?.shipping_address ?? {}
  const items = order?.items ?? []
  const customerName = [addr.first_name, addr.last_name].filter(Boolean).join(" ") || "Customer"

  const rows = items
    .map(
      (it: any) => `
      <tr>
        <td>${esc(it.title)}</td>
        <td>${Number(it.quantity ?? 0)}</td>
        <td>${inr(it.unit_price ?? 0)}</td>
        <td>${inr(it.subtotal ?? 0)}</td>
      </tr>`
    )
    .join("")

  const docTitle =
    kind === "waybill" ? "Delivery Waybill" : "Tax Invoice"

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${docTitle} #${order?.display_id ?? order?.id ?? ""}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 32px; color: #111; }
  .page { max-width: 760px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; }
  .head { display: flex; justify-content: space-between; border-bottom: 2px solid #F97316; padding-bottom: 16px; }
  .brand h1 { margin: 0; font-size: 24px; color: #F97316; }
  .brand p { margin: 2px 0; color: #6b7280; font-size: 13px; }
  .meta { text-align: right; font-size: 13px; color: #374151; }
  .meta .title { font-size: 18px; font-weight: 700; color: #111; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; }
  .block h3 { font-size: 13px; text-transform: uppercase; color: #6b7280; margin: 0 0 6px; }
  .block p { margin: 2px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  th { color: #6b7280; font-size: 12px; text-transform: uppercase; }
  .totals { margin-top: 20px; margin-left: auto; width: 260px; font-size: 14px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { font-weight: 700; font-size: 16px; border-top: 2px solid #F97316; margin-top: 6px; padding-top: 8px; }
  .footer { margin-top: 28px; text-align: center; font-size: 13px; color: #6b7280; }
  @media print { body { padding: 0; } .page { border: none; } }
</style>
</head>
<body>
  <div class="page">
    <div class="head">
      <div class="brand">
        <h1>${esc(order?.company_name || "DivineKart")}</h1>
        <p>${esc(order?.company_address || "Vrindavan, Uttar Pradesh, India")}</p>
        ${order?.gstin ? `<p>GSTIN: ${esc(order.gstin)}</p>` : ""}
      </div>
      <div class="meta">
        <div class="title">${docTitle}</div>
        <div>INV-${order?.display_id ?? order?.id ?? ""}</div>
        <div>Date: ${today()}</div>
        ${order?.status ? `<div>Status: ${esc(order.status)}</div>` : ""}
      </div>
    </div>

    <div class="grid">
      <div class="block">
        <h3>Bill To</h3>
        <p>${esc(customerName)}</p>
        <p>${esc(addr.address_1 ?? "")}${addr.address_2 ? `, ${esc(addr.address_2)}` : ""}</p>
        <p>${esc(addr.city ?? "")}${addr.province ? `, ${esc(addr.province)}` : ""} — ${esc(addr.postal_code ?? "")}</p>
        <p>${esc(addr.phone ?? "")}</p>
      </div>
      <div class="block">
        <h3>${kind === "waybill" ? "Ship To" : "Payment & Delivery"}</h3>
        <p>Email: ${esc(order?.email ?? addr.email ?? "")}</p>
        <p>Country: ${esc(addr.country_code ?? "in")}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${inr(order?.subtotal ?? 0)}</span></div>
      <div><span>Shipping</span><span>${inr(order?.shipping_total ?? 0)}</span></div>
      ${order?.discount_total ? `<div><span>Discount</span><span>${inr(order.discount_total)}</span></div>` : ""}
      ${order?.tax_total ? `<div><span>Tax</span><span>${inr(order.tax_total)}</span></div>` : ""}
      <div class="grand"><span>Total</span><span>${inr(order?.total ?? 0)}</span></div>
    </div>

    <div class="footer">
      ${esc(order?.footer_note || "Thank you for shopping at DivineKart!")}<br/>
      Download / print this page as a PDF using your browser.
    </div>
  </div>
</body>
</html>`
}

/**
 * Compose a printable invoice document, honoring the invoicing settings
 * (company name/address/GSTIN/footer) persisted by the admin.
 */
export async function buildInvoiceDocument(
  container: any,
  orderId: string,
  options: { kind?: InvoiceKind } = {}
): Promise<{ html: string; enabled: boolean; order: any }> {
  const settings = await getStoreSettings(container)
  const inv = settings.invoicing
  const order = await fetchOrderForInvoice(container, orderId)
  return {
    html: renderInvoiceHtml(
      {
        ...order,
        company_name: inv.company_name,
        company_address: inv.company_address,
        gstin: inv.gstin,
        footer_note: inv.footer_note,
      },
      options
    ),
    enabled: inv.enabled,
    order,
  }
}