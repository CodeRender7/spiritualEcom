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

type Options = {
  key_id: string
  key_secret: string
}

class RazorpayProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "razorpay"

  protected options_: Options
  protected baseUrl = "https://api.razorpay.com/v1"

  constructor(container: any, options?: Options) {
    super(container, options)
    this.options_ = options ?? ({} as Options)
  }

  async request(path: string, method: string, body?: Record<string, unknown>) {
    const auth = Buffer.from(
      `${this.options_.key_id}:${this.options_.key_secret}`
    ).toString("base64")
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Razorpay API error ${res.status}: ${text}`)
    }
    return res.json()
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const data: Record<string, unknown> = {}
    try {
      const order = (await this.request("/orders", "POST", {
        amount: Number(input.amount),
        currency: input.currency_code.toUpperCase(),
        receipt: (input.context?.customer?.email as string) ?? undefined,
        notes: {
          consumer: (input.context?.customer?.email as string) ?? "",
        },
      })) as { id: string }
      data.id = order.id
      data.order = order
    } catch (e) {
      return {
        id: "rzp_error",
        data: { error: (e as Error).message },
      }
    }
    return {
      id: data.id as string,
      data,
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    return {
      data: input.data ?? {},
      status: "authorized",
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    return { status: "authorized" }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const paymentId = (input.data as Record<string, unknown>)?.payment_id
    if (paymentId) {
      try {
        const payment = await this.request(`/payments/${paymentId}`, "GET")
        return { data: { ...(input.data ?? {}), payment } }
      } catch (e) {
        return { data: { ...(input.data ?? {}), error: (e as Error).message } }
      }
    }
    return { data: input.data ?? {} }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return input.data ?? {}
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return { data: input.data ?? {} }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: "not_supported" }
  }
}

export default RazorpayProviderService