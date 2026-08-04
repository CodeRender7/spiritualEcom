"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { formatPrice } from "@/lib/utils";

type PlacedOrder = {
  id: string;
  items: Array<{ id: string; title: string; thumbnail?: string; unitPrice: number; quantity: number }>;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  payment_method: "cod" | "razorpay";
  status: string;
  address: {
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
    province: string;
    postal_code: string;
    phone: string;
    email: string;
  };
  created_at: string;
};

function OrderConfirmationInner() {
  const params = useSearchParams();
  const orderId = params.get("id");
  const [order, setOrder] = useState<PlacedOrder | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("divinekart_last_order");
      if (raw) setOrder(JSON.parse(raw) as PlacedOrder);
    } catch {
      // ignore
    }
  }, []);

  return (
    <main>
      <Navbar />
      <div className="container order-confirmation">
        <BreadcrumbNav items={[{ label: "Order Confirmation" }]} />

        {order ? (
          <>
            <div className="order-success-banner">
              <div style={{ fontSize: "56px" }}>🙏</div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", margin: "12px 0 8px" }}>
                Thank you! Your order is confirmed
              </h2>
              <p style={{ color: "var(--text-secondary)" }}>
                Order <strong style={{ color: "var(--primary)" }}>#{order.id}</strong> •{" "}
                {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <div className="order-status-pill">
                {order.payment_method === "cod" ? "Pay on delivery" : "Razorpay payment pending"}
              </div>
            </div>

            <div className="cart-grid" style={{ marginTop: "24px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Order Items</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px", background: "var(--bg-card)" }}>
                  {order.items.map((item) => (
                    <div key={item.id} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <img src={item.thumbnail} alt={item.title} style={{ width: "48px", height: "48px", borderRadius: "6px", objectFit: "cover" }} />
                      <div style={{ flex: 1 }}>
                        <div className="text-sm" style={{ fontWeight: "600" }}>{item.title}</div>
                        <div className="text-muted text-sm">Qty: {item.quantity}</div>
                      </div>
                      <div className="text-sm" style={{ fontWeight: "700" }}>{formatPrice(item.unitPrice * item.quantity)}</div>
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 12px" }}>Delivery Address</h3>
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px", background: "var(--bg-card)", lineHeight: 1.6 }}>
                  <div style={{ fontWeight: "600" }}>{order.address.first_name} {order.address.last_name}</div>
                  <div className="text-muted">{order.address.address_1}, {order.address.city}, {order.address.province} — {order.address.postal_code}</div>
                  <div className="text-muted">{order.address.phone}</div>
                </div>

                <div style={{ marginTop: "24px", padding: "16px", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", border: "1px dashed var(--border)", fontSize: "14px" }}>
                  📦 <strong>Estimated delivery:</strong> 3–5 business days (ships within 24 hrs)
                </div>
              </div>

              <div className="cart-summary">
                <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Payment Summary</h3>
                <div className="cart-summary-row"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className="cart-summary-row">
                  <span>Shipping</span>
                  <span>{order.shipping === 0 ? <strong style={{ color: "var(--emerald)" }}>FREE</strong> : formatPrice(order.shipping)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="cart-summary-row"><span>Discount</span><span style={{ color: "var(--emerald)" }}>-{formatPrice(order.discount)}</span></div>
                )}
                <div className="cart-summary-row cart-summary-total">
                  <span>Total</span>
                  <span style={{ color: "var(--primary)" }}>{formatPrice(order.total)}</span>
                </div>
                <div className="text-muted text-sm" style={{ marginTop: "12px" }}>
                  Payment: <strong>{order.payment_method === "cod" ? "Cash on Delivery" : "Razorpay"}</strong>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "32px" }}>
              <a href="/products" className="btn btn-primary">Continue Shopping</a>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>No recent order found.</p>
            <a href="/products" className="btn btn-primary">Browse Products</a>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div style={{ padding: "60px", textAlign: "center" }}>Loading order…</div>}>
      <OrderConfirmationInner />
    </Suspense>
  );
}