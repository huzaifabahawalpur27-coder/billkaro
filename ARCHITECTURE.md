# BillKaro — Architecture

**Product:** Digital Bill Book + Product Rate List + Udhaar Khata for Pakistani grocery/karyana/general stores.
**Not** an inventory system. **Not** accounting/ERP software.

Core pillars: fast direct billing · unlimited product catalogue · XLSX import/export · brand-wise bulk price update · old bill search · customer udhaar khata · complete ledger history · online SaaS **and** fully-offline local install.

---

## A. Product architecture analysis

The revised requirements remove all stock/inventory workflows. This changes the data model fundamentally:

- **Product is a rate-list entry**, not a stock item. No quantity-on-hand, no stock movements, no purchase orders. A product is `name + prices + classification`. Billing never checks or decrements stock.
- **Sale/SaleItem is permanent bill history.** SaleItems snapshot the product name, SKU, and catalogue price at sale time, so bills stay historically accurate even if products are renamed, repriced, or deleted. `productId` is nullable to support **open price items** (Daal — Rs. 450) that never become catalogue products.
- **LedgerEntry is the single source of udhaar truth.** Append-only. Every financial event (credit sale, payment, opening balance, adjustment, cancellation reversal) is a ledger row with `amount` and `balanceAfter`. `Customer.currentBalance` is a cache updated only inside the same transaction that writes the ledger row, and a reconciliation script can rebuild it from the ledger.
- **Payments are khata-level, not invoice-allocated** (v1). A payment reduces the customer's balance; it optionally references a sale (payment taken at billing time). The schema keeps `Payment.saleId` nullable so future invoice-level allocation (a `PaymentAllocation` join table) can be added without migration pain. The UI never shows allocation complexity.

## B. Final technical architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | One deployable unit for SaaS, self-host, and local laptop |
| UI | Tailwind CSS 4 + shadcn/ui + Lucide icons | Spec requirement; fast, consistent |
| DB | PostgreSQL 16 | Spec requirement; pg_trgm for fast fuzzy product search |
| ORM | Prisma (Decimal for all money) | Migrations, type safety |
| Auth | Custom modular: bcryptjs password hashing + `jose`-signed HTTP-only session cookie | Zero cloud dependency — identical code path for SaaS and offline laptop. No native binaries (bcryptjs is pure JS → painless Docker/Windows builds) |
| Validation | Zod on every server action / route handler | Server is the source of truth |
| XLSX | exceljs (server-side parse + generate) | Real .xlsx, streaming-capable, maintained |
| Money math | Prisma `Decimal` + `decimal.js` utilities in `src/lib/money.ts` | No float arithmetic on money, ever |
| Deployment | Docker Compose (app + postgres) / any Node host + Postgres | `output: "standalone"` Next build |
| Dev DB (this machine) | `embedded-postgres` npm package (real PG binaries, dev-only) | No Docker/Postgres installed on the dev laptop |
| PWA | Web manifest + minimal service worker (app-shell caching) | Installable; billing still requires the local server (which *is* local in offline mode) |

**Server logic lives in `src/server/services/*` (plain async functions), called from Server Actions and route handlers.** UI components never touch Prisma directly. This keeps business logic portable and testable.

## C. Database schema plan

See [prisma/schema.prisma](prisma/schema.prisma). Highlights:

- Every tenant-owned table carries `businessId` with composite indexes led by `businessId`.
- `DocumentCounter (businessId, key, nextNumber)` issues gapless invoice (`INV-000001`) and payment-receipt (`PAY-000001`) numbers via `SELECT … FOR UPDATE` inside the sale/payment transaction — safe under concurrency, unique per business.
- `Sale.paymentStatus` (PAID | PARTIAL | UDHAAR) is stored for fast filtering; amounts (`grandTotal`, `amountPaid`, `amountDue`) are the truth.
- `LedgerEntry.amount` is **signed**: positive = udhaar added (customer owes more), negative = udhaar reduced. `balanceAfter` stored on every row. UI vocabulary: "Udhaar Added" / "Payment Received" — never debit/credit.
- `PriceHistory` records every price change with `source` (INLINE_EDIT, BRAND_BULK, BULK_SELECT, EXCEL_IMPORT, MANUAL).
- `BusinessSettings` is a single table that also carries invoice settings (prefixes, receipt size, footer, tax, rounding) — a separate `InvoiceSettings` table adds a join with zero benefit at this scale; the columns are namespaced so a future split is mechanical.
- `Role.permissions` is a Postgres enum array — per-business roles, seeded system roles (Owner/Admin/Manager/Cashier), custom roles possible later.
- Product search: btree on `(businessId, …)` for sku/barcode exact lookups + **pg_trgm GIN index on `Product.name`** (raw SQL in migration) for fast `ILIKE '%surf%'` at 50k+ products. Bills search joins `SaleItem.productNameSnapshot` (also trigram-indexed).

## D. Folder structure

```
billkaro/
├─ prisma/                schema.prisma, migrations/, seed.ts
├─ scripts/               dev-db.ts (embedded postgres), reconcile-balances.ts
├─ docker/                Dockerfile, entrypoint (migrate deploy + start)
├─ docker-compose.yml
├─ .env.example
└─ src/
   ├─ app/
   │  ├─ (auth)/login, register
   │  ├─ (app)/            authenticated shell (sidebar + header)
   │  │  ├─ dashboard/  bill/  products/  brands/  categories/
   │  │  ├─ customers/  khata/  khata/[customerId]/
   │  │  ├─ bills/  bills/[id]/  ledger/  reports/
   │  │  ├─ users/  settings/
   │  └─ api/              route handlers (xlsx upload/download, print data)
   ├─ server/
   │  ├─ auth/             session.ts (jose), passwords.ts, guards.ts
   │  ├─ db.ts             Prisma singleton
   │  └─ services/         products, pricing, billing, customers, ledger,
   │                       payments, importExport, reports, audit, settings
   ├─ lib/                 money.ts, format.ts, permissions.ts, i18n strings
   ├─ components/          ui/ (shadcn), app/ (AppSidebar, MoneyDisplay,
   │                       StatusBadge, DataTable, EmptyState, …)
   └─ hooks/               useKeyboardShortcuts, useDebounce
```

## E. Multi-tenant security strategy

1. **Session** — HTTP-only, `SameSite=Lax`, jose-signed (HS256, `SESSION_SECRET`) cookie: `{ userId, activeBusinessId, exp }`. Rolling 7-day expiry.
2. **`requireAuth()`** — verifies cookie, loads user; redirects to /login otherwise.
3. **`requireBusiness(permission?)`** — the single tenant gate every service call goes through. Resolves the membership row `BusinessUser(userId, activeBusinessId, status=ACTIVE)` from the **database**, never trusting a client-supplied businessId. Returns `{ user, business, permissions }`, throws 403 if the permission is missing.
4. **Every Prisma query in services takes `businessId` from that context** and includes it in `where`. Row lookups by id are always `findFirst({ where: { id, businessId } })` — never `findUnique({ id })` alone.
5. Business switcher rewrites the cookie only after re-validating membership.
6. Rate limiting on login/register (in-memory token bucket keyed by IP — no external service).
7. Passwords: bcryptjs cost 11. Secrets only via env; nothing sensitive in client bundles.

## F. Deployment strategy

**Local / offline laptop (primary distribution):**
```
1. Install Docker Desktop
2. Unzip BillKaro
3. copy .env.example .env   (set SESSION_SECRET + POSTGRES_PASSWORD)
4. docker compose up -d
5. Open http://localhost:3000
```
Compose runs `postgres:16-alpine` (named volume) + the app image. The app entrypoint runs `prisma migrate deploy` then starts the standalone server. **Zero cloud calls for any core feature.**

**Online SaaS:** the same image behind any host (VPS + Compose, or app platform + managed Postgres). All environment-specific values via env vars: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`.

**Dev on this machine (no Docker):** `npm run dev:db` boots embedded PostgreSQL on port 5433 with a persistent data dir under `.pgdata/`; `npm run dev` runs Next.

## G. Phased roadmap

| Phase | Scope |
|---|---|
| 1 | Scaffold, Prisma schema + migration, dev DB, Docker, auth, tenant guard |
| 2 | Business onboarding, users, roles, permissions |
| 3 | Products / brands / categories / units, price history, search indexes |
| 4 | Brand bulk price update (preview → confirm), rounding, audit log |
| 5 | **New Bill POS screen** — search, open items, cash/partial/udhaar, atomic sale txn |
| 6 | Receipts: 58/80mm thermal + A4, print CSS, PDF, payment receipt |
| 7 | Customers, Udhaar Khata, ledger, receive payment, bill search, cancellation + reversal |
| 8 | XLSX import/export (products, customers, bills, ledger), dashboard, reports, settings |
| 9 | PWA, responsive/a11y polish, security pass, build verification, install docs |

### Key transaction flows (all single DB transactions)

**Udhaar/partial sale:** validate items & customer → lock `DocumentCounter` → create Sale + SaleItems → create Payment (if amountPaid > 0) → create `SALE_CREDIT` LedgerEntry (amountDue) with `balanceAfter` → update `Customer.currentBalance` → AuditLog → commit. Any failure rolls back everything.

**Receive payment:** validate amount > 0 → lock counter (PAY number) → Payment → `PAYMENT_RECEIVED` LedgerEntry (negative amount) → update cached balance → AuditLog → commit.

**Cancel bill:** permission + status check → mark Sale CANCELLED → if it created udhaar, append `SALE_CANCELLED_REVERSAL` LedgerEntry (negative) + update balance → AuditLog → commit. Original ledger rows are never edited or deleted.
