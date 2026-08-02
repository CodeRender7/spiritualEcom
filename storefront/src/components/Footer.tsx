import Link from "next/link";
import { MOCK_COLLECTIONS } from "@/lib/medusa";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Col 1: About */}
          <div className="footer-col">
            <h4 style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🕉️</span> DivineKart
            </h4>
            <p className="text-muted text-sm" style={{ marginBottom: "16px", lineHeight: "1.6" }}>
              India's premier online store for authentic Hindu spiritual items, deity keyrings, framed photo art, saffron flags, and sacred idols.
            </p>
          </div>

          {/* Col 2: Categories */}
          <div className="footer-col">
            <h4>Shop Categories</h4>
            {MOCK_COLLECTIONS.slice(0, 6).map((c) => (
              <Link key={c.id} href={`/collections/${c.handle}`}>
                {c.title}
              </Link>
            ))}
          </div>

          {/* Col 3: Customer Service */}
          <div className="footer-col">
            <h4>Customer Service</h4>
            <Link href="/products">Track Your Order</Link>
            <Link href="/products">Shipping &amp; Delivery</Link>
            <Link href="/products">Return &amp; Refund Policy</Link>
            <Link href="/products">Frequently Asked Questions</Link>
            <Link href="/products">Bulk Puja Orders</Link>
          </div>

          {/* Col 4: Contact & Social */}
          <div className="footer-col">
            <h4>Get In Touch</h4>
            <p className="text-muted text-sm" style={{ marginBottom: "8px" }}>
              📧 support@divinekart.com
            </p>
            <p className="text-muted text-sm" style={{ marginBottom: "16px" }}>
              📞 +91 (800) 108-9999 (Mon-Sat, 9am-7pm)
            </p>
            <div className="payment-icons">
              <span className="payment-icon">UPI</span>
              <span className="payment-icon">RuPay</span>
              <span className="payment-icon">Visa</span>
              <span className="payment-icon">Mastercard</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© 2026 DivineKart Technologies Pvt. Ltd. All rights reserved.</div>
          <div>Made with ❤️ for Devotees Worldwide</div>
        </div>
      </div>
    </footer>
  );
}
