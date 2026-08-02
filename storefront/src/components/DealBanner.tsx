import { Product } from "@/lib/medusa";
import { ProductCard } from "./ProductCard";

interface DealBannerProps {
  products: Product[];
}

export function DealBanner({ products }: DealBannerProps) {
  return (
    <section className="deal-section">
      <div className="container">
        <div className="carousel-header" style={{ marginBottom: "24px" }}>
          <div>
            <span className="section-label">⚡ Limited Period Deal</span>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "4px" }}>
              <h2>Deal of the Day</h2>
              <div className="deal-timer">
                <div className="deal-time-block">08</div>
                <span className="deal-time-sep">:</span>
                <div className="deal-time-block">42</div>
                <span className="deal-time-sep">:</span>
                <div className="deal-time-block">19</div>
              </div>
            </div>
          </div>
        </div>

        <div className="carousel-scroll">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
