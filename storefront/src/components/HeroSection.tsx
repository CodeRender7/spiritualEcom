import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        {/* Left: Content in xalen.io hero style */}
        <div>
          <div className="fade-in">
            <span className="hero-badge">
              ✨ 100% Authentic • Sanctified & Blessed Essentials
            </span>
          </div>

          <h1 className="fade-in fade-in-delay-1">
            Sacred Art &amp; Spiritual Essentials <br />
            <span className="accent">for Every Devotee</span>
          </h1>

          <p className="hero-description fade-in fade-in-delay-2">
            Explore curated divine collection of handcrafted brass idols, 3D gold-foil photo frames, deity keyrings, temple banners, holographic stickers, and sacred clothing.
          </p>

          <div className="hero-cta-row fade-in fade-in-delay-3">
            <Link href="/products" className="btn btn-primary btn-lg">
              <span>Shop All Collection →</span>
            </Link>
            <Link href="/collections" className="btn btn-outline btn-lg">
              <span>Explore Categories</span>
            </Link>
          </div>

          <div className="hero-stats fade-in fade-in-delay-4">
            <div className="hero-stat">
              <div className="hero-stat-value">1,000+</div>
              <div className="hero-stat-label">Sacred Items</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">10+</div>
              <div className="hero-stat-label">Product Verticals</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">Pan-India</div>
              <div className="hero-stat-label">Express Delivery</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">4.9 ★</div>
              <div className="hero-stat-label">Customer Rating</div>
            </div>
          </div>
        </div>

        {/* Right: Decorative Visual Element */}
        <div className="hero-visual">
          <div className="hero-visual-glow">
            <div className="hero-visual-om">🕉️</div>
          </div>
        </div>
      </div>
    </section>
  );
}
