import Link from "next/link";
import { MOCK_COLLECTIONS } from "@/lib/medusa";

export function FeaturedCollections() {
  const featured = MOCK_COLLECTIONS.slice(0, 4);

  return (
    <section className="carousel-section">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Curated Sacred Collections</span>
          <h2>Explore Popular Verticals</h2>
          <p>Handcrafted spiritual essentials for your home altar, mandirs, and daily devotion.</p>
        </div>

        <div className="bento-grid">
          {featured.map((col, idx) => (
            <Link key={col.id} href={`/collections/${col.handle}`} className="bento-card">
              <img
                src={
                  idx === 0
                    ? "https://images.unsplash.com/photo-1567591416348-18e3c3b01859?w=800&auto=format&fit=crop&q=80"
                    : idx === 1
                    ? "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80"
                    : idx === 2
                    ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"
                    : "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&auto=format&fit=crop&q=80"
                }
                alt={col.title}
                className="bento-card-bg"
              />
              <div className="bento-card-overlay">
                <div className="bento-card-title">{col.title}</div>
                <div className="bento-card-count">{col.metadata?.count || 12}+ Items Available →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
