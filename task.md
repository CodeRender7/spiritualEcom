# DivineKart — Implementation Tasks

## Phase 1: Root Docker Configuration
- [x] `.env` — Environment variables
- [x] `.gitignore` — Git ignore rules
- [x] `docker-compose.yml` — 4-service compose file
- [x] `README.md` — Project documentation

## Phase 2: Medusa Backend
- [x] `backend/package.json` — Dependencies
- [x] `backend/tsconfig.json` — TypeScript config
- [x] `backend/medusa-config.ts` — Medusa configuration
- [x] `backend/.env` — Backend env vars
- [x] `backend/Dockerfile` — Multi-stage Docker build
- [x] `backend/scripts/entrypoint.sh` — Docker entrypoint
- [x] `backend/scripts/seed-data.ts` — Seed data script
- [x] `backend/src/admin/.gitkeep`
- [x] `backend/src/api/.gitkeep`

## Phase 3: Storefront — Foundation
- [x] `storefront/package.json` — Dependencies
- [x] `storefront/tsconfig.json` — TypeScript config
- [x] `storefront/next.config.mjs` — Next.js config
- [x] `storefront/Dockerfile` — Multi-stage Docker build
- [x] `storefront/src/app/globals.css` — Design system CSS
- [x] `storefront/src/app/layout.tsx` — Root layout
- [x] `storefront/src/lib/medusa.ts` — API client & fallback data
- [x] `storefront/src/lib/utils.ts` — Utility functions

## Phase 4: Storefront — Components
- [x] `AnnouncementBar.tsx` — Promo announcement bar
- [x] `Navbar.tsx` — Mega-menu navigation
- [x] `HeroSection.tsx` — xalen.io-style hero
- [x] `CategoryCarousel.tsx` — Flipkart circular icons
- [x] `ProductCard.tsx` — Premium product card
- [x] `ProductCarousel.tsx` — Horizontal scroll strip
- [x] `DealBanner.tsx` — Deal of the Day countdown
- [x] `FeaturedCollections.tsx` — Bento grid
- [x] `WhyShopWithUs.tsx` — Feature cards
- [x] `Testimonials.tsx` — Review cards
- [x] `NewsletterCTA.tsx` — Email CTA
- [x] `Footer.tsx` — Multi-column footer
- [x] `StarRating.tsx` — Rating display
- [x] `PriceDisplay.tsx` — Price formatting
- [x] `SearchBar.tsx` — Search with autocomplete dropdown, recent searches, trending suggestions
- [x] `BreadcrumbNav.tsx` — Breadcrumb navigation

## Phase 5: Storefront — Pages
- [x] `src/app/page.tsx` — Homepage
- [x] `src/app/products/page.tsx` — Products listing (supports `?q=` search)
- [x] `src/app/products/[handle]/page.tsx` — Product detail
- [x] `src/app/collections/page.tsx` — Collections listing
- [x] `src/app/collections/[handle]/page.tsx` — Collection detail
- [x] `src/app/cart/page.tsx` — Cart page

## Phase 7: pnpm + Turbo Monorepo
- [x] Root `pnpm-workspace.yaml`, `turbo.json`, `.npmrc` (hoisted), single lockfile
- [x] Backend seed refactored to `createProductsWorkflow` (idempotent, INR paise prices)
- [x] Backend/storefront Dockerfiles rewritten for monorepo (repo-root context, node:24, mirror registry, resumable store cache)
- [x] `docker-compose.yml` — repo-root build contexts, fixed CORS, `POSTGRES_USER`/`DB` env, storefront `3000`->`8000`
- [x] `entrypoint.sh` — robust `pg_isready` wait + migrate + seed + admin + start
- [x] Storefront `medusa.ts` — server fetches use `MEDUSA_BACKEND_URL`, browser uses `NEXT_PUBLIC_*`, Mock fallback preserved
- [x] `.dockerignore` — excludes node_modules/.next/.env/skills/agent dirs

## Phase 6: Verification
- [x] All 25+ codebase files created
- [x] `pnpm turbo typecheck` / `pnpm turbo build` green (backend + storefront)
- [x] Docker Compose build + end-to-end run verified
- [x] Seed publishes products: 30 products + 10 collections + India/INR region
- [x] Storefront renders real seeded data (dynamic pages, publishable API key, `MEDUSA_BACKEND_URL` server-side)
