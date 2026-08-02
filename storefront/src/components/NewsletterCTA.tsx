"use client";

import { useState } from "react";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
    }
  };

  return (
    <section className="newsletter-section">
      <div className="container">
        <span className="section-label">Stay Connected</span>
        <h2>Receive Daily Shlokas &amp; Exclusive Festival Offers</h2>
        <p className="text-muted" style={{ maxWidth: "500px", margin: "12px auto 0" }}>
          Subscribe to our newsletter for auspicious puja muhurtas, festival alerts, and 10% off your first order.
        </p>

        {subscribed ? (
          <div style={{ color: "var(--emerald)", marginTop: "24px", fontWeight: "600" }}>
            ✓ Thank you for subscribing! May Lord Ganesha bless you.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="newsletter-form">
            <input
              type="email"
              placeholder="Enter your email address"
              className="newsletter-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
