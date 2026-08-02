# 🕉️ DivineKart — Full-Stack Hindu Religious & Spiritual Ecommerce Platform

DivineKart is a production-ready, self-hosted ecommerce store for Hindu religious and spiritual products built on **Medusa v2** backend and **Next.js** storefront, running fully in Docker containers.

---

## 🎨 UI/UX Design System & Features

Designed with a fusion of modern AI platform aesthetics (**xalen.io**) and high-converting Indian ecommerce marketplaces (**Flipkart** & **Amazon India**):

1. **xalen.io Design Adoption**:
   - **Hero Section**: Badge (`✨ 100% Authentic`) → Serif Headline (`Sacred Art & Spiritual Essentials for Every Devotee`) → Sub-headline → Dual CTAs → Stats Row (1,000+ Items, 10+ Verticals, Pan-India Delivery, 4.9★ Rating).
   - **Section Headers**: Sub-label + Serif Heading + Description.
   - **Why Choose Us**: 4 numbered feature cards (`01 Authentic & Sanctified`, `02 Pan-India Express Shipping`, etc.).
   - **Testimonials & Newsletter**: Verified customer cards & dark glassmorphism CTA strip.

2. **Flipkart & Amazon India UI Patterns**:
   - **Category Carousel**: Circular category icons horizontal scroll row.
   - **Mega-Menu**: Top navbar dropdown with multi-column category grid.
   - **Deal of the Day**: Countdown timer strip with discounted products.
   - **Product Cards**: Image hover zoom, discount badges (% OFF), MRP strikethrough, star ratings (★★★★☆), and quick Add-to-Cart.
   - **Product Listings & Details**: Breadcrumbs, gallery thumbnail switcher, related items carousel, and sticky order summary cart.

---

## 📦 10 Product Categories Supported

1. **Religious Photos** (Framed photos, gold foil prints, deity wall art)
2. **God Image Keyrings** (Acrylic & metal deity keychains)
3. **Spiritual Idols** (Handcrafted brass, marble, resin murtis)
4. **Spiritual Stickers** (3D holographic car & laptop stickers)
5. **Banners & Posters** (Temple banners, jagran backdrops)
6. **Photo Frames** (Wooden/gold-foiled deity frames)
7. **Handbills & Invites** (Puja pamphlets & invitation cards)
8. **Spiritual Stationery** (Gita journals, mantra bookmarks, calendars)
9. **Spiritual Flags (Dhwaja)** (Saffron Hanumanji flags, mandir flags)
10. **Spiritual Clothing** (Pitambari silk stoles, pujari kurtas, dhotis)

---

## 🏗️ Architecture

```
                                 [ Customer Browser ]
                                          │
                                       (Port 8000)
                                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Docker Compose Network                                                    │
│                                                                          │
│  ┌─────────────────────────────┐        ┌─────────────────────────────┐  │
│  │     Next.js Storefront      │        │       Medusa Backend        │  │
│  │       (Port 8000)           │───────>│         (Port 9000)         │  │
│  └─────────────────────────────┘        └──────────────┬──────────────┘  │
│                                                        │                 │
│                                         ┌──────────────┴──────────────┐  │
│                                         ▼                             ▼  │
│                               ┌───────────────────┐       ┌───────────┴──┐
│                               │   PostgreSQL 15   │       │  Redis 7  │
│                               │    (Port 5432)    │       │(Port 6379)│
│                               └───────────────────┘       └───────────┘
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Run locally with Docker Compose

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac/Linux) installed and running.

### 1. Build and Start All Services
From the root project directory:

```bash
docker compose up --build -d
```

### 2. Service Access Endpoints

- **Storefront**: [http://localhost:8000](http://localhost:8000)
- **Medusa Admin Dashboard**: [http://localhost:9000/app](http://localhost:9000/app)
- **Medusa Store API**: [http://localhost:9000/store](http://localhost:9000/store)
- **Backend Health Check**: [http://localhost:9000/health](http://localhost:9000/health)

### 3. Default Admin Credentials
- **Email**: `admin@divinekart.com`
- **Password**: `supersecret`

### 4. Environment Variables

Copy values from `.env` (already present at the repo root):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (internal `postgres` host) |
| `REDIS_URL` | Redis connection (internal `redis` host) |
| `JWT_SECRET` / `COOKIE_SECRET` | Backend auth secrets |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` | CORS allow-list |
| `MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD` | Auto-created admin user |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Browser-side Medusa URL (`http://localhost:9000`) |
| `MEDUSA_BACKEND_URL` | Server-side Medusa URL inside the storefront container (`http://backend:9000`) |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Publishable API key used for `/store/*` requests |

> **Note:** The seed script (`backend/scripts/seed-data.ts`) is idempotent. On first boot it creates the store, India/INR region, 10 collections, 30 published products, the default sales channel, and a publishable API key linked to it. If the key already exists, it is reused — so the value in `.env` must match the one seeded (re-run `docker compose exec backend medusa exec ./scripts/seed-data.ts` and read the generated key from the logs if you need to rotate it).

---

## 🛠️ Useful Commands

```bash
# View container status
docker compose ps

# View logs for all services
docker compose logs -f

# View logs for backend specifically
docker compose logs -f backend

# Stop all services
docker compose down

# Stop services and remove volumes (reset DB)
docker compose down -v
```
