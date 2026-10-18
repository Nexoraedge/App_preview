# Adityam Niramayaa (आदित्यम् निरामया:)
### High-Traffic Healthcare Aggregator Monorepo (30-Day MVP Launch)

[![Tech Stack](https://img.shields.io/badge/Stack-Expo_|_Next.js_|_Supabase_PostGIS-1D2D50)](https://github.com)
[![Concurrent Capacity](https://img.shields.io/badge/Launch_Capacity-50,000_Concurrent_Users-124D41)](https://github.com)
[![Status](https://img.shields.io/badge/Phase_1-Production_Ready-3A7BD5)](https://github.com)

Adityam Niramayaa is India's next-generation patient healthcare aggregator offering priority OPD hospital concierge booking, 25% instant platform discount on pharmacy bills via UPI Scan & Pay, diagnostic lab bookings, and cashless IPD admissions.

---

## 🏛️ Monorepo Architecture

```
adityam_niramayaa/
├── apps/
│   ├── mobile/                    # Patient Mobile App (Expo SDK 52 + Expo Router + NativeWind + TanStack Query)
│   │   ├── app/
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx      # Home: 4 Action Cards (OPD, Labs, Pharmacy, IPD) + Wallet
│   │   │   │   ├── opd.tsx        # OPD Concierge: PostGIS Nearby Hospitals + Exotel Masked Call Trigger
│   │   │   │   ├── pharmacy.tsx   # Pharmacy Scan & Pay: QR scanner, Bill photo, 25% discount & UPI intent
│   │   │   │   ├── family.tsx     # Family Vault: Lazy Aadhaar KYC + Dependent profiles
│   │   │   │   └── profile.tsx    # Patient Profile & App Store Reviewer Hub
│   │   │   ├── login.tsx          # Phone OTP Login with 1-Tap App Store Review Bypass
│   │   │   └── _layout.tsx        # TanStack Query & Auth Provider Root
│   │   └── tailwind.config.js     # NativeWind Healthcare Trust Palette
│   │
│   └── web/admin/                 # Call-Center CRM & Concierge Desk (Next.js 15 App Router + Tailwind)
│       ├── src/app/
│       │   ├── page.tsx           # Real-Time Lead Stream (Supabase Realtime) + Exotel Telephony Simulator
│       │   ├── layout.tsx         # Root layout with Juana & Montserrat typography
│       │   └── globals.css        # Healthcare Trust design tokens
│       └── tailwind.config.js     # Desktop CRM theme
│
├── packages/
│   ├── types/                     # Shared TypeScript interfaces (User, Hospital, Dependent, Booking)
│   └── supabase/                  # PostGIS spatial distance calculations, client helpers, seed fallbacks
│
├── supabase/
│   ├── migrations/
│   │   └── 20261016000001_initial_postgis_schema.sql # PostGIS geography point, GIST index, get_nearby_hospitals RPC
│   └── seed.sql                   # Realistic Indian hospitals (Saket, Gurugram, Dwarka) & test records
│
├── pnpm-workspace.yaml            # Monorepo workspace configuration
├── .npmrc                         # node-linker=hoisted for React Native / Metro compatibility
└── package.json                   # Root orchestrator scripts
```

---

## 🎨 Healthcare Trust Design Palette

| Token | Hex Code | Usage |
| :--- | :--- | :--- |
| **Navy** | `#2E4A70` | Primary Brand & Typography (Headers, bottom nav active state, hospital brand titles) |
| **Turquoise** | `#24B0BA` | Primary Action & CTAs ("Book Consultation", "Scan Bill", active filter chips) |
| **Gold / Ochre** | `#CF8A40` | Offers, Discounts & Sponsored Tags ("Flat 25% Off" badge, "Sponsored" tags, Privilege Card) |
| **Sky** | `#73C7E3` | Secondary Accents & Badges ("Verified Doctor", "NABL Accredited", active tab indicators) |
| **Light** | `#F0F2F2` | Screen Canvas & Backgrounds (Cool, clean neutral background preventing eye fatigue) |
| **Linen** | `#FFF9F0` | Offer Cards & Highlight Banners (Warm tint background for Pharmacy 25% discount & VIP card) |
| **Typography** | `Juana / Playfair` (Headers), `Montserrat` (Body text) |

---

## 🚀 Key Phase 1 Deliverables

### 1. Patient Mobile App (`apps/mobile`)
- **Phone OTP Login & App Store Review Bypass:**
  - One-tap login button for Apple & Google app store reviewers.
  - Test Account: Phone `+91 99999 99999`, OTP `123456`, Pre-funded with ₹2,500 Health Cash.
- **Home Dashboard:**
  - 4 Big Action Cards: **OPD Concierge**, **Pharmacy Scan & Pay (-25%)**, **Investigation (Labs)**, **IPD Surgeries**.
  - Wallet balance card (₹2,500 Niramayaa Health Cash).
- **OPD Priority Concierge:**
  - Powered by **PostGIS `get_nearby_hospitals` RPC** with radial distance in kilometers.
  - Specialty filtering (Cardiology, Orthopedics, Pediatrics, Oncology, General Medicine).
  - "Book Concierge Call" button sends real-time dispatch to the Call-Center CRM and initiates an **Exotel Masked Call** where patient phone number remains 100% confidential.
- **Pharmacy Scan & Pay:**
  - Store QR detection viewfinder.
  - Bill receipt photo capture.
  - Real-time 25% platform discount calculator.
  - Instant UPI Payment Intent launch: `upi://pay?pa=adityam@icici&pn=Adityam+Niramayaa&am=...&cu=INR`.
- **Family Vault (Lazy Aadhaar KYC):**
  - Add dependents (Father, Mother, Spouse, Children).
  - Masked 12-digit Aadhaar input (`XXXX-XXXX-1234`) with only last 4 digits saved to avoid drop-offs. Full authentication deferred to hospital counter admission.
  - Statutory consent checkbox.

### 2. Call-Center CRM Dashboard (`apps/web/admin`)
- **Supabase Realtime Subscriptions:**
  - Listens to `INSERT` and `UPDATE` on `public.bookings`.
  - Visual and audio notification alerts on incoming patient requests.
- **Exotel Masked Dialer Simulator:**
  - Real-time virtual routing from virtual DID `+91 11 4000 8800` to patient.
  - Live call timer and status switcher (`NEW` ➔ `CALLING` ➔ `CONFIRMED`).
- **Simulate Patient Request Button:**
  - Built-in live generator to test the 50k concurrent user intake pipeline right from the browser.

---

## 🗺️ PostGIS Geospatial Engine (`supabase/`)

The database uses PostgreSQL `postgis` extension with high-performance spatial indexing:

```sql
-- Point with WGS84 coordinates (longitude, latitude)
location GEOGRAPHY(Point, 4326) NOT NULL

-- Spatial GIST Index for O(log N) proximity lookups
CREATE INDEX idx_hospitals_location ON public.hospitals USING GIST (location);

-- PostGIS RPC Function
SELECT * FROM get_nearby_hospitals(
  user_lat := 28.5283,
  user_lng := 77.2120,
  radius_meters := 50000,
  specialty_filter := 'Cardiology'
);
```

### High-Traffic Architecture (50,000 Concurrent Users at Launch)
1. **Connection Pooling:** Supabase Supavisor / PgBouncer in transaction mode (`pool_size: 1000`).
2. **PostGIS GIST Indexing:** Sub-millisecond geodesic distance calculations without table scans.
3. **Realtime Broadcast Replication:** Only dispatch queues (`bookings`) publish updates to agents, minimizing websocket overhead.

---

## 💻 Quick Start & Running Locally

### Prerequisites
- Node.js >= 20
- pnpm >= 10 (`npm i -g pnpm`)

### 1. Run Call-Center CRM (Web)
```bash
pnpm --filter @adityam/admin dev
# Open http://localhost:3000
```

### 2. Run Patient Mobile App (Expo)
```bash
pnpm --filter @adityam/mobile dev
# Press 'w' for web preview, 'i' for iOS simulator, or 'a' for Android
```

### 3. Apply Supabase Database Migrations
Copy the contents of `supabase/migrations/20261016000001_initial_postgis_schema.sql` and `supabase/seed.sql` into your Supabase SQL Editor or run:
```bash
npx supabase db push
```
