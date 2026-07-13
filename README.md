# BillKaro

**Digital Bill Book · Product Rate List · Udhaar Khata** — for Pakistani grocery, karyana, and general stores.

Fast direct billing, unlimited product catalogue, brand-wise bulk price updates, old bill search, customer udhaar khata with complete ledger history, and XLSX import/export. Works fully offline on a shop laptop or as an online SaaS — same code, same features.

> BillKaro is **not** an inventory system. Products are rate-list entries; billing never checks or decrements stock.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical design.

## Install on a shop laptop (offline, recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/). No internet is needed after installation.

```bash
# 1. Unzip / clone BillKaro, then in the BillKaro folder:
copy .env.example .env       # (cp on Linux/Mac)

# 2. Edit .env — set SESSION_SECRET and POSTGRES_PASSWORD
#    Generate a secret with:
#    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Start everything (app + database):
docker compose up -d

# 4. Open the app:
#    http://localhost:3000  →  Register your business
```

Data lives in the `billkaro-db` Docker volume and survives restarts and updates. To update BillKaro: replace the app folder, then `docker compose up -d --build` — database migrations run automatically on start.

**Backup:** `docker compose exec db pg_dump -U billkaro billkaro > backup.sql`

## Run as online SaaS

Deploy the same image behind any Node host or container platform with a managed PostgreSQL 16 database. Configure via environment variables only:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Long random value signing login cookies |

The container entrypoint runs `prisma migrate deploy` before starting the server.

## Development (no Docker needed)

```bash
npm install
npm run dev:db      # embedded PostgreSQL on port 5433 (keep running)
npm run db:deploy   # apply migrations (first time)
npm run db:seed     # demo data: login babar@billkaro.pk / billkaro123
npm run dev         # Next.js on http://localhost:3000
```

Useful scripts:

| Script | What it does |
|---|---|
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run build` | Production build |
| `npm run db:migrate` | Create a new migration after schema changes |
| `npm run db:reconcile` | Rebuild cached customer balances from the ledger |

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS + shadcn/ui · Prisma + PostgreSQL 16 · Decimal money math (never floats) · exceljs for XLSX · jose + bcryptjs auth (no cloud dependency) · PWA-installable.
