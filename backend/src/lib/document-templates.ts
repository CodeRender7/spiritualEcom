import { Modules } from "@medusajs/framework/utils"

/**
 * Document template gallery domain logic (document-builder D2, ADR-0002).
 *
 * A document template is a `format: "pdf"` row in the unified template store
 * (the `email_template` module + table). It carries:
 *  - `doc_kind`:            invoice | waybill | transit_memo | receipt | e_bill | payment_receipt
 *  - `page_size`:           A4 | A5 | Letter
 *  - `page_orientation`:    portrait | landscape
 *  - `page_margin`:         page margin in mm
 *  - `watermark`:           optional watermark text (e.g. "DRAFT", "VOID")
 *  - `html`:                the print-ready HTML body (keeps `{{key:value}}`)
 *  - `design`:              optional builder design the canvas editor persists
 *  - `placeholders`:        the parsed `{{key:value}}` catalog
 *
 * `DOC_KINDS` is the closed set of document kinds; `DOC_KEY_CATALOG` is the
 * master set of suggested `{{key:value}}` placeholders for documents (used by
 * the builder picker and by the placeholder catalog in D3).
 */

export const DOC_KINDS = [
  "invoice",
  "waybill",
  "transit_memo",
  "receipt",
  "e_bill",
  "payment_receipt",
  "quote",
  "custom",
] as const
export type DocKind = (typeof DOC_KINDS)[number]

export const PAGE_SIZES = ["A4", "A5", "Letter"] as const
export const PAGE_ORIENTATIONS = ["portrait", "landscape"] as const

export const DOC_KIND_LABELS: Record<string, string> = {
  invoice: "Invoice",
  waybill: "Waybill / Shipping Label",
  transit_memo: "Transit Memo",
  receipt: "Receipt (proof of purchase)",
  e_bill: "E-Bill (digital bill)",
  payment_receipt: "Payment Receipt",
  quote: "Quotation",
  custom: "Custom Document",
}

/** Master set of suggested document placeholders, grouped by context. */
export const DOC_KEY_CATALOG: Record<string, { key: string; value: string; description: string }[]> = {
  company: [
    { key: "company_name", value: "DivineKart", description: "Registered company / brand" },
    { key: "company_address", value: "12-4-1, Old Market Road, Vijayawada, AP 520001", description: "Registered company address" },
    { key: "company_gstin", value: "37ABCDE1234F1Z5", description: "Company GSTIN" },
    { key: "company_phone", value: "+91 98765 43210", description: "Company phone" },
    { key: "company_email", value: "support@divinekart.com", description: "Company email" },
  ],
  order: [
    { key: "order_id", value: "000123", description: "Order number" },
    { key: "order_date", value: "2026-08-17", description: "Order date (YYYY-MM-DD)" },
    { key: "order_status", value: "Confirmed", description: "Order status" },
    { key: "order_items_count", value: "3 items", description: "Line items count summary" },
    { key: "customer_name", value: "Ramesh Kumar", description: "Customer full name" },
    { key: "customer_phone", value: "+91 90000 00000", description: "Customer phone" },
    { key: "customer_email", value: "ramesh@example.com", description: "Customer email" },
    { key: "billing_address", value: "42, Krishna Colony, Vijayawada", description: "Billing address" },
    { key: "shipping_address", value: "42, Krishna Colony, Vijayawada", description: "Shipping address" },
    { key: "line_items", value: "Line item rows (HTML table)", description: "HTML table of line items" },
    { key: "items_html", value: "Line item rows (HTML table)", description: "HTML table of line items" },
  ],
  payment: [
    { key: "subtotal", value: "₹4,999.00", description: "Order subtotal" },
    { key: "discount", value: "₹500.00", description: "Discount total" },
    { key: "tax_amount", value: "₹899.82", description: "GST / tax total" },
    { key: "tax_breakdown", value: "CGST ₹449.91 + SGST ₹449.91", description: "CGST/SGST breakdown" },
    { key: "shipping_cost", value: "₹80.00", description: "Shipping cost" },
    { key: "grand_total", value: "₹5,478.82", description: "Order grand total" },
    { key: "currency", value: "INR", description: "Currency code" },
    { key: "payment_status", value: "Captured", description: "Payment status" },
  ],
  payment_receipt: [
    { key: "txn_id", value: "pay_1AbC2dE3f", description: "Payment gateway transaction id" },
    { key: "invoice_number", value: "INV-2026-000123", description: "Human invoice number" },
    { key: "payment_date", value: "17 AUG 2026", description: "Payment date" },
    { key: "amount", value: "₹4,999.00", description: "Payment amount" },
    { key: "payment_mode", value: "UPI", description: "Payment method (UPI / Card / Netbanking / COD)" },
    { key: "paid_to", value: "DivineKart", description: "Payee / merchant name" },
    { key: "receipt_number", value: "RCPT-2026-000123", description: "Receipt sequence number" },
  ],
  quote: [
    { key: "quote_no", value: "QT-2026-000123", description: "Quotation reference number" },
    { key: "quote_date", value: "2026-08-17", description: "Quotation date" },
    { key: "valid_until", value: "2026-09-17", description: "Quotation validity date" },
    { key: "terms", value: "50% advance, balance on dispatch. Prices inclusive of GST.", description: "Terms & conditions line" },
  ],
  logistics: [
    { key: "carrier_name", value: "BlueDart", description: "Carrier / courier name" },
    { key: "tracking_id", value: "BDA1A0000000001", description: "Tracking / AWB number" },
    { key: "waybill_number", value: "WB2026081700012", description: "Waybill number" },
    { key: "consignment_no", value: "CN2026081703", description: "Consignment number" },
    { key: "consignor_name", value: "DivineKart", description: "Consignor / shipper name" },
    { key: "consignor_phone", value: "+91 98765 43210", description: "Consignor phone" },
    { key: "consignor_address", value: "Old Market Road, Vijayawada", description: "Consignor address" },
    { key: "consignee_name", value: "Ramesh Kumar", description: "Consignee / recipient name" },
    { key: "consignee_phone", value: "+91 90000 00000", description: "Consignee phone" },
    { key: "consignee_address", value: "42, Krishna Colony, Vijayawada", description: "Consignee address" },
    { key: "origin_station", value: "Vijayawada Hub", description: "Origin station" },
    { key: "destination_station", value: "Hyderabad Hub", description: "Destination station" },
    { key: "pieces", value: "2", description: "Number of parcels" },
    { key: "weight_kg", value: "3.5", description: "Declared weight (kg)" },
    { key: "invoice_value", value: "₹5,000", description: "Declared invoice value" },
    { key: "charges_paid", value: "₹220", description: "Freight charges paid" },
  ],
}

/**
 * Seed HTML for each document kind. All use `{{key:value}}` placeholders so
 * they render through the same engine the email templates do (D4).
 */
const INVOICE_BASE = `
<!doctype html>
<html>
<head><meta charset="utf-8"><style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;font-size:13px;margin:0;}
  .wrap{max-width:820px;margin:0 auto;padding:24px;}
  .head{display:flex;justify-content:space-between;border-bottom:3px solid #F97316;padding-bottom:12px;}
  .brand{font-size:22px;font-weight:700;color:#F97316;}
  .brand small{display:block;font-weight:400;font-size:11px;color:#666;margin-top:2px;}
  .h2{font-size:14px;color:#444;}
  h1{font-size:26px;margin:12px 0 4px;letter-spacing:1px;color:#111;}
  .meta{color:#666;font-size:12px;margin-bottom:16px;}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;font-size:12px;}
  .parties h4{margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#F97316;}
  .parties div{line-height:1.45;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th{text-align:left;background:#FFF3E6;color:#111;font-weight:600;padding:8px 10px;border-bottom:2px solid #F97316;}
  td{padding:8px 10px;border-bottom:1px solid #eee;vertical-align:top;}
  .nums{text-align:right;}
  .totals{margin-left:auto;margin-top:12px;width:280px;}
  .totals .row{display:flex;justify-content:space-between;padding:4px 10px;font-size:12px;}
  .totals .row.grand{border-top:2px solid #111;font-weight:700;font-size:16px;margin-top:4px;padding-top:8px;}
  .sig{margin-top:36px;display:flex;justify-content:flex-end;}
  .sig .line{width:200px;border-bottom:1px solid #111;padding-bottom:4px;text-align:center;font-size:11px;color:#666;}
  .foot{margin-top:32px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#777;line-height:1.6;}
  .warn{background:#fff;border:2px dashed #F97316;color:#F97316;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:700;display:inline-block;margin-top:12px;}
</style></head>
<body><div class="wrap">
  <div class="head">
    <div><div class="brand">🕉️ {{company_name:DivineKart}}</div>
      <small>{{company_address:12-4-1, Old Market Road, Vijayawada, AP 520001}}<br>
      GSTIN: {{company_gstin:37ABCDE1234F1Z5}} · {{company_phone:+91 98765 43210}} · {{company_email:support@divinekart.com}}</small>
    </div>
    <div class="h2"><div style="font-size:22px;font-weight:700;letter-spacing:1px;">INVOICE</div>
      <div style="margin-top:4px;">{{invoice_number:INV-2026-000001}}</div>
      <div>Date: {{order_date:2026-08-17}}</div></div>
  </div>
  <div class="parties">
    <div><h4>Billed To</h4><div><strong>{{customer_name:Customer}}</strong><br>
      {{billing_address:billing address}}<br>{{customer_phone:+91 90000 00000}}<br>{{customer_email:customer@example.com}}</div></div>
    <div><h4>Ship To</h4><div>{{shipping_address:ship address}}<br>Phone: {{customer_phone:+91 90000 00000}}</div></div>
  </div>
  <table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit</th><th class="nums">Price</th><th class="nums">GST</th><th class="nums">Amount</th></tr></thead>
  <tbody>{{line_items:_rows_here_(D7_injects_from_order)}}</tbody></table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span class="nums">{{subtotal:₹0.00}}</span></div>
    <div class="row"><span>Discount</span><span class="nums">−{{discount:₹0.00}}</span></div>
    <div class="row"><span>GST</span><span class="nums">{{tax_amount:₹0.00}}</span></div>
    <div class="row"><span>Shipping</span><span class="nums">{{shipping_cost:₹0.00}}</span></div>
    <div class="row grand"><span>Grand Total ({{currency:INR}})</span><span class="nums">{{grand_total:₹0.00}}</span></div>
  </div>
  <div class="sig"><div class="line">Authorised Signatory</div></div>
  <div class="foot">Thank you for shopping at {{company_name:DivineKart}}. This is a computer generated document and no signature is required.<br>Tax invoice number: {{invoice_number:INV-2026-000001}} · Order: {{order_id:000123}} · Status: {{payment_status:Captured}}</div>
</div></body></html>
`

const E_BILL = `
<!doctype html>
<html><head><meta charset="utf-8"><style>*{box-sizing:border-box;-webkit-print-color-adjust:exact;}
  body{font-family:Arial,sans-serif;color:#1a1a1a;font-size:13px;margin:0;padding:24px;}
  .wrap{max-width:820px;margin:0 auto;}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px double #F97316;padding-bottom:12px;}
  .brand{font-size:24px;font-weight:700;color:#F97316;}
  .brand small{display:block;font-size:11px;color:#666;font-weight:400;margin-top:4px;}
  .tag{background:#111;color:#fff;padding:6px 12px;border-radius:4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:700;}
  h2{margin:16px 0 8px;font-size:14px;color:#F97316;letter-spacing:1px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th,td{padding:8px 10px;border-bottom:1px solid #eee;text-align:left;}
  th{background:#FFF3E6;font-weight:600;}
  .nums{text-align:right;}
  .sum{margin:12px 0 0 auto;width:260px;font-size:13px;}
  .sum .r{display:flex;justify-content:space-between;padding:4px 8px;}
  .sum .r.g{border-top:2px solid #111;font-weight:700;font-size:16px;}
  .foot{margin-top:28px;font-size:11px;color:#777;border-top:1px solid #eee;padding-top:10px;}
  .sig{margin-top:24px;text-align:right;font-size:12px;color:#666;}
  .sig .line{width:180px;border-bottom:1px solid #111;padding-bottom:4px;margin-right:24px;text-align:center;}
</style></head><body><div class="wrap">
  <div class="top"><div class="brand">🕉️ {{company_name:DivineKart}}<small>{{company_address:address}}<br>{{company_gstin:GSTIN}} · {{company_phone:phone}} · {{company_email:email}}</small></div>
    <div><div class="tag">E-BILL</div><div style="text-align:right;margin-top:6px;font-size:12px;color:#444;">No. {{invoice_number:EB-2026-000001}}<br>Date: {{order_date:2026-08-17}}</div></div></div>
  <h2>BUSINESS NAME: {{paid_to:DivineKart}} &nbsp;·&nbsp; GREETING: Namaste {{customer_name:Customer}}</h2>
  <table><tbody>
    <tr><td>Invoices / Orders</td><td>{{invoice_number:EB-2026-000001}} ({{order_id:000123}})</td></tr>
    <tr><td>Ship To</td><td>{{shipping_address:address}}</td></tr>
    <tr><td>Items</td><td>{{order_items_count:3 items}}</td></tr>
  </tbody></table>
  <table><thead><tr><th>Item</th><th>Qty</th><th class="nums">Price</th><th class="nums">Amount</th></tr></thead>
  <tbody>{{line_items:_rows_here_(D7_injects_from_order)}}</tbody></table>
  <div class="sum">
    <div class="r"><span>Subtotal</span><span class="nums">{{subtotal:₹0}}</span></div>
    <div class="r"><span>Discount</span><span class="nums">−{{discount:₹0}}</span></div>
    <div class="r"><span>GST</span><span class="nums">{{tax_amount:₹0}}</span></div>
    <div class="r"><span>Shipping</span><span class="nums">{{shipping_cost:₹0}}</span></div>
    <div class="r g"><span>Total ({{currency:INR}})</span><span class="nums">{{grand_total:₹0}}</span></div>
  </div>
  <div class="sig">Paid by — <span class="line">{{customer_name:Customer}}</span>&nbsp;&nbsp;Received by — <span class="line">Cashier</span></div>
  <div class="foot">E-Bill · {{paid_to:DivineKart}} · {{company_email:support@divinekart.com}} · Thank you 🙏</div>
</div></body></html>
`

const RECEIPT = `
<!doctype html>
<html><head><meta charset="utf-8"><style>*{box-sizing:border-box;}
  body{font-family:Arial,sans-serif;color:#111;font-size:13px;margin:0;padding:24px;background:#f6f6f6;}
  .slip{background:#fff;max-width:420px;margin:0 auto;padding:24px 28px;border:1px solid #ddd;box-shadow:0 1px 2px rgba(0,0,0,.04);}
  .head{text-align:center;border-bottom:2px dashed #ccc;padding-bottom:14px;}
  .brand{font-size:20px;font-weight:700;color:#F97316;}
  .brand small{display:block;font-size:10px;color:#777;font-weight:400;margin-top:4px;}
  h2{text-align:center;font-size:14px;letter-spacing:3px;margin:14px 0 4px;}
  .meta{font-size:11px;color:#555;margin:4px 0;line-height:1.6;}
  table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px;}
  td{padding:4px 0;}
  td.n{text-align:right;font-weight:600;}
  .big{font-size:18px;font-weight:700;border-top:1px solid #cbd5d1;padding-top:10px;margin-top:6px;}
  .thanks{margin-top:18px;text-align:center;font-size:11px;color:#777;line-height:1.6;}
  .qr{width:90px;height:90px;margin:12px auto 0;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:9px;color:#bbb;}
</style></head><body>
  <div class="slip">
    <div class="head"><div class="brand">🕉️ {{company_name:DivineKart}}</div>
      <small>{{company_address:address}}<br>GSTIN: {{company_gstin:GSTIN}} · {{company_phone:phone}}</small></div>
    <h2>PURCHASE RECEIPT</h2>
    <div class="meta">Receipt No: {{receipt_number:RCPT-2026-000123}}<br>
      Date: {{payment_date:2026-08-17}} &nbsp; Time: {{payment_time:14:32}}<br>
      Order: #{{order_id:000123}} &nbsp; Customer: {{customer_name:Customer}}</div>
    <table>
      <tr><td>Items received</td><td class="n">{{order_items_count:3 items}}</td></tr>
      <tr><td>Subtotal</td><td class="n">{{subtotal:₹0}}</td></tr>
      <tr><td>Discount</td><td class="n">−{{discount:₹0}}</td></tr>
      <tr><td>Tax</td><td class="n">{{tax_amount:₹0}}</td></tr>
      <tr><td>Shipping</td><td class="n">{{shipping_cost:₹0}}</td></tr>
      <tr class="big"><td>TOTAL PAID ({{currency:INR}})</td><td class="n">{{grand_total:₹0}}</td></tr>
    </table>
    <div class="thanks">Thank you for shopping at {{company_name:DivineKart}}.<br>
      Please retain this slip for returns or warranty.<br>
      Support: {{company_email:support@divinekart.com}}</div>
    <div class="qr">QR · {{receipt_number:RCPT-2026-000123}}</div>
  </div>
</body></html>
`

const PAYMENT_RECEIPT = `
<!doctype html>
<html><head><meta charset="utf-8"><style>*{box-sizing:border-box;}
  body{font-family:Arial,sans-serif;color:#111;font-size:13px;margin:0;padding:24px;background:#f6f6f6;}
  .slip{background:#fff;max-width:520px;margin:0 auto;padding:32px 36px;border-top:6px solid #16a34a;}
  .head{display:flex;justify-content:space-between;align-items:flex-start;}
  .brand{font-size:20px;font-weight:700;color:#F97316;}
  .brand small{display:block;font-size:10px;color:#777;font-weight:400;margin-top:4px;}
  .ok{color:#16a34a;font-weight:700;letter-spacing:1px;font-size:12px;text-align:center;}
  .ok .badge{display:inline-block;background:#fff;border:2px solid #16a34a;border-radius:50%;width:56px;height:56px;line-height:54px;font-size:26px;margin-bottom:6px;}
  .ok h2{margin:8px 0 0;font-size:12px;letter-spacing:3px;color:#16a34a;text-transform:uppercase;}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #eee;font-size:13px;}
  .row .l{color:#777;}
  .row .r{font-weight:600;}
  .big{margin-top:16px;text-align:center;font-size:26px;font-weight:700;color:#111;}
  .big small{display:block;font-size:11px;color:#777;margin-top:4px;font-weight:400;letter-spacing:2px;}
  .foot{margin-top:24px;text-align:center;font-size:10px;color:#999;line-height:1.6;}
</style></head><body>
  <div class="slip">
    <div class="head">
      <div class="brand">🕉️ {{company_name:DivineKart}}<small>{{company_address:address}}</small></div>
    </div>
    <div class="ok"><div class="badge">✓</div><h2>Payment Received</h2></div>
    <div style="margin-top:20px;">
      <div class="big">₹{{amount:4,999.00}}<small>Paid · ({{currency:INR}})</small></div>
    </div>
    <div style="margin-top:20px;">
      <div class="row"><span class="l">Receipt No.</span><span class="r">{{receipt_number:RCPT-2026-000123}}</span></div>
      <div class="row"><span class="l">Date &amp; Time</span><span class="r">{{payment_date:2026-08-17}} {{payment_time:14:32}}</span></div>
      <div class="row"><span class="l">Transaction ID</span><span class="r">{{txn_id:pay_1AbC2dE3f}}</span></div>
      <div class="row"><span class="l">Payment Mode</span><span class="r">{{payment_mode:UPI}}</span></div>
      <div class="row"><span class="l">Paid To</span><span class="r">{{paid_to:DivineKart}}</span></div>
      <div class="row"><span class="l">Against</span><span class="r">Order #{{order_id:000123}} / Invoice {{invoice_number:INV-2026-000123}}</span></div>
      <div class="row"><span class="l">Customer</span><span class="r">{{customer_name:Customer}}</span></div>
      <div class="row"><span class="l">Status</span><span class="r">SUCCESS</span></div>
    </div>
    <div class="foot">This is a computer-generated payment receipt.<br>{{company_name:DivineKart}} · {{company_email:support@divinekart.com}}</div>
  </div>
</body></html>
`

const WAYBILL = `
<!doctype html>
<html><head><meta charset="utf-8"><style>*{box-sizing:border-box;}
  body{font-family:Arial,sans-serif;color:#111;font-size:12px;margin:0;padding:16px;}
  .wrap{width:760px;margin:0 auto;border:3px solid #111;}
  .top{background:#111;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;}
  .top .brand{font-size:18px;font-weight:700;}
  .top .kind{font-size:20px;font-weight:700;letter-spacing:2px;}
  .row2{display:grid;grid-template-columns:1fr 1fr;gap:0;}
  .row2>div{padding:10px 14px;}
  .row2 .from{border-right:1px dashed #999;}
  .row2 h4{margin:0 0 6px;font-size:10px;letter-spacing:1px;color:#F97316;text-transform:uppercase;font-weight:700;}
  .row2 div{line-height:1.4;}
  .mid{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px dashed #999;border-bottom:1px dashed #999;}
  .mid>div{padding:10px 12px;}
  .mid .c2{border-left:1px dashed #999;}
  .mid .c3{border-left:1px dashed #999;}
  .mid h5{margin:0 0 4px;font-size:10px;letter-spacing:1px;color:#666;text-transform:uppercase;font-weight:700;}
  .mid .v{font-size:14px;font-weight:700;}
  .bar{padding:10px 14px;text-align:center;font-size:14px;font-weight:700;letter-spacing:4px;background:#FFF3E6;color:#111;border-bottom:1px dashed #999;}
  .bar small{display:block;font-size:9px;letter-spacing:0;font-weight:400;color:#777;margin-top:2px;}
  .foot{display:grid;grid-template-columns:2fr 1fr 1fr;}
  .foot>div{padding:8px 12px;font-size:10px;color:#555;border-top:1px dashed #999;line-height:1.5;}
  .foot .c2{border-left:1px dashed #999;}
  .foot .c3{border-left:1px dashed #999;}
</style></head><body>
  <div class="wrap">
    <div class="top">
      <div class="brand">🕉️ {{carrier_name:BlueDart}}</div>
      <div class="kind">WAYBILL / AWB</div>
    </div>
    <div class="row2">
      <div class="from"><h4>Consignor / Ship From</h4>
        <strong>{{consignor_name:DivineKart}}</strong><br>
        {{consignor_address:Old Market Road, Vijayawada}}<br>
        Ph: {{consignor_phone:+91 98765 43210}}</div>
      <div><h4>Consignee / Ship To</h4>
        <strong>{{consignee_name:Customer}}</strong><br>
        {{consignee_address:42, Krishna Colony, Vijayawada}}<br>
        Ph: {{consignee_phone:+91 90000 00000}}</div>
    </div>
    <div class="mid">
      <div class="c1"><h5>Origin</h5><div class="v">{{origin_station:Vijayawada Hub}}</div></div>
      <div class="c2"><h5>Destination</h5><div class="v">{{destination_station:Hyderabad Hub}}</div></div>
      <div class="c3"><h5>Service</h5><div class="v">Surface · Express</div></div>
    </div>
    <div class="bar">AWB · {{waybill_number:WB2026081700012}}
      <small>SCAN TO TRACK · {{tracking_id:BDA1A0000000001}}</small></div>
    <div class="foot">
      <div><strong>Declared Contents:</strong><br>{{order_items_count:3 items}} · {{order_id:000123}} · Invoice {{invoice_value:₹5,000}}</div>
      <div class="c2"><strong>Parcels:</strong><br>{{pieces:2}} pieces · {{weight_kg:3.5}} kg</div>
      <div class="c3"><strong>Freight</strong><br>₹{{charges_paid:220}} · Paid</div>
    </div>
  </div>
</body></html>
`

const TRANSIT_MEMO = `
<!doctype html>
<html><head><meta charset="utf-8"><style>*{box-sizing:border-box;}
  body{font-family:Arial,sans-serif;color:#111;font-size:12px;margin:0;padding:24px;}
  .wrap{max-width:820px;margin:0 auto;}
  .head{display:flex;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:10px;}
  .brand{font-size:20px;font-weight:700;color:#F97316;}
  .brand small{display:block;font-size:11px;color:#666;font-weight:400;}
  .h2 h1{margin:0;font-size:20px;letter-spacing:2px;}
  .h2 .s{font-size:11px;color:#666;margin-top:2px;}
  .meta{margin-top:12px;font-size:11px;color:#555;display:grid;grid-template-columns:repeat(3,1fr);gap:4px 16px;}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px;}
  th{background:#111;color:#fff;font-weight:600;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;}
  td{padding:6px 10px;border-bottom:1px solid #eee;}
  .tots{margin-left:auto;width:280px;font-size:12px;margin-top:14px;}
  .tots .r{display:flex;justify-content:space-between;padding:3px 8px;}
  .tots .r.g{border-top:2px solid #111;font-weight:700;font-size:15px;margin-top:4px;padding-top:6px;}
  .sig{margin-top:36px;display:flex;justify-content:space-between;font-size:10px;color:#666;}
  .sig .l{width:180px;border-bottom:1px solid #999;padding-bottom:4px;text-align:center;}
  .foot{margin-top:24px;font-size:10px;color:#888;border-top:1px solid #eee;padding-top:8px;}
</style></head><body><div class="wrap">
  <div class="head">
    <div class="brand">🕉️ {{company_name:DivineKart}}<small>{{company_address:address}} · {{company_phone:phone}}</small></div>
    <div class="h2"><h1>TRANSIT MEMO</h1><div class="s">Logistics manifest · {{memo_no:TM-2026-000123}}</div></div>
  </div>
  <div class="meta">
    <div>Date: {{order_date:2026-08-17}}</div>
    <div>Consignment: {{consignment_no:CN2026081703}}</div>
    <div>Carrier: {{carrier_name:BlueDart}}</div>
    <div>AWB: {{waybill_number:WB2026081700012}}</div>
    <div>Tracking: {{tracking_id:BDA1A0000000001}}</div>
    <div>Pieces: {{pieces:2}} · {{weight_kg:3.5}} kg</div>
  </div>
  <table><thead><tr><th>Consignor</th><th>Consignee</th><th>Origin</th><th>Destination</th><th>Service</th></tr></thead>
    <tbody><tr>
      <td><strong>{{consignor_name:DivineKart}}</strong><br>{{consignor_address:address}}<br>{{consignor_phone:phone}}</td>
      <td><strong>{{consignee_name:Customer}}</strong><br>{{consignee_address:address}}<br>{{consignee_phone:phone}}</td>
      <td>{{origin_station:Vijayawada Hub}}</td>
      <td>{{destination_station:Hyderabad Hub}}</td>
      <td>Surface · Express</td>
    </tr></tbody></table>
  <table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Weight</th><th>Declared Value</th></tr></thead>
    <tbody>{{line_items:_rows_here_(D7_injects_from_order)}}</tbody></table>
  <div class="tots">
    <div class="r"><span>Total pieces</span><span>{{pieces:2}}</span></div>
    <div class="r"><span>Total weight</span><span>{{weight_kg:3.5}} kg</span></div>
    <div class="r g"><span>Declared value</span><span>₹{{invoice_value:5,000}}</span></div>
  </div>
  <div class="sig">
    <div class="l">Dispatched by — Store Manager</div>
    <div class="l">Received by — Carrier</div>
  </div>
  <div class="foot">Transit memo · {{company_name:DivineKart}} · Not a commercial invoice · {{memo_no:TM-2026-000123}}</div>
</div></body></html>
`

const QUOTE = `
<!doctype html>
<html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;font-size:13px;margin:0;}
  .wrap{max-width:820px;margin:0 auto;padding:24px;}
  .head{display:flex;justify-content:space-between;border-bottom:3px solid #F97316;padding-bottom:12px;}
  .brand{font-size:22px;font-weight:700;color:#F97316;}
  .brand small{display:block;font-weight:400;font-size:11px;color:#666;margin-top:2px;}
  h1{font-size:24px;margin:12px 0 4px;letter-spacing:2px;color:#111;}
  .meta{color:#666;font-size:12px;}
  .parties{margin:16px 0;font-size:12px;line-height:1.5;}
  .parties h4{margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#F97316;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th{text-align:left;background:#FFF3E6;color:#111;font-weight:600;padding:8px 10px;border-bottom:2px solid #F97316;}
  td{padding:8px 10px;border-bottom:1px solid #eee;vertical-align:top;}
  .nums{text-align:right;}
  .totals{margin-left:auto;margin-top:12px;width:280px;}
  .totals .row{display:flex;justify-content:space-between;padding:4px 10px;font-size:12px;}
  .totals .row.grand{border-top:2px solid #111;font-weight:700;font-size:16px;margin-top:4px;padding-top:8px;}
  .valid{margin-top:14px;background:#FFF3E6;border-left:4px solid #F97316;padding:10px 14px;font-size:12px;color:#7c4a12;}
  .terms{margin-top:16px;font-size:11px;color:#555;line-height:1.6;}
  .foot{margin-top:28px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#777;}
</style></head>
<body><div class="wrap">
  <div class="head">
    <div><div class="brand">🕉️ {{company_name:DivineKart}}</div>
      <small>{{company_address:address}}<br>GSTIN: {{company_gstin:GSTIN}} · {{company_phone:phone}}</small></div>
    <div style="text-align:right;"><h1>QUOTATION</h1>
      <div class="meta">No. {{quote_no:QT-2026-000123}}<br>Date: {{quote_date:2026-08-17}}<br>Valid until: {{valid_until:2026-09-17}}</div></div>
  </div>
  <div class="parties"><h4>Prepared For</h4><strong>{{customer_name:Customer}}</strong><br>{{billing_address:address}}<br>{{customer_phone:phone}} · {{customer_email:email}}</div>
  <table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th class="nums">Unit Price</th><th class="nums">Amount</th></tr></thead>
  <tbody>{{line_items:_rows_here_(D7_injects_from_order)}}</tbody></table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span class="nums">{{subtotal:₹0.00}}</span></div>
    <div class="row"><span>Discount</span><span class="nums">−{{discount:₹0.00}}</span></div>
    <div class="row"><span>GST</span><span class="nums">{{tax_amount:₹0.00}}</span></div>
    <div class="row grand"><span>Quote Total ({{currency:INR}})</span><span class="nums">{{grand_total:₹0.00}}</span></div>
  </div>
  <div class="valid">This quotation is valid until <strong>{{valid_until:2026-09-17}}</strong>.</div>
  <div class="terms"><strong>Terms:</strong> {{terms:50% advance, balance on dispatch. Prices inclusive of GST.}}</div>
  <div class="foot">{{company_name:DivineKart}} · {{company_email:support@divinekart.com}} · Quote {{quote_no:QT-2026-000123}}</div>
</div></body></html>
`

/** All seven seed document templates (one per doc_kind). */
export type SeedDocTemplate = {
  name: string
  description: string
  doc_kind: DocKind
  event_key: string
  page_size: string
  page_orientation: string
  page_margin: string
  watermark: string | null
  html: string
  status: "active" | "draft"
}

export function seedDocTemplateRows(): SeedDocTemplate[] {
  return [
    {
      name: "Invoice (Default)",
      description: "Standard GST tax invoice with company header, bill/ship-to, line items, totals, and signature line.",
      doc_kind: "invoice",
      event_key: "invoice",
      page_size: "A4",
      page_orientation: "portrait",
      page_margin: "12",
      watermark: null,
      html: INVOICE_BASE,
      status: "active",
    },
    {
      name: "E-Bill (Default)",
      description: "Digital bill for retail orders — compact double-rule layout with payee/sign-off.",
      doc_kind: "e_bill",
      event_key: "invoice",
      page_size: "A4",
      page_orientation: "portrait",
      page_margin: "12",
      watermark: null,
      html: E_BILL,
      status: "active",
    },
    {
      name: "Receipt (Default)",
      description: "Receipt-slip proof of purchase with QR placeholder and itemised totals.",
      doc_kind: "receipt",
      event_key: "order_confirmation",
      page_size: "A5",
      page_orientation: "portrait",
      page_margin: "10",
      watermark: null,
      html: RECEIPT,
      status: "active",
    },
    {
      name: "Payment Receipt (Default)",
      description: "Payment voucher showing amount paid, mode, txn id, and order/invoice reference.",
      doc_kind: "payment_receipt",
      event_key: "payment",
      page_size: "A5",
      page_orientation: "portrait",
      page_margin: "10",
      watermark: null,
      html: PAYMENT_RECEIPT,
      status: "active",
    },
    {
      name: "Waybill (Default)",
      description: "Single-page shipping label with consignee, carrier, AWB, and declared contents.",
      doc_kind: "waybill",
      event_key: "order_shipped",
      page_size: "A5",
      page_orientation: "landscape",
      page_margin: "8",
      watermark: null,
      html: WAYBILL,
      status: "active",
    },
    {
      name: "Transit Memo (Default)",
      description: "Logistics manifest with consignor/consignee, carrier route, and itemised parcel details.",
      doc_kind: "transit_memo",
      event_key: "order_shipped",
      page_size: "A4",
      page_orientation: "portrait",
      page_margin: "12",
      watermark: null,
      html: TRANSIT_MEMO,
      status: "active",
    },
    {
      name: "Quotation (Default)",
      description: "Quotation with validity window, itemised pricing, and terms — shareable as PDF.",
      doc_kind: "quote",
      event_key: "quote",
      page_size: "A4",
      page_orientation: "portrait",
      page_margin: "12",
      watermark: null,
      html: QUOTE,
      status: "active",
    },
  ]
}

/** Resolve the emailTemplate module service (which now hosts documents). */
export function resolveDocumentTemplateService(container: any): any {
  return container.resolve("email_template")
}

/** ADR-0002 / D2: canonical document-kind constant used by API validators. */
export const ALLOWED_DOC_KINDS: string[] = [...DOC_KINDS]
export const ALLOWED_PAGE_SIZES: string[] = [...PAGE_SIZES]
export const ALLOWED_PAGE_ORIENTATIONS: string[] = [...PAGE_ORIENTATIONS]

/* ------------------------------------------------------------------ */
/* Versioned issuance (ADR-0002 §9) — the write path D4/D7 consume.    */
/* ------------------------------------------------------------------ */

export function resolveDocumentService(container: any): any {
  return container.resolve("document")
}

export type RecordIssuanceInput = {
  kind: DocKind | string
  entityId: string
  entityType?: "order" | "subscription" | string
  templateId?: string | null
  templateName?: string | null
  renderedHtml?: string | null
  fileKey?: string | null
  fileUrl?: string | null
  fileSize?: number | null
  generatedBy?: "pipeline" | "admin" | "storefront" | "api" | string
  status?: "ready" | "failed" | string
  metadata?: Record<string, any> | null
}

/**
 * Append an immutable version for (entityType, entityId, kind).
 *
 * Reliability contract:
 *  - find-or-create of the header, then a monotonic `version_number` computed
 *    from the current max;
 *  - the UNIQUE (document_id, version_number) index is the source of truth —
 *    if a concurrent issuer wins the race, we re-read and retry once rather
 *    than fail the caller's pipeline event;
 *  - header.current_version advances only after the version row exists.
 *
 * Never updates an existing version row — history is immutable.
 */
export async function recordDocumentIssuance(
  container: any,
  input: RecordIssuanceInput
): Promise<{ document: any; version: any }> {
  const service = resolveDocumentService(container)
  const entityType = input.entityType ?? "order"

  let headers = await service.listDocuments(
    { kind: input.kind, entity_type: entityType, entity_id: input.entityId },
    { take: 1 }
  )
  let header = headers[0]
  if (!header) {
    // Another issuer may create the same header concurrently; tolerate a
    // duplicate by re-reading once.
    try {
      header = await service.createDocuments({
        kind: input.kind,
        entity_type: entityType,
        entity_id: input.entityId,
        current_version: 0,
      })
    } catch (err: any) {
      const again = await service.listDocuments(
        { kind: input.kind, entity_type: entityType, entity_id: input.entityId },
        { take: 1 }
      )
      if (!again[0]) throw err
      header = again[0]
    }
  }

  const latest = await service.listDocumentVersions(
    { document_id: header.id },
    { order: { version_number: "DESC" }, take: 1 }
  )
  const nextNumber = (latest[0]?.version_number ?? 0) + 1

  const payload = () => ({
    document_id: header.id,
    version_number: nextNumber,
    template_id: input.templateId ?? null,
    template_name: input.templateName ?? null,
    rendered_html: input.renderedHtml ?? null,
    file_key: input.fileKey ?? null,
    file_url: input.fileUrl ?? null,
    file_size: input.fileSize ?? null,
    generated_by: input.generatedBy ?? "pipeline",
    status: input.status ?? "ready",
    metadata: input.metadata ?? {},
  })

  let version: any
  try {
    version = await service.createDocumentVersions(payload())
  } catch (err: any) {
    // Lost a version-number race → recompute once from the winner.
    const retryLatest = await service.listDocumentVersions(
      { document_id: header.id },
      { order: { version_number: "DESC" }, take: 1 }
    )
    const retryNumber = (retryLatest[0]?.version_number ?? nextNumber - 1) + 1
    version = await service.createDocumentVersions({
      ...payload(),
      version_number: retryNumber,
    })
  }

  await service.updateDocuments({ id: header.id, current_version: version.version_number })

  return { document: header, version }
}

export { Modules }
