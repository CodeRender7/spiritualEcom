export function Testimonials() {
  const reviews = [
    {
      name: "Ramesh Sharma",
      role: "Verified Buyer, Varanasi",
      text: "The brass Ganesha idol quality exceeded my expectations. Heavy, beautifully detailed, and perfectly packed. Will buy again for Diwali gifts!",
      stars: 5
    },
    {
      name: "Priya Patel",
      role: "Verified Buyer, Ahmedabad",
      text: "Ordered the holographic Ram Lalla stickers for our family cars. Fast delivery and high-definition finish. Very auspicious!",
      stars: 5
    },
    {
      name: "Sunil Kumar",
      role: "Verified Buyer, Jaipur",
      text: "The saffron temple flags and Pitambari silk shawls were top quality. Authentic feel for our housewarming puja.",
      stars: 5
    }
  ];

  return (
    <section className="testimonials-section">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Devotee Reviews</span>
          <h2>Loved by 50,000+ Customers</h2>
        </div>

        <div className="testimonial-grid">
          {reviews.map((r, i) => (
            <div key={i} className="testimonial-card">
              <div className="testimonial-stars">
                {[...Array(r.stars)].map((_, s) => (
                  <span key={s}>★</span>
                ))}
              </div>
              <p className="testimonial-text">"{r.text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{r.name.charAt(0)}</div>
                <div>
                  <div className="testimonial-name">{r.name}</div>
                  <div className="testimonial-role">{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
