import Link from "next/link";
import { MOCK_COLLECTIONS } from "@/lib/medusa";

export function CategoryCarousel() {
  return (
    <section className="category-section">
      <div className="container">
        <div className="category-scroll">
          {MOCK_COLLECTIONS.map((col) => (
            <Link key={col.id} href={`/collections/${col.handle}`} className="category-item">
              <div className="category-circle">
                <span>{col.metadata?.icon || "🛕"}</span>
              </div>
              <span className="category-name">{col.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
