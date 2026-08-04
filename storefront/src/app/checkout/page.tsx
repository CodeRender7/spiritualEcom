"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";

type Address = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address_1: string;
  address_2?: string;
  city: string;
  province: string;
  postal_code: string;
  country_code: string;
};

const EMPTY_ADDRESS: Address = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  address_1: "",
  address_2: "",
  city: "",
  province: "",
  postal_code: "",
  country_code: "in",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, shipping, discount, total, clearCart } = useCart();
  const [step, setStep] = useState<1 | 2>(1);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("cod");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof Address, value: string) =>
    setAddress((prev) => ({ ...prev, [field]: value }));

  const isAddressValid = () =>
    address.first_name.trim() &&
    address.last_name.trim() &&
    address.phone.trim() &&
    address.email.trim() &&
    address.address_1.trim() &&
    address.city.trim() &&
    address.province.trim() &&
    address.postal_code.trim();

  const handlePlaceOrder = () => {
    setPlacing(true);
    setError(null);
    try {
      const orderId = `DK-${Date.now().toString(36).toUpperCase()}`;
      const placedOrder = {
        id: orderId,
        items,
        subtotal,
        shipping,
        discount,
        total,
        payment_method: paymentMethod,
        address,
        status: paymentMethod === "cod" ? "confirmed" : "pending_payment",
        created_at: new Date().toISOString(),
      };
      localStorage.setItem("divinekart_last_order", JSON.stringify(placedOrder));
      clearCart();
      router.push(`/order-confirmation?id=${orderId}`);
    } catch (e) {
      setError((e as Error).message || "Something went wrong placing your order.");
      setPlacing(false);
    }
  };

  return (
    <main>
      <Navbar />
      <div className="container checkout-page">
        <BreadcrumbNav items={[{ label: "Checkout" }]} />

        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", marginBottom: "24px" }}>
          Secure Checkout
        </h2>

        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>Your cart is empty — add some devotional items first.</p>
            <a href="/products" className="btn btn-primary">Browse Products</a>
          </div>
        ) : (
          <div className="cart-grid">
            <div>
              {/* Step indicator */}
              <div className="checkout-steps">
                <div className={`checkout-step ${step === 1 ? "active" : "done"}`}>
                  <span className="checkout-step-num">{step === 1 ? "1" : "✓"}</span>
                  <span>Address</span>
                </div>
                <div className="checkout-step-line" />
                <div className={`checkout-step ${step === 2 ? "active" : ""}`}>
                  <span className="checkout-step-num">2</span>
                  <span>Payment</span>
                </div>
              </div>

              {step === 1 ? (
                <form
                  className="checkout-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!isAddressValid()) {
                      setError("Please fill in all required address fields.");
                      return;
                    }
                    setError(null);
                    setStep(2);
                  }}
                >
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input value={address.first_name} onChange={(e) => update("first_name", e.target.value)} placeholder="Ram" />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input value={address.last_name} onChange={(e) => update("last_name", e.target.value)} placeholder="Sharma" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone *</label>
                      <input value={address.phone} onChange={(e) => update("phone", e.target.value)} placeholder="98765 43210" inputMode="tel" />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input type="email" value={address.email} onChange={(e) => update("email", e.target.value)} placeholder="ram@example.com" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Address Line 1 *</label>
                    <input value={address.address_1} onChange={(e) => update("address_1", e.target.value)} placeholder="Flat / House no., Street, Area" />
                  </div>
                  <div className="form-group">
                    <label>Address Line 2</label>
                    <input value={address.address_2} onChange={(e) => update("address_2", e.target.value)} placeholder="Landmark (optional)" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>City *</label>
                      <input value={address.city} onChange={(e) => update("city", e.target.value)} placeholder="Vrindavan" />
                    </div>
                    <div className="form-group">
                      <label>State *</label>
                      <input value={address.province} onChange={(e) => update("province", e.target.value)} placeholder="Uttar Pradesh" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>PIN Code *</label>
                      <input value={address.postal_code} onChange={(e) => update("postal_code", e.target.value)} placeholder="281121" inputMode="numeric" />
                    </div>
                    <div className="form-group">
                      <label>Country</label>
                      <select value={address.country_code} onChange={(e) => update("country_code", e.target.value)}>
                        <option value="in">India 🇮🇳</option>
                      </select>
                    </div>
                  </div>

                  {error && <div className="form-error">{error}</div>}

                  <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "20px" }}>
                    Continue to Payment →
                  </button>
                </form>
              ) : (
                <div>
                  <div className="checkout-address-review">
                    <strong>Delivering to:</strong>
                    <span>{address.first_name} {address.last_name}</span>
                    <span>{address.address_1}{address.address_2 ? `, ${address.address_2}` : ""}, {address.city}, {address.province} — {address.postal_code}</span>
                    <span>{address.phone} • {address.email}</span>
                    <button className="text-link" onClick={() => setStep(1)}>Change</button>
                  </div>

                  <div className="payment-options">
                    <button
                      className={`payment-option ${paymentMethod === "cod" ? "selected" : ""}`}
                      onClick={() => setPaymentMethod("cod")}
                    >
                      <span className="payment-option-icon">💵</span>
                      <div>
                        <strong>Cash on Delivery</strong>
                        <div className="text-muted text-sm">Pay in cash when your order arrives</div>
                      </div>
                    </button>
                    <button
                      className={`payment-option ${paymentMethod === "razorpay" ? "selected" : ""}`}
                      onClick={() => setPaymentMethod("razorpay")}
                    >
                      <span className="payment-option-icon">💳</span>
                      <div>
                        <strong>Razorpay (UPI / Cards / NetBanking)</strong>
                        <div className="text-muted text-sm">Secure online payment via Razorpay</div>
                      </div>
                    </button>
                  </div>

                  {error && <div className="form-error">{error}</div>}

                  <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                    <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                    <button
                      className="btn btn-primary btn-lg"
                      style={{ flex: 1 }}
                      onClick={handlePlaceOrder}
                      disabled={placing}
                    >
                      {placing
                        ? "Placing order…"
                        : paymentMethod === "cod"
                          ? `Place Order • ${formatPrice(total)}`
                          : "Pay Securely →"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="cart-summary">
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Order Summary</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                {items.map((item) => (
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
              <div className="cart-summary-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="cart-summary-row">
                <span>Shipping</span>
                <span>{shipping === 0 ? <strong style={{ color: "var(--emerald)" }}>FREE</strong> : formatPrice(shipping)}</span>
              </div>
              {discount > 0 && (
                <div className="cart-summary-row"><span>Discount (DIVINE10)</span><span style={{ color: "var(--emerald)" }}>-{formatPrice(discount)}</span></div>
              )}
              <div className="cart-summary-row cart-summary-total">
                <span>Total Amount</span>
                <span style={{ color: "var(--primary)" }}>{formatPrice(total)}</span>
              </div>
              <div className="text-muted text-sm" style={{ textAlign: "center", marginTop: "16px" }}>
                🔒 256-bit Encrypted Checkout • UPI / COD Available
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}