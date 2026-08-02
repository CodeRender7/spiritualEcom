import Link from "next/link";
import { Product } from "@/lib/medusa";
import { ProductCard } from "./ProductCard";

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllLink?: string;
}

export function ProductCarousel({ title, subtitle, products, viewAllLink = "/products" }: ProductCarouselProps) {
  return (
    <section className="carousel-section">
      <div className="container">
        <div className="carousel-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
          </div>
          <Link href={viewAllLink} className="view-all">
            View All →
          </Link>
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
