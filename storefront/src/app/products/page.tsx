import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { ProductCard } from "@/components/ProductCard";
import { fetchProducts, fetchCollections } from "@/lib/medusa";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams?: { q?: string } }) {
  const q = searchParams?.q?.trim() || "";
  const all = await fetchProducts();
  const collections = await fetchCollections();
  const products = q
    ? all.filter((p) =>
        `${p.title} ${p.description ?? ""} ${p.collection?.title ?? ""} ${p.metadata?.icon ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
    : all;

  return (
    <main>
      <Navbar />
      <div className="container" style={{ paddingBottom: "60px" }}>
        <BreadcrumbNav items={[{ label: q ? `Search: ${q}` : "All Products" }]} />

        <div className="section-header" style={{ textTransform: "none", textAlign: "left", marginBottom: "24px" }}>
          <h2>{q ? `Results for "${q}"` : "All Sacred &amp; Devotional Items"} ({products.length})</h2>
          <p className="text-muted text-sm">
            {q
              ? `Products matching "${q}".`
              : "Browse our full range of handcrafted idols, gold photo frames, keyrings, stickers, and spiritual essentials."}
          </p>
        </div>

        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-muted" style={{ textAlign: "center", padding: "40px 0" }}>
            No products found{` ${q ? `for "${q}"` : ""}`}. Try a different search.
          </p>
        )}
      </div>
      <Footer />
    </main>
  );
}
