import { getStoreSettings, type DocDispatchSettings } from "./settings"
import { generateDocument } from "./document-generator"
import { resolveDocumentService } from "./document-templates"
import { signShareToken } from "./document-generator"
import { sendEmail } from "./emailer"
import { pickConnectedSession, toWaId } from "./whatsapp-utils"
import { sendDocumentFile } from "./whatsapp-session"

/**
 * Document dispatch (document-builder D7, ADR-0002 §8/§9).
 *
 * One reliable path for every pipeline trigger — BRM lifecycle events
 * (via notifyBrmEvent's document channel) and order/payment events (via the
 * document-dispatch subscriber):
 *
 *   bind → generateDocument (immutable version + PDF) → deliver
 *     ├─ email attachment (D6 transport; log seam fallback)
 *     └─ WhatsApp file send w/ caption (+ expiring share link), 3-attempt retry
 *
 * Delivery outcomes are recorded on the version's metadata.dispatch so the
 * admin can audit what went where. Nothing here ever throws to its caller — a
 * dispatch failure must not break the business pipeline that triggered it.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type DispatchOutcome = {
  generated: boolean
  version_id?: string
  version_number?: number
  email?: "sent" | "disabled" | "failed" | "skipped"
  whatsapp?: "sent" | "failed" | "skipped"
  share_url?: string | null
  error?: string
}

/** Human label for subjects/captions. */
const KIND_LABELS: Record<string, string> = {
  invoice: "Invoice",
  waybill: "Waybill",
  transit_memo: "Transit Memo",
  receipt: "Receipt",
  e_bill: "E-Bill",
  payment_receipt: "Payment Receipt",
  quote: "Quotation",
  custom: "Document",
}

export type DispatchDocumentInput = {
  kind: string
  entityType?: "order" | "subscription"
  entityId: string
  templateId?: string | null
  toEmail?: string | null
  phone?: string | null
  extraVars?: Record<string, string | number | null | undefined>
  /** Send over WhatsApp when a session is connected (default true when phone known). */
  whatsapp?: boolean
  generatedBy?: string
}

export async function dispatchDocument(
  container: any,
  input: DispatchDocumentInput
): Promise<DispatchOutcome> {
  const outcome: DispatchOutcome = { generated: false }

  // 1) Generate + persist an immutable version.
  let result
  try {
    result = await generateDocument(container, {
      kind: input.kind,
      entityId: input.entityId,
      entityType: input.entityType ?? "order",
      templateId: input.templateId || undefined,
      extraVars: input.extraVars,
      generatedBy: input.generatedBy ?? "pipeline",
    })
  } catch (err: any) {
    outcome.error = String(err?.message ?? err)
    return outcome
  }
  outcome.generated = true
  outcome.version_id = result.version.id
  outcome.version_number = result.version.version_number

  const label = KIND_LABELS[input.kind] ?? input.kind
  const settings = await getStoreSettings(container)
  const brand = settings.invoicing?.company_name || "DivineKart"

  // 2) Optional expiring share link (ADR §10) for captions/bodies.
  let shareUrl: string | null = null
  if (settings.doc_dispatch?.attach_share_link !== false) {
    const { token } = signShareToken(result.version.id, 30 * 24 * 60)
    const base =
      process.env.MEDUSA_BACKEND_URL ||
      `http://localhost:${process.env.PORT ?? 9000}`
    shareUrl = `${base}/store/documents/shared?token=${token}`
  }
  outcome.share_url = shareUrl

  const filename = `${input.kind}-v${result.version.version_number}.pdf`

  // 3) Email with attachment.
  if (input.toEmail) {
    const send = await sendEmail(container, {
      to: input.toEmail,
      subject: `${label} from ${brand} — #${input.entityId}`,
      html:
        `<p>Namaste,</p><p>Please find your <strong>${label}</strong> attached.` +
        (shareUrl
          ? ` You can also download it here: <a href="${shareUrl}">${shareUrl}</a> (link expires in 30 days).`
          : "") +
        `</p><p style="color:#777;font-size:12px;">Computer-generated document · ${brand}</p>`,
      attachments: [
        { filename, content: result.buffer, contentType: "application/pdf" },
      ],
    })
    outcome.email = send.sent ? "sent" : send.reason === "disabled" ? "disabled" : "failed"
  } else {
    outcome.email = "skipped"
  }

  // 4) WhatsApp file send with caption + link; 3 attempts with backoff.
  const wantWhatsapp = input.whatsapp !== false && Boolean(input.phone)
  if (wantWhatsapp && input.phone) {
    const sessionKey = pickConnectedSession(container)
    if (sessionKey) {
      const waTo = toWaId(input.phone)
      const caption =
        `${brand}: ${label} for #${input.entityId}` + (shareUrl ? `\n${shareUrl}` : "")
      let sent = false
      for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
        try {
          const res = await sendDocumentFile(
            sessionKey,
            waTo,
            shareUrl ?? "", // gateway fetches by URL; signed link doubles as file source
            filename,
            caption
          )
          sent = res.success
        } catch (err: any) {
          console.error(`WhatsApp document attempt ${attempt} failed:`, err?.message ?? err)
        }
        if (!sent && attempt < 3) await sleep(600 * attempt)
      }
      outcome.whatsapp = sent ? "sent" : "failed"
    } else {
      outcome.whatsapp = "skipped"
    }
  } else {
    outcome.whatsapp = "skipped"
  }

  // 5) Audit trail on the immutable version (metadata only — content untouched).
  try {
    const docs = resolveDocumentService(container)
    await docs.updateDocumentVersions({
      id: result.version.id,
      metadata: {
        ...(result.version.metadata ?? {}),
        dispatch: {
          email: outcome.email,
          whatsapp: outcome.whatsapp,
          at: new Date().toISOString(),
        },
      },
    })
  } catch (err: any) {
    console.error("Dispatch audit write failed:", err?.message ?? err)
  }

  return outcome
}

/**
 * Order/payment pipeline hook (subscriber side). Reads doc_dispatch settings;
 * no-ops instantly when disabled. Never throws.
 */
export async function handleOrderDocDispatch(
  container: any,
  eventName: string,
  orderId: string,
  customerEmail?: string | null,
  customerPhone?: string | null
): Promise<void> {
  try {
    const settings: DocDispatchSettings | undefined = (await getStoreSettings(container))
      .doc_dispatch
    if (!settings?.enabled) return

    const eventKey =
      eventName === "order.placed"
        ? "order_placed"
        : eventName === "order.fulfillment_created"
          ? "order_shipped"
          : eventName === "payment.captured"
            ? "payment_captured"
            : eventName === "payment.refund.created"
              ? "payment_refunded"
              : null
    if (!eventKey) return

    const cfg = settings.events?.[eventKey]
    if (!cfg?.enabled || !cfg.kinds?.length) return

    for (const kind of cfg.kinds) {
      const outcome = await dispatchDocument(container, {
        kind,
        entityType: "order",
        entityId: orderId,
        toEmail: customerEmail ?? null,
        phone: cfg.whatsapp ? customerPhone ?? null : null,
        generatedBy: "pipeline",
      })
      console.log(
        `[document-dispatch] ${eventKey}/${kind} order=${orderId} →`,
        JSON.stringify(outcome)
      )
    }
  } catch (err: any) {
    console.error("[document-dispatch] handler failed:", err?.message ?? err)
  }
}
