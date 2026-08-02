"use client";

import Link from "next/link";
import { MOCK_COLLECTIONS } from "@/lib/medusa";
import { SearchBar } from "@/components/SearchBar";

export function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        {/* Brand Logo */}
        <Link href="/" className="navbar-logo">
          <span className="om-icon">🕉️</span>
          <span>DivineKart</span>
        </Link>

        {/* Mega Menu Category Dropdown Trigger */}
        <div className="mega-menu-trigger">
          <button className="nav-icon-btn">
            <span>Categories</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Flipkart / Amazon style Mega Menu Grid */}
          <div className="mega-menu">
            <div className="mega-menu-grid">
              {MOCK_COLLECTIONS.map((col) => (
                <Link key={col.id} href={`/collections/${col.handle}`} className="mega-menu-item">
                  <span className="mm-icon">{col.metadata?.icon || "🕉️"}</span>
                  <div>
                    <div className="mm-label">{col.title}</div>
                    <div className="mm-count">{col.metadata?.count || 10}+ Items</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar />

        {/* Actions (Wishlist, Cart, Account) */}
        <div className="nav-actions">
          <Link href="/products" className="nav-icon-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>All Products</span>
          </Link>

          <Link href="/cart" className="nav-icon-btn" style={{ position: "relative" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            <span>Cart</span>
            <span className="cart-badge">2</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
