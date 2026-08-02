interface StarRatingProps {
  rating?: number;
  count?: number;
}

export function StarRating({ rating = 4.8, count }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="product-rating">
      <div className="stars">
        {[...Array(5)].map((_, i) => (
          <span key={i}>
            {i < fullStars ? "★" : i === fullStars && hasHalfStar ? "½" : "☆"}
          </span>
        ))}
      </div>
      <span className="rating-count">
        {rating.toFixed(1)} {count ? `(${count})` : ""}
      </span>
    </div>
  );
}
