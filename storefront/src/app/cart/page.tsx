import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { MOCK_PRODUCTS } from "@/lib/medusa";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

export default function CartPage() {
  const cartItems = MOCK_PRODUCTS.slice(0, 2);
  const subtotal = cartItems.reduce((acc, item) => acc + (item.variants?.[0]?.prices?.[0]?.amount || 499), 0);
  const shipping = subtotal > 499 ? 0 : 49;
  const total = subtotal + shipping;

  return (
    <main>
      <Navbar />
      <div className="container cart-page">
        <BreadcrumbNav items={[{ label: "Shopping Cart" }]} />

        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", marginBottom: "24px" }}>
          Your Devotional Cart ({cartItems.length} items)
        </h2>

        <div className="cart-grid">
          {/* Item List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {cartItems.map((item) => {
              const price = item.variants?.[0]?.prices?.[0]?.amount || 499;
              return (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-image">
                    <img src={item.thumbnail} alt={item.title} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>{item.title}</h4>
                      <div className="text-muted text-sm">{item.collection?.title}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
                      <div className="quantity-selector">
                        <button className="qty-btn">-</button>
                        <span className="qty-value">1</span>
                        <button className="qty-btn">+</button>
                      </div>

                      <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
                        {formatPrice(price)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
              <span style={{ color: "var(--emerald)" }}>-₹100</span>
            </div>

            <div className="cart-summary-row cart-summary-total">
              <span>Total Amount</span>
              <span style={{ color: "var(--primary)" }}>{formatPrice(total - 100)}</span>
            </div>

            <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "24px" }}>
              Proceed to Secure Checkout →
            </button>

            <div className="text-muted text-sm" style={{ textAlign: "center", marginTop: "16px" }}>
              🔒 256-bit Encrypted Checkout • UPI / COD Available
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
