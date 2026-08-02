import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { CategoryCarousel } from "@/components/CategoryCarousel";
import { DealBanner } from "@/components/DealBanner";
import { FeaturedCollections } from "@/components/FeaturedCollections";
import { ProductCarousel } from "@/components/ProductCarousel";
import { WhyShopWithUs } from "@/components/WhyShopWithUs";
import { Testimonials } from "@/components/Testimonials";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import { Footer } from "@/components/Footer";
import { fetchProducts } from "@/lib/medusa";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await fetchProducts();
  const trending = products.filter((p) => p.metadata?.is_trending || true).slice(0, 6);
  const deals = products.filter((p) => p.metadata?.is_deal || true).slice(0, 4);
  const newArrivals = products.slice(2, 8);

  return (
    <main>
      <AnnouncementBar />
      <Navbar />
      <HeroSection />
      <CategoryCarousel />
      <DealBanner products={deals} />
      <FeaturedCollections />
      <ProductCarousel title="Trending Devotional Items" subtitle="Most popular items chosen by devotees this week" products={trending} />
      <ProductCarousel title="New Arrivals" subtitle="Freshly crafted murtis, frames, and spiritual accessories" products={newArrivals} />
      <WhyShopWithUs />
      <Testimonials />
      <NewsletterCTA />
      <Footer />
    </main>
  );
}
