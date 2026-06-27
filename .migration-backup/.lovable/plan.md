# Grocery Delivery Website — Build Plan

A Blinkit/Instamart-style online grocery store with a customer storefront, admin panel, and Razorpay checkout. Built on **Lovable Cloud** (managed Postgres + auth + storage + server functions) with a **bright yellow/green Blinkit-inspired** design.

Because the scope is large, I'll ship it in **3 phases** so each phase is solid before the next. You'll have a working site at the end of every phase.

---

## Phase 1 — Core storefront + admin + checkout (ship first)

**Customer side**
- Email/password signup & login (Lovable Cloud auth)
- Home page with category tiles + featured products
- Browse by category (7 categories: Fruits & Vegetables, Dairy & Breakfast, Bakery, Snacks & Beverages, Household, Personal Care, Grocery Essentials)
- Product search (name + category)
- Product detail page
- Cart (persisted per user)
- Address book (add / select delivery address)
- Checkout with **Razorpay test-mode integration**
- Order confirmation + order history + single order tracking page (status timeline)
- Fully responsive, mobile-first

**Admin panel** (`/admin`, role-gated)
- Login as admin (role table, not a flag on profile)
- Products: list / create / edit / delete, image upload, price, stock, category
- Categories: list / create / edit / delete
- Inventory: stock view + quick edit, low-stock highlight
- Orders: list, filter by status, view details, update status (Placed → Packed → Out for delivery → Delivered / Cancelled)
- Customers: list with order counts
- Mini dashboard: total orders, revenue, today's orders, low-stock count

**Delivery basics**
- Single flat delivery charge + free-over-threshold (admin-configurable in settings)
- Estimated delivery time setting (e.g. "10–15 min")
- In-app order notifications (toast + order list updates)

**Technical**
- TanStack Start (already scaffolded), TanStack Query, Tailwind v4 design system
- SEO: per-route head meta, sitemap.xml, robots.txt, JSON-LD on product pages
- RLS on every table; admin role via `has_role()` security-definer function
- Razorpay verified via signature check in a server function before order is marked paid

## Phase 2 — Operational polish
- Delivery area management (pincode allowlist + per-area charge/ETA)
- Coupon/discount system (percent + flat, min-order, expiry, per-user limit)
- Sales reports (revenue by day/week/month, top products, category breakdown, CSV export)
- Email order notifications (via Lovable AI/Resend)
- Phone number on profile + OTP-less phone capture for delivery

## Phase 3 — Optional extras
- WhatsApp order notifications (requires a WhatsApp Business API provider — needs your account)
- Multi-vendor support (vendor role, vendor-scoped products/orders, payouts ledger)
- Android app — out of scope for the web build; the responsive site works as a PWA, and a native Android app would be a separate React Native / Capacitor project

---

## What I need from you (not blocking — I'll start now)

1. **Razorpay test keys** (`RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`) from your Razorpay dashboard → Settings → API Keys. I'll request them securely when checkout is wired up.
2. **First admin email** — after signup, I'll grant your account the admin role via a migration. Tell me which email to promote.
3. **Brand name** for the site (default: "FreshCart" if you don't specify).

## Technical details (for reference)

- **Stack**: TanStack Start v1, React 19, Tailwind v4, shadcn/ui, TanStack Query
- **Backend**: Lovable Cloud (Supabase under the hood — managed)
- **Tables**: `profiles`, `user_roles` (enum: admin, customer), `categories`, `products`, `addresses`, `cart_items`, `orders`, `order_items`, `order_status_history`, `settings`, (phase 2) `delivery_areas`, `coupons`
- **Payments**: Razorpay Standard Checkout; order creation + signature verification in `createServerFn` handlers; webhook on `/api/public/razorpay-webhook`
- **Images**: Cloud Storage bucket `product-images` (public read, admin write)
- **Security**: RLS scoped to `auth.uid()`; admin checks via `has_role(auth.uid(), 'admin')`; service role only inside verified webhook
- **SEO**: route-level `head()` meta, OG tags, `sitemap.xml` route, `robots.txt`

Approve this and I'll start Phase 1 — beginning with enabling Lovable Cloud, the database schema, and the design system.
