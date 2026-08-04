"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

export default function CartPage() {
  const { items, subtotal, shipping, discount, total, updateQuantity, removeItem } = useCart();

  return (
    <main>
      <Navbar />
      <div className="container cart-page">
        <BreadcrumbNav items={[{ label: "Shopping Cart" }]} />

        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", marginBottom: "24px" }}>
          Your Devotional Cart ({items.length} items)
        </h2>

        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🛒</div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>Your cart is empty.</p>
            <Link href="/products" className="btn btn-primary">Browse Products</Link>
          </div>
        ) : (
          <div className="cart-grid">
            {/* Item List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {items.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-image">
                    <img src={item.thumbnail} alt={item.title} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>{item.title}</h4>
                      <div className="text-muted text-sm">{formatPrice(item.unitPrice)}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
                      <div className="quantity-selector">
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                        <span className="qty-value">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{ background: "none", border: "none", color: "#d64545", cursor: "pointer", fontSize: "14px" }}
                        >
                          Remove
                        </button>
                        <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
                          {formatPrice(item.unitPrice * item.quantity)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            <div className="cart-summary">
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Order Summary</h3>

              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <div className="cart-summary-row">
                <span>Shipping</span>
                <span>{shipping === 0 ? <strong style={{ color: "var(--emerald)" }}>FREE</strong> : formatPrice(shipping)}</span>
              </div>

              <div className="cart-summary-row">
                <span>Discount (DIVINE10)</span>
                <span style={{ color: "var(--emerald)" }}>-{formatPrice(discount)}</span>
              </div>

              <div className="cart-summary-row cart-summary-total">
                <span>Total Amount</span>
                <span style={{ color: "var(--primary)" }}>{formatPrice(total)}</span>
              </div>

              <Link href="/checkout" className="btn btn-primary btn-lg" style={{ width: "100%", textAlign: "center", marginTop: "24px" }}>
                Proceed to Secure Checkout →
              </Link>

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