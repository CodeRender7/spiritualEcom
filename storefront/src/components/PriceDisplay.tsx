import { formatPrice, getDiscountPercentage } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  mrp?: number;
}

export function PriceDisplay({ price, mrp }: PriceDisplayProps) {
  const discountPct = getDiscountPercentage(price, mrp);

  return (
    <div className="product-price-row">
      <span className="product-price">{formatPrice(price)}</span>
      {mrp && mrp > price && (
        <>
          <span className="product-mrp">{formatPrice(mrp)}</span>
          <span className="product-discount-text">{discountPct}% OFF</span>
        </>
      )}
    </div>
  );
}
