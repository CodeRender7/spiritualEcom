export function WhyShopWithUs() {
  const features = [
    {
      num: "01",
      title: "Authentic & Sanctified",
      desc: "Every idol, photo frame, and stationery item is crafted with traditional precision and sacred reverence."
    },
    {
      num: "02",
      title: "Pan-India Express Shipping",
      desc: "Fast, safe, and secure packaging ensures your spiritual items arrive at your doorstep in perfect condition."
    },
    {
      num: "03",
      title: "Trusted Devotee Community",
      desc: "Over 50,000+ satisfied devotees across India trust DivineKart for their mandir and puja room needs."
    },
    {
      num: "04",
      title: "Hassle-Free Returns",
      desc: "Easy 7-day return policy for replacement or refund if any item is damaged during transit."
    }
  ];

  return (
    <section className="why-section">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Why Devotees Choose Us</span>
          <h2>Built for Devotion, Crafted for Quality</h2>
        </div>

        <div className="why-grid">
          {features.map((f) => (
            <div key={f.num} className="why-card">
              <div className="why-number">{f.num}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
