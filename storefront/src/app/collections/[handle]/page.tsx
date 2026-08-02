import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { ProductCard } from "@/components/ProductCard";
import { fetchProducts, fetchCollections } from "@/lib/medusa";
import { notFound } from "next/navigation";

interface Props {
  params: { handle: string };
}

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({ params }: Props) {
  const collections = await fetchCollections();
  const collection = collections.find((c) => c.handle === params.handle);
  const products = await fetchProducts();
  const filteredProducts = products.filter(
    (p) => p.collection_id === collection?.id || p.collection?.handle === params.handle || true
  );

  if (!collection) {
    notFound();
  }

  return (
    <main>
      <Navbar />
      <div className="container" style={{ paddingBottom: "60px" }}>
        <BreadcrumbNav
          items={[
            { label: "Collections", href: "/collections" },
            { label: collection.title }
          ]}
        />

        <div className="section-header" style={{ textAlign: "left", marginBottom: "32px" }}>
          <span className="section-label">Category Vertical</span>
          <h2>{collection.title}</h2>
          <p className="text-muted text-sm">Sacred items in {collection.title} category</p>
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
