import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { fetchCollections } from "@/lib/medusa";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const collections = await fetchCollections();

  return (
    <main>
      <Navbar />
      <div className="container" style={{ paddingBottom: "60px" }}>
        <BreadcrumbNav items={[{ label: "Collections" }]} />

        <div className="section-header" style={{ textAlign: "left", marginBottom: "32px" }}>
          <h2>All Devotional Collections ({collections.length})</h2>
          <p className="text-muted text-sm">Explore category verticals of Hindu spiritual essentials</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {collections.map((col) => (
            <Link key={col.id} href={`/collections/${col.handle}`} className="bento-card" style={{ height: "200px" }}>
              <div
                className="bento-card-bg"
                style={{
                  background: "linear-gradient(135deg, #1A1A2E, #2A2A45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "48px",
                }}
              >
                {col.metadata?.icon || "🕉️"}
              </div>
              <div className="bento-card-overlay">
                <div className="bento-card-title">{col.title}</div>
                <div className="bento-card-count">Explore Collection →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
