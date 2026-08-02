"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { searchProducts } from "@/lib/medusa";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/medusa";

const TRENDING_SUGGESTIONS = [
  "Ganesha Idol",
  "Shiva Keyring",
  "Ram Sticker",
  "Puja Stole",
  "Temple Flag",
  "Gita Diary",
];

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("divinekart:recent-searches") || "[]");
      if (Array.isArray(stored)) setRecents(stored.slice(0, 5));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const found = await searchProducts(term);
      if (!cancelled) {
        setResults(found.slice(0, 6));
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function saveRecent(term: string) {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recents.filter((r) => r !== t)].slice(0, 5);
    setRecents(next);
    try {
      localStorage.setItem("divinekart:recent-searches", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function submit(term: string) {
    if (!term.trim()) return;
    saveRecent(term);
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(term.trim())}`);
  }

  return (
    <div className="search-container" ref={boxRef}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <input
          type="text"
          className="search-input"
          placeholder="Search religious photos, idols, keyrings, dhwaja flags..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <button type="submit" className="search-btn" aria-label="Search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </form>

      {open && (
        <div className="search-dropdown">
          {query.trim() ? (
            loading ? (
              <div className="search-hint">Searching…</div>
            ) : results.length > 0 ? (
              <>
                <div className="search-group-label">Products</div>
                {results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.handle}`}
                    className="search-result"
                    onClick={() => {
                      saveRecent(p.title);
                      setOpen(false);
                    }}
                  >
                    {p.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail} alt="" className="search-result-img" loading="lazy" />
                    )}
                    <div className="search-result-info">
                      <div className="search-result-title">{p.title}</div>
                      {p.variants?.[0]?.prices?.[0] && (
                        <div className="search-result-price">
                          {formatPrice(p.variants[0].prices[0].amount)}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
                <button
                  type="button"
                  className="search-view-all"
                  onClick={() => submit(query)}
                >
                  View all results for &ldquo;{query}&rdquo; →
                </button>
              </>
            ) : (
              <div className="search-hint">No products found. Press Enter to search anyway.</div>
            )
          ) : recents.length > 0 ? (
            <>
              <div className="search-group-label">Recent Searches</div>
              {recents.map((r) => (
                <button key={r} type="button" className="search-suggestion" onClick={() => submit(r)}>
                  <span className="search-suggestion-icon">🕘</span> {r}
                </button>
              ))}
            </>
          ) : null}

          <div className="search-group-label">Trending</div>
          <div className="search-trending">
            {TRENDING_SUGGESTIONS.map((t) => (
              <button key={t} type="button" className="search-tag" onClick={() => submit(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
