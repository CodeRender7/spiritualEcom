import { AbstractPaymentProvider } from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { getStoreSettings } from "../../lib/settings"

/**
 * Hyperswitch provider options (static defaults from medusa-config.ts).
 * Authoritative per-provider config is read live from the store settings
 * (T6 `payments.hyperswitch`: key_id = API key, key_secret = webhook HMAC
 * secret, test_mode). base_url defaults to the self-hosted router on the
 * compose network; override with HYPER_BASE_URL for a remote/SaaS router.
 */
type Options = {
  api_key?: string
  merchant_id?: string
  test_mode?: boolean
  base_url?: string
}

type HyperConfig = {
  apiKey: string
  merchantId: string
  testMode: boolean
  baseUrl: string
}

const TEST_BASE_URL = process.env.HYPER_BASE_URL || "http://hyperswitch-router:8080"
const LIVE_BASE_URL = process.env.HYPER_LIVE_BASE_URL || "https://api.hyperswitch.io"

class HyperswitchProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "hyperswitch"

  constructor(container: any, options?: Options) {
    super(container, options)
  }

  /** Resolve effective config: store settings (T6) win over static options. */
  protected async resolveConfig(): Promise<HyperConfig> {
    let apiKey = this.config.api_key ?? ""
    let testMode = this.config.test_mode ?? true
    try {
      const settings = await getStoreSettings(this.container)
      const cfg = settings.payments?.hyperswitch
      if (cfg) {
        if (cfg.key_id) apiKey = cfg.key_id
        if (typeof cfg.test_mode === "boolean") testMode = cfg.test_mode
      }
    } catch {
      // settings unavailable (e.g. provider boot) → fall back to options
    }
    return {
      apiKey,
      merchantId: this.config.merchant_id ?? "divinekart",
      testMode,
      baseUrl: testMode ? TEST_BASE_URL : LIVE_BASE_URL,
    }
  }

  protected async request(path: string, method: string, body?: Record<string, unknown>) {
    const cfg = await this.resolveConfig()
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method,
      headers: {
        "api-key": cfg.apiKey,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(`Hyperswitch API error ${res.status}: ${text}`)
    }
    return text ? JSON.parse(text) : {}
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const cfg = await this.resolveConfig()
    if (!cfg.apiKey) {
      return {
        id: "hyper_error",
        data: { error: "Hyperswitch API key not configured (admin settings → payments → hyperswitch)" },
      }
    }
    try {
      const payment = (await this.request("/payments", "POST", {
        amount: Number(input.amount),
        currency: input.currency_code.toUpperCase(),
        merchant_id: cfg.merchantId,
        capture_method: "manual",
        authentication_type: "no_three_ds",
        email: input.context?.customer?.email ?? "",
        customer_id: input.context?.customer?.id ?? undefined,
        description: "DivineKart order",
      })) as { payment_id: string; client_secret: string; status?: string }
      return {
        id: payment.payment_id,
        data: { ...payment, error: undefined },
      }
    } catch (e) {
      return { id: "hyper_error", data: { error: (e as Error).message } }
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} }
  }

  /**
   * Confirm the payment with the test/dummy card. In production the storefront
   * would collect card data via the Hyperswitch Web SDK and the provider would
   * confirm with the resulting payment_method token; server-side test mode
   * confirms directly so the COD-style Medusa flow (initiate → authorize →
   * complete) works end-to-end against the self-hosted router.
   */
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const paymentId = (data.payment_id as string) ?? (data.id as string)
    if (!paymentId) {
      return { data: { ...data, error: "No payment_id to authorize" }, status: "pending" }
    }
    try {
      const confirmed = (await this.request(`/payments/${paymentId}/confirm`, "POST", {
        client_secret: data.client_secret,
        payment_method_data: {
          type: "card",
          card: {
            card_number: "4242424242424242",
            card_exp_month: "03",
            card_exp_year: "30",
            card_holder_name: "DivineKart Test",
            card_cvc: "737",
          },
        },
      })) as { status?: string; payment_id?: string; amount?: number }
      const status = confirmed.status
      return {
        data: { ...data, ...confirmed },
        status:
          status === "succeeded" ? "authorized" : status === "processing" ? "pending" : "requires_more",
      }
    } catch (e) {
      return { data: { ...data, error: (e as Error).message }, status: "requires_more" }
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const paymentId = (data.payment_id as string) ?? (data.id as string)
    if (!paymentId) return { status: "pending" }
    try {
      const payment = (await this.request(`/payments/${paymentId}`, "GET")) as { status?: string }
      return { status: payment.status === "succeeded" ? "authorized" : "pending" }
    } catch {
      return { status: "pending" }
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const paymentId = (data.payment_id as string) ?? (data.id as string)
    if (!paymentId) return { data }
    try {
      const captured = (await this.request(`/payments/${paymentId}/capture`, "POST", {
        amount: Number(data.amount ?? 0) || undefined,
      })) as Record<string, unknown>
      return { data: { ...data, ...captured } }
    } catch (e) {
      return { data: { ...data, error: (e as Error).message } }
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const paymentId = (data.payment_id as string) ?? (data.id as string)
    if (!paymentId) return data
    try {
      const payment = await this.request(`/payments/${paymentId}`, "GET")
      return { ...data, ...(payment as Record<string, unknown>) }
    } catch {
      return data
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const paymentId = (data.payment_id as string) ?? (data.id as string)
    if (!paymentId) return { data }
    try {
      const cancelled = (await this.request(`/payments/${paymentId}/cancel`, "POST", {})) as Record<
        string,
        unknown
      >
      return { data: { ...data, ...cancelled } }
    } catch (e) {
      return { data: { ...data, error: (e as Error).message } }
    }
  }

  /**
   * Refunds via POST /refunds (T16: /payments/{id}/refunds 404s on this image).
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const paymentId = (data.payment_id as string) ?? (data.id as string)
    if (!paymentId) return { data: { ...data, error: "No payment_id to refund" } }
    try {
      const refund = (await this.request("/refunds", "POST", {
        payment_id: paymentId,
        amount: Number(input.amount ?? data.amount ?? 0) || undefined,
      })) as Record<string, unknown>
      return { data: { ...data, refund } }
    } catch (e) {
      return { data: { ...data, error: (e as Error).message } }
    }
  }

  /**
   * payment_succeeded / payment_failed webhooks from the router → Medusa
   * /hooks/payment/* action. HMAC-SHA512 signature verification happens in the
   * hooks route (T32 step 4); here we map the event to a provider action.
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const event = payload?.data?.type as string | undefined
    const body = (payload?.data?.object ?? payload?.data) as Record<string, unknown> | undefined
    if (!event) return { action: "not_supported" }

    const paymentId = (body?.payment_id as string) ?? (body?.id as string)
    const base = {
      session_id: (body?.session_id as string) ?? "",
      amount: Number(body?.amount ?? 0),
    }

    switch (event) {
      case "payment_succeeded":
        return { action: "captured", data: base }
      case "payment_failed":
        return { action: "failed", data: base }
      case "refund_succeeded":
        return { action: "not_supported", data: base }
      default:
        return { action: "not_supported" }
    }
  }
}

export default HyperswitchProviderService