"use client";

import { useEffect, useState } from "react";
import { StoreSettings, fetchStoreSettings } from "@/lib/medusa";
import { StarRating } from "@/components/StarRating";

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
}

const SAMPLE_REVIEWS: Review[] = [
  {
    id: "r1",
    name: "Ravi S.",
    rating: 5,
    comment: "Beautifully crafted, arrived safely packed. Truly adds a divine touch to our home puja.",
    date: "2026-07-14",
  },
  {
    id: "r2",
    name: "Anita M.",
    rating: 4,
    comment: "Good quality and fast delivery. Very satisfied with the purchase.",
    date: "2026-07-02",
  },
];

const STORAGE_KEY = "divinekart_reviews";

export function ReviewsSection() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [reviews, setReviews] = useState<Review[]>(SAMPLE_REVIEWS);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchStoreSettings().then(setSettings);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setReviews(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const enabled = settings?.reviews?.enabled ?? true;
  const requireName = !(settings?.reviews?.allow_anonymous ?? true);

  if (!enabled) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Review = {
      id: `r_${Date.now()}`,
      name: name.trim() || "Anonymous",
      rating,
      comment: comment.trim(),
      date: new Date().toISOString().slice(0, 10),
    };
    const all = [next, ...reviews];
    setReviews(all);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // ignore
    }
    setName("");
    setComment("");
    setRating(5);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  }

  return (
    <section className="reviews-section" style={{ marginTop: "48px" }}>
      <h2 style={{ fontSize: "22px", marginBottom: "20px" }}>Customer Reviews</h2>

      {reviews.length > 0 && (
        <div style={{ display: "grid", gap: "16px", marginBottom: "28px" }}>
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "16px",
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <StarRating rating={r.rating} />
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{r.date}</span>
              </div>
              <div style={{ marginTop: "8px", fontWeight: 600 }}>{r.name}</div>
              <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6" }}>
                {r.comment}
              </p>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={submit}
        style={{
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "20px",
          background: "#fafafa",
        }}
      >
        <label style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>Write a Review</label>

        <div style={{ display: "flex", gap: "4px", marginBottom: "12px", fontSize: "22px" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: n <= rating ? "#F59E0B" : "#d1d5db",
                fontSize: "22px",
              }}
              aria-label={`${n} stars`}
            >
              ★
            </button>
          ))}
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required={requireName}
          placeholder={requireName ? "Your name *" : "Your name (optional)"}
          style={inputStyle}
        />

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          placeholder="Share your experience with this product..."
          rows={3}
          style={{ ...inputStyle, marginTop: "10px" }}
        />

        <button type="submit" className="btn btn-primary" style={{ marginTop: "14px" }}>
          Submit Review
        </button>

        {submitted && (
          <span style={{ color: "#16a34a", marginLeft: "12px", fontSize: "14px" }}>Thanks for your feedback!</span>
        )}
      </form>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "14px",
  fontFamily: "inherit",
};