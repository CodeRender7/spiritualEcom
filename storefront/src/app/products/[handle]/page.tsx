import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { StarRating } from "@/components/StarRating";
import { PriceDisplay } from "@/components/PriceDisplay";
import { fetchProductByHandle, fetchProducts } from "@/lib/medusa";
import { ProductCarousel } from "@/components/ProductCarousel";
import { notFound } from "next/navigation";

interface Props {
  params: { handle: string };
}

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: Props) {
  const product = await fetchProductByHandle(params.handle);
  const allProducts = await fetchProducts();
  const related = allProducts.filter((p) => p.id !== product?.id).slice(0, 4);

  if (!product) {
    notFound();
  }

  const price = product.variants?.[0]?.prices?.[0]?.amount || 499;
  const mrp = product.metadata?.mrp || Math.round(price * 1.5);

  return (
    <main>
      <Navbar />
      <div className="container" style={{ paddingBottom: "60px" }}>
        <BreadcrumbNav
          items={[
            { label: "Products", href: "/products" },
            { label: product.title }
          ]}
        />

        <div className="product-detail-grid">
          {/* Gallery */}
          <div className="product-gallery">
            <div className="product-main-image">
              <img src={product.thumbnail || product.images?.[0]?.url} alt={product.title} />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="product-thumbnails">
                {product.images.map((img, i) => (
                  <div key={img.id} className={`product-thumb ${i === 0 ? "active" : ""}`}>
                    <img src={img.url} alt={`Thumbnail ${i}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="product-info">
            <span className="section-label" style={{ margin: 0 }}>
              {product.collection?.title || "Spiritual Item"}
            </span>

            <h1>{product.title}</h1>

            <StarRating rating={product.metadata?.rating || 4.8} count={product.metadata?.rating_count || 56} />

            <PriceDisplay price={price} mrp={mrp} />

            <p style={{ color: "var(--text-secondary)", fontSize: "15px", lineHeight: "1.7" }}>
              {product.description || "Authentic spiritual product handcrafted with utmost devotion and traditional quality."}
            </p>

            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }}>
                Add to Cart
              </button>
              <button className="btn btn-outline btn-lg">
                Buy Now
              </button>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px", marginTop: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                <div>🚚 <strong>Free Delivery</strong> on orders over ₹499</div>
                <div>🔄 <strong>7 Days Return</strong> hassle-free policy</div>
                <div>🛡️ <strong>Sanctified &amp; Safe</strong> transit packaging</div>
                <div>💳 <strong>COD Available</strong> &amp; Secure UPI</div>
              </div>
            </div>
          </div>
        </div>

        <ProductCarousel title="You Might Also Like" subtitle="Related spiritual items" products={related} />
      </div>
      <Footer />
    </main>
  );
}
