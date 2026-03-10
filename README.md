# Super Crown Catering Platform

A production-ready catering website and operations platform built with Next.js + Firebase.

This app combines:
- a premium public-facing catering site,
- a quote request pipeline,
- a role-based operations dashboard for sales, drivers, and admins,
- automated communication and invoice workflows.

---

## What The Company Can Achieve With This Platform

With this system, Super Crown (or any catering business using this codebase) can:

- Capture high-intent leads from the website with structured quote requests.
- Turn quote requests into approved orders with internal sales workflows.
- Assign and track deliveries with a dedicated driver experience.
- Confirm completed deliveries and keep auditable delivery records.
- Generate branded invoices (PDF), store them, and email clients automatically.
- Keep menu data up to date with an admin panel, including image uploads and availability.
- Run all business operations in one central stack (site + CRM-like workflow + delivery ops).

---

## Core Features (Current)

### 1) Public Website
- Marketing homepage with service sections, trust/reviews, and menu preview.
- Dedicated menu page connected to product data.
- Mobile-friendly UI designed for conversion.

### 2) Quote System
- Customers submit quote requests with event details, budget, guest count, and delivery address.
- Quote records are stored in Firestore (`quotes` + `quotes/{id}/items`).
- Optional email notifications are sent via Resend (owner + customer acknowledgement).
- Simulation mode is supported when `RESEND_API_KEY` is missing (safe for testing).

### 3) Role-Based Authentication
- Unified login/register experience (`/login`).
- Firebase Authentication with secure session cookies.
- Role-based authorization and route redirection.
- Supported roles:
  - `client`
  - `sales`
  - `driver`
  - `admin`

### 4) Sales Dashboard
- Quote queue and quote detail review flow.
- Operational overview cards (pending quotes, orders today, deliveries, revenue view).
- Team management support (admin/sales can create users).
- Sales lifecycle pages for quotes, orders, deliveries, and invoices.

### 5) Driver Dashboard
- Driver sees assigned deliveries for the day.
- Delivery detail expansion with item list.
- One-tap navigation links (Google Maps / Waze).
- Delivery confirmation flow with proof fields (receiver name, notes, optional media/signature payload).

### 6) Admin Product Management
- Create, edit, and delete products.
- Manage product visibility/availability without deleting records.
- Upload and replace product images in Firebase Storage.
- Maintain menu quality continuously as dishes and photos evolve.

### 7) Invoicing and Document Automation
- Create invoice PDFs from approved order data.
- Sequential invoice numbering (`SCF-YYYY-####`).
- Store PDFs in Cloud Storage and save metadata in Firestore.
- Email invoice links to clients (when email provider is configured).

---

## Business Workflows (End-to-End)

1. Visitor explores services and menu.
2. Visitor submits a quote request.
3. Sales team reviews quote and converts it into an order flow.
4. Delivery is scheduled and assigned to a driver.
5. Driver executes and confirms delivery.
6. System generates invoice and sends it to the client.
7. Admin updates menu/catalog as business evolves.

---

## Quick Usage Tutorial

### For a Customer (Client)
1. Open the website.
2. Browse menu and add desired items.
3. Submit quote details (event date, guest count, address, notes).
4. Create an account or sign in.
5. Receive confirmation and wait for sales follow-up.

### For Sales Team
1. Sign in at `/login` with a `sales` (or `admin`) account.
2. Open the Sales dashboard.
3. Review incoming quotes and update status.
4. Prepare order/delivery coordination.
5. Generate invoice when appropriate.

### For Drivers
1. Sign in with a `driver` account.
2. Open Driver dashboard for today's assigned deliveries.
3. Use map links to navigate.
4. Confirm delivery and record proof details.

### For Admins
1. Sign in with an `admin` account.
2. Open Admin dashboard.
3. Manage products, images, and availability.
4. Create internal users (sales/driver/admin with role controls).
5. Keep operations and catalog data consistent.

---

## Account Model: Client vs Driver vs Admin (And Sales)

### Client Accounts
- Created via self-registration in the login page.
- Automatically assigned the `client` role.
- Intended for quote requests and customer-side interaction.

### Driver Accounts
- Created internally by admin/sales team.
- Assigned the `driver` role.
- Access limited to driver delivery operations.

### Sales Accounts
- Created internally by admin/sales team.
- Assigned the `sales` role.
- Access to quote/order/delivery/invoice operational flows.

### Admin Accounts
- Highest permission level.
- Can access admin dashboard and create privileged users.
- Only admins can create other `admin` users.

---

## Running Locally

### Requirements
- Node.js 18+ (recommended: latest LTS)
- npm
- Firebase project

### Install
```bash
npm install
```

### Environment Variables
Copy and configure:
```bash
cp .env.local.example .env.local
```

Set at least:
- `NEXT_PUBLIC_FIREBASE_*` (client Firebase app config)
- `FIREBASE_ADMIN_*` (Firebase Admin service account credentials)
- `OWNER_EMAIL` (where quote alerts are sent)
- `RESEND_API_KEY` (optional for real email sending)

### Start Dev Server
```bash
npm run dev
```

Open `http://localhost:3000`.

---

## First Admin / Team Setup

### Option A: Seed first admin user
```bash
npm run seed:admin
```

Optional seed vars:
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

### Option B: Configure Admin credentials from JSON
```bash
npm run setup:admin
```

Then sign in at `/login`.

---

## Production Deployment, Hosting, Domain, and Required Accounts

To operate this platform as your own business system, create/configure the following:

### 1) GitHub Account
- Host source code and CI/CD workflows.
- Repo for version control, team collaboration, and releases.

### 2) Firebase Project (Required)
- Firebase Authentication (email/password provider).
- Firestore Database (quotes, users, orders, deliveries, invoices, products).
- Firebase Storage (product images, invoice assets if needed).
- Firebase Hosting (frontend deployment).
- Service Account key for `FIREBASE_ADMIN_*` server operations.

### 3) Email Delivery Provider (Recommended)
- Resend account for transactional emails:
  - quote alerts,
  - customer confirmations,
  - invoice notifications,
  - delivery confirmations.

### 4) Domain Provider (Required for Professional Branding)
- Buy domain from a registrar (Cloudflare, Namecheap, GoDaddy, etc.).
- Connect domain to Firebase Hosting custom domain.
- Configure DNS records and SSL (Firebase manages SSL issuance once DNS is verified).

### 5) Optional Monitoring/Analytics Stack
- Error monitoring (Sentry, LogRocket, etc.).
- Product analytics (GA4, PostHog, Plausible).
- Uptime monitoring.

---

## Suggested Deployment Flow

1. Prepare `.env.local` with production-ready values.
2. Verify Firebase Admin credentials.
3. Deploy Firebase resources (`hosting`, `firestore`, etc.).
4. Connect custom domain in Firebase Hosting.
5. Add DNS records at your registrar.
6. Validate end-to-end flow in production:
   - quote request
   - internal review
   - delivery confirmation
   - invoice generation + email.

---

## Future Additions (Roadmap)

This platform is ready to scale. High-impact future modules:

### Sales and Growth
- Coupon/discount engine.
- Upsell recommendations and package bundles.
- Referral and loyalty programs.
- Lead scoring and CRM integrations (HubSpot, Pipedrive).

### Operations
- Driver route optimization with multi-stop planning.
- Capacity planning by kitchen load and shift schedules.
- Inventory-aware menu availability and ingredient alerts.
- SLA dashboard for quote response and delivery punctuality.

### Finance
- Payment gateway integration (Stripe/Square).
- Partial deposits and milestone payments.
- Tax automation by region.
- Monthly P&L and margin reporting dashboard.

### Customer Experience
- Customer portal for quote/order status tracking.
- Reorder from past events.
- Event templates (weddings, corporate lunches, birthdays).
- Multi-language website support.

### Platform / Engineering
- Automated tests (unit/integration/e2e).
- CI/CD pipelines with environment promotion (staging -> production).
- Audit logs and stricter permission policies.
- Modular service boundaries for multi-brand operation.

---

## How To Manage Future Growth

Recommended strategy:

- Keep role boundaries strict (`client`, `sales`, `driver`, `admin`).
- Introduce a staging Firebase project before production changes.
- Add release checklists for critical flows (quote, delivery, invoice).
- Version APIs and data contracts as the team scales.
- Track metrics weekly: quote conversion, average ticket, on-time delivery, repeat rate.
- Prioritize roadmap by revenue impact + operational risk reduction.

---

## Tech Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Firebase:
  - Authentication
  - Firestore
  - Storage
  - Hosting
- Firebase Admin SDK
- Resend (transactional email)
- PDF-Lib (invoice generation)

---

## Repository Notes

- `app/`: routes and API handlers
- `components/`: UI components
- `lib/`: auth, Firebase, business logic helpers
- `scripts/`: setup/seed scripts
- `docs/`: product/admin documentation

---

## License

Internal / private business use unless otherwise specified by project owner.
