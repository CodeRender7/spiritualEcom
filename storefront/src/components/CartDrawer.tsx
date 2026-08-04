"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const { items, count, subtotal, shipping, discount, total, isOpen, closeCart, removeItem, updateQuantity } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={closeCart} />
      <aside className="cart-drawer" aria-label="Shopping cart">
        <div className="cart-drawer-header">
          <h3>Your Cart ({count} items)</h3>
          <button className="qty-btn" onClick={closeCart} aria-label="Close cart">✕</button>
        </div>

        <div className="cart-drawer-body">
          {items.length === 0 ? (
            <div className="cart-drawer-empty">
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>🛒</div>
              <p>Your cart is empty</p>
              <Link href="/products" className="btn btn-primary" onClick={closeCart}>
                Browse Products
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="cart-drawer-item">
                <img src={item.thumbnail} alt={item.title} />
                <div className="cart-drawer-item-info">
                  <div className="text-sm" style={{ fontWeight: "600", lineHeight: 1.3 }}>{item.title}</div>
                  <div className="text-muted text-sm">{formatPrice(item.unitPrice)}</div>
                  <div className="quantity-selector" style={{ marginTop: "8px" }}>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                    <span className="qty-value">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <button
                  className="cart-drawer-remove"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.title}`}
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="cart-summary-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? <strong style={{ color: "var(--emerald)" }}>FREE</strong> : formatPrice(shipping)}</span>
            </div>
            {discount > 0 && (
              <div className="cart-summary-row">
                <span>Discount (DIVINE10)</span>
                <span style={{ color: "var(--emerald)" }}>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="cart-summary-row cart-summary-total">
              <span>Total</span>
              <span style={{ color: "var(--primary)" }}>{formatPrice(total)}</span>
            </div>
            <Link href="/checkout" className="btn btn-primary btn-lg" style={{ width: "100%", textAlign: "center", marginTop: "16px" }}>
              Proceed to Secure Checkout →
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}