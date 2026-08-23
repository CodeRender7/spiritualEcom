"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { fetchOrder } from "@/lib/api";
import type { Order, OrderItem } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    completed: "Completed",
    archived: "Archived",
    canceled: "Cancelled",
    requires_action: "Action Required",
  };
  return map[status] || status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function paymentLabel(order: Order): string {
  const provider = order.payment_collections?.[0]?.payment_sessions?.[0]?.provider_id || "";
  if (provider.includes("cod")) return "Cash on Delivery";
  if (provider.includes("razorpay")) return "Razorpay";
  return "Online";
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetchOrder(params.id)
      .then(setOrder)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load order."));
  }, [params.id]);

  if (error) {
    return (
      <main>
        <Navbar />
        <div className="container" style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>{error}</p>
          <Link href="/account" className="btn btn-primary">Back to My Orders</Link>
        </div>
        <Footer />
      </main>
    );
  }

  if (!order) {
    return (
      <main>
        <Navbar />
        <div className="container" style={{ textAlign: "center", padding: "60px 0" }}>
          <p className="text-muted">Loading order…</p>
        </div>
        <Footer />
      </main>
    );
  }

  const address = order.shipping_address;

  return (
    <main>
      <Navbar />
      <div className="container" style={{ padding: "32px 0 60px" }}>
        <BreadcrumbNav
          items={[
            { label: "My Account", href: "/account" },
            { label: `Order #${order.display_id}` },
          ]}
        />

        <div className="order-success-banner" style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "48px" }}>{order.status === "canceled" ? "❌" : "📦"}</div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "26px", margin: "12px 0 8px" }}>
            Order #{order.display_id} — {statusLabel(order.status)}
          </h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Placed on{" "}
            {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="order-status-pill">{paymentLabel(order)}</div>
        </div>

        <div className="cart-grid">
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Order Items</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px", background: "var(--bg-card)" }}>
              {order.items.map((item: OrderItem) => (
                <div key={item.id} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <img
                    src={item.thumbnail || undefined}
                    alt={item.title}
                    style={{ width: "48px", height: "48px", borderRadius: "6px", objectFit: "cover", background: "var(--bg-surface)" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="text-sm" style={{ fontWeight: "600" }}>{item.title}</div>
                    <div className="text-muted text-sm">Qty: {item.quantity}</div>
                  </div>
                  <div className="text-sm" style={{ fontWeight: "700" }}>{formatPrice(item.total)}</div>
                </div>
              ))}
            </div>

            {address && (
              <>
                <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 12px" }}>Delivery Address</h3>
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px", background: "var(--bg-card)", lineHeight: 1.6 }}>
                  <div style={{ fontWeight: "600" }}>
                    {[address.first_name, address.last_name].filter(Boolean).join(" ")}
                  </div>
                  <div className="text-muted">
                    {[address.address_1, address.address_2, address.city, address.province].filter(Boolean).join(", ")}{" "}
                    — {address.postal_code}
                  </div>
                  {address.phone && <div className="text-muted">{address.phone}</div>}
                </div>
              </>
            )}
          </div>

          <div className="cart-summary">
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Payment Summary</h3>
            <div className="cart-summary-row"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="cart-summary-row">
              <span>Shipping</span>
              <span>{order.shipping_total === 0 ? <strong style={{ color: "var(--emerald)" }}>FREE</strong> : formatPrice(order.shipping_total)}</span>
            </div>
            <div className="cart-summary-row cart-summary-total">
              <span>Total</span>
              <span style={{ color: "var(--primary)" }}>{formatPrice(order.total)}</span>
            </div>
            <div className="text-muted text-sm" style={{ marginTop: "12px" }}>
              Payment: <strong>{paymentLabel(order)}</strong>
            </div>
            <div className="text-muted text-sm" style={{ marginTop: "4px" }}>
              Fulfillment: <strong>{statusLabel(order.fulfillment_status || "not_fulfilled")}</strong>
            </div>

            <div style={{ marginTop: "20px", padding: "14px", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", border: "1px dashed var(--border)", fontSize: "14px" }}>
              📦 <strong>Estimated delivery:</strong> 3–5 business days
            </div>

            {/* Document downloads (document-builder D8) — real PDFs served by the backend. */}
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "10px" }}>Documents</h3>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <a
                  className="btn btn-secondary"
                  style={{ flex: 1, textAlign: "center", textDecoration: "none" }}
                  href={`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"}/store/orders/${params.id}/invoice`}
                  target="_blank"
                  rel="noreferrer"
                >
                  ⬇ Invoice (PDF)
                </a>
                <a
                  className="btn btn-secondary"
                  style={{ flex: 1, textAlign: "center", textDecoration: "none" }}
                  href={`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"}/store/orders/${params.id}/waybill`}
                  target="_blank"
                  rel="noreferrer"
                >
                  ⬇ Waybill (PDF)
                </a>
              </div>
              <div className="text-muted text-sm" style={{ marginTop: "6px" }}>
                Sign in with the account that placed this order to download.
              </div>
            </div>

            <Link href="/products" className="btn btn-primary" style={{ width: "100%", marginTop: "16px" }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}