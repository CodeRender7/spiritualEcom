import Link from "next/link";
import { Product } from "@/lib/medusa";
import { StarRating } from "./StarRating";
import { PriceDisplay } from "./PriceDisplay";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const price = product.variants?.[0]?.prices?.[0]?.amount || 499;
  const mrp = product.metadata?.mrp || Math.round(price * 1.5);
  const rating = product.metadata?.rating || 4.8;
  const ratingCount = product.metadata?.rating_count || 42;

  return (
    <div className="product-card">
      <div className="product-card-image">
        {product.thumbnail && (
          <img src={product.thumbnail} alt={product.title} loading="lazy" />
        )}
        {product.metadata?.discount_pct && (
          <span className="product-discount-badge">{product.metadata.discount_pct}% OFF</span>
        )}
        <button className="product-wishlist" aria-label="Add to wishlist">
          ♥
        </button>
      </div>

      <div className="product-card-body">
        <Link href={`/products/${product.handle}`} className="product-card-title">
          {product.title}
        </Link>

        <StarRating rating={rating} count={ratingCount} />

        <PriceDisplay price={price} mrp={mrp} />

        <button className="product-add-btn">
          Add to Cart
        </button>
      </div>
    </div>
  );
}
