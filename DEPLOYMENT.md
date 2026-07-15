# BillKaro — Usage & Deployment Guide

**Digital Bill Book · Product Rate List · Udhaar Khata** for Pakistani grocery, karyana, and general stores.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Docker Deployment (Self-Hosted / Offline)](#docker-deployment-self-hosted--offline)
- [Vercel Deployment (Online SaaS)](#vercel-deployment-online-saas)
- [Database Management](#database-management)
- [NPM Scripts Reference](#npm-scripts-reference)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement       | Local Dev           | Docker (Offline)    | Vercel (SaaS)       |
| ----------------- | ------------------- | ------------------- | ------------------- |
| Node.js 22+       | ✅ Required          | ❌ Not needed        | ❌ Not needed        |
| npm               | ✅ Required          | ❌ Not needed        | ❌ Not needed        |
| Docker Desktop    | ❌ Not needed        | ✅ Required          | ❌ Not needed        |
| PostgreSQL 16     | Auto (embedded)     | Auto (container)    | External (managed)  |
| Git               | ✅ Recommended       | Optional            | ✅ Required          |
| Vercel Account    | ❌ Not needed        | ❌ Not needed        | ✅ Required          |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env   # Linux/Mac
copy .env.example .env # Windows
```

| Variable                 | Required | Description                                                                                    |
| ------------------------ | -------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | ✅ Yes    | PostgreSQL connection string. Format: `postgresql://USER:PASSWORD@HOST:PORT/DBNAME`            |
| `SESSION_SECRET`         | ✅ Yes    | Random 32+ character string for signing session cookies                                        |
| `POSTGRES_PASSWORD`      | Docker   | Password for the bundled PostgreSQL container (Docker Compose only)                            |
| `RUN_SEED`               | Optional | Set to `1` to seed demo data (Babar General Store) on first start                             |
| `PLATFORM_MODE`          | Optional | Set to `saas` to enable the `/admin` superadmin portal and subscription enforcement            |
| `PLATFORM_TRIAL_DAYS`    | Optional | Trial length (days) for new signups in SaaS mode. Default: `14`                               |
| `PLATFORM_ADMIN_PASSWORD`| Optional | Used once by `npm run admin:create` to create the first superadmin                             |

### Generate a Session Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Local Development

No Docker needed — uses an embedded PostgreSQL binary for development.

```bash
# 1. Install dependencies
npm install

# 2. Start the embedded PostgreSQL (keep this terminal open)
npm run dev:db

# 3. Apply database migrations (first time only)
npm run db:deploy

# 4. (Optional) Seed demo data
npm run db:seed
# Demo login: babar@billkaro.pk / billkaro123

# 5. Start the dev server
npm run dev
# → http://localhost:3000
```

> **Note:** The embedded PostgreSQL runs on port **5433** with data persisted in `.pgdata/`. The dev `DATABASE_URL` is pre-configured in `.env.example` for this setup.

---

## Docker Deployment (Self-Hosted / Offline)

The recommended option for shop laptops. Works **fully offline** after initial setup.

```bash
# 1. Configure environment
copy .env.example .env
# Edit .env → set SESSION_SECRET and POSTGRES_PASSWORD

# 2. Start everything (app + database)
docker compose up -d

# 3. Open the app
# → http://localhost:3000 → Register your business
```

### How It Works

- **`postgres:16-alpine`** runs as a sidecar container with a named volume (`billkaro-db`)
- The app container runs `prisma migrate deploy` on startup via `docker/entrypoint.sh`
- Data survives container restarts and updates

### Updating BillKaro

```bash
# Pull/replace the app files, then rebuild
docker compose up -d --build
# Migrations run automatically on start
```

### Backup & Restore

```bash
# Backup
docker compose exec db pg_dump -U billkaro billkaro > backup.sql

# Restore
docker compose exec -T db psql -U billkaro billkaro < backup.sql
```

---

## Vercel Deployment (Online SaaS)

### Step 1: Set Up a PostgreSQL Database

BillKaro requires PostgreSQL 16. Use any managed provider:

| Provider              | Free Tier | Recommendation                       |
| --------------------- | --------- | ------------------------------------ |
| **Neon**              | ✅ Yes     | ⭐ Best for Vercel (serverless-native) |
| **Supabase**          | ✅ Yes     | Good alternative, built-in dashboard |
| **Vercel Postgres**   | ✅ Yes     | Tightest Vercel integration          |
| **Railway**           | Trial     | Simple setup                         |
| **AWS RDS / Azure**   | ❌ Paid    | For production scale                 |

> **Important:** Use a **pooled/transaction-mode connection string** for serverless environments. BillKaro uses `@prisma/adapter-pg` (the Prisma PG driver adapter), which works with standard PostgreSQL connection strings.

#### Example: Setting up with Neon

1. Go to [neon.tech](https://neon.tech) → Create a project
2. Copy the connection string (it looks like `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)
3. You'll use this as `DATABASE_URL` in Step 3

### Step 2: Push Code to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Create a GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/billkaro.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Vercel

#### Option A: Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Configure the project:

   | Setting            | Value                      |
   | ------------------ | -------------------------- |
   | Framework Preset   | **Next.js** (auto-detected)|
   | Root Directory     | `./` (default)             |
   | Build Command      | `prisma generate && next build` |
   | Output Directory   | `.next` (default)          |
   | Install Command    | `npm install` (default)    |

4. Add **Environment Variables**:

   | Name               | Value                                              |
   | ------------------ | -------------------------------------------------- |
   | `DATABASE_URL`     | Your PostgreSQL connection string from Step 1       |
   | `SESSION_SECRET`   | A 64-character random hex string (see generator above) |
   | `PLATFORM_MODE`    | `saas` (if you want multi-tenant SaaS features)    |

5. Click **Deploy**

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (follow the prompts)
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add SESSION_SECRET

# Deploy to production
vercel --prod
```

### Step 4: Run Database Migrations

After the first deployment, you need to apply migrations to your production database. There are two approaches:

#### Approach A: Build-time migration (Recommended)

Update the **Build Command** in Vercel project settings to:

```
prisma generate && prisma migrate deploy && next build
```

This runs migrations automatically on every deployment. The build process has access to `DATABASE_URL` and will apply any pending migrations before building the app.

#### Approach B: Manual migration (One-time setup)

Run from your local machine, pointing at the production database:

```bash
# Set the production DATABASE_URL temporarily
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" npx prisma migrate deploy
```

### Step 5: Create the First User

After deployment, visit your Vercel URL and **Register** your business through the app UI at `/register`.

If running in SaaS mode (`PLATFORM_MODE=saas`), create a platform admin first:

```bash
# Locally, with production DATABASE_URL set
DATABASE_URL="postgresql://..." PLATFORM_ADMIN_PASSWORD="your-admin-password" npm run admin:create
```

### Step 6: Configure Custom Domain (Optional)

1. In Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add your domain (e.g., `app.billkaro.pk`)
3. Configure DNS as instructed by Vercel (CNAME or A record)

---

### Vercel-Specific Configuration

#### `next.config.ts`

The project already has `output: "standalone"` configured. Vercel handles this automatically — **no changes needed**.

```ts
// next.config.ts (already configured)
const nextConfig: NextConfig = {
  output: "standalone",
};
```

> **Note:** Vercel ignores the `standalone` output mode and uses its own optimized build pipeline. This setting is only used for Docker deployments.

#### Vercel Build Cache

Prisma client generation is cached by Vercel. If you change the schema and the build seems to use a stale client, add this to your build command:

```
prisma generate --no-hints && next build
```

Or add a `postinstall` script to `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

#### Serverless Function Limits

| Concern                 | Solution                                                              |
| ----------------------- | --------------------------------------------------------------------- |
| Cold starts             | Prisma uses `@prisma/adapter-pg` (lightweight driver adapter)         |
| Connection pooling      | Use a pooled connection string from your DB provider (Neon, Supabase) |
| Function timeout (10s)  | All BillKaro queries are optimized with proper indexes                |
| Bundle size             | Prisma client is tree-shaken; only used models are included           |

---

## Database Management

### Migrations

```bash
# Create a new migration after schema changes
npm run db:migrate

# Apply pending migrations (production)
npx prisma migrate deploy

# View migration status
npx prisma migrate status
```

### Seeding

```bash
# Seed demo data (Babar General Store)
npm run db:seed
# Login: babar@billkaro.pk / billkaro123
```

### Reconcile Balances

If customer cached balances get out of sync, rebuild them from the ledger:

```bash
npm run db:reconcile
```

### Database Studio (GUI)

```bash
npx prisma studio
# Opens a web GUI at http://localhost:5555
```

---

## NPM Scripts Reference

| Script                 | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Start Next.js dev server (http://localhost:3000)            |
| `npm run dev:db`       | Start embedded PostgreSQL on port 5433                     |
| `npm run build`        | Production build                                           |
| `npm run start`        | Start production server                                    |
| `npm run lint`         | Run ESLint                                                 |
| `npm run typecheck`    | Run TypeScript type checking                               |
| `npm run db:migrate`   | Create a new Prisma migration                              |
| `npm run db:deploy`    | Apply pending migrations                                   |
| `npm run db:generate`  | Regenerate Prisma client                                   |
| `npm run db:seed`      | Seed database with demo data                               |
| `npm run db:reconcile` | Rebuild cached customer balances from ledger                |
| `npm run admin:create` | Create a platform superadmin (SaaS mode)                   |

---

## Project Structure

```
billkaro/
├── prisma/
│   ├── schema.prisma          # Database schema (26 models)
│   ├── migrations/            # Migration history
│   └── seed.ts                # Demo data seeder
├── docker/
│   └── entrypoint.sh          # Container startup script
├── scripts/
│   ├── dev-db.ts              # Embedded PostgreSQL launcher
│   ├── reconcile-balances.ts  # Balance reconciliation
│   ├── create-platform-admin.ts
│   └── generate-icons.ts
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, Register pages
│   │   ├── (app)/             # Authenticated app shell
│   │   │   ├── dashboard/     # Business dashboard
│   │   │   ├── bill/          # POS / New Bill screen
│   │   │   ├── bills/         # Bill history & search
│   │   │   ├── products/      # Product catalogue
│   │   │   ├── brands/        # Brand management
│   │   │   ├── categories/    # Category management
│   │   │   ├── units/         # Unit management
│   │   │   ├── customers/     # Customer directory
│   │   │   ├── khata/         # Udhaar Khata (credit ledger)
│   │   │   ├── ledger/        # Full ledger view
│   │   │   ├── quotations/    # Quotation management
│   │   │   ├── reports/       # Business reports
│   │   │   ├── users/         # User & role management
│   │   │   └── settings/      # Business settings
│   │   ├── (platform)/        # SaaS admin portal
│   │   └── api/               # Route handlers (XLSX, print)
│   ├── server/
│   │   ├── auth/              # Session, passwords, guards
│   │   ├── db.ts              # Prisma singleton
│   │   └── services/          # Business logic layer
│   │       ├── billing.ts     # Sale creation (atomic txn)
│   │       ├── catalogue.ts   # Products, brands, categories, units
│   │       ├── customers.ts   # Customer CRUD
│   │       ├── ledger.ts      # Udhaar ledger entries
│   │       ├── payments.ts    # Payment processing
│   │       ├── pricing.ts     # Price updates & history
│   │       ├── quotations.ts  # Quotation management
│   │       ├── reports.ts     # Business analytics
│   │       ├── import-export.ts # XLSX import/export
│   │       └── settings.ts    # Business configuration
│   ├── lib/                   # Utilities (money, format, i18n)
│   ├── components/            # UI components (shadcn + custom)
│   └── hooks/                 # React hooks
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # One-command offline install
├── next.config.ts             # Next.js configuration
├── prisma.config.ts           # Prisma configuration
├── .env.example               # Environment template
└── package.json
```

---

## Troubleshooting

### Prisma: "Unknown field" errors after schema changes

The generated Prisma client is stale. Fix:

```bash
npx prisma generate          # Regenerate client
Remove-Item -Recurse -Force .next   # Windows: clear Next.js cache
rm -rf .next                        # Linux/Mac: clear Next.js cache
npm run dev                          # Restart dev server
```

### Vercel build fails with Prisma errors

Ensure `prisma generate` runs before `next build`. Set your build command to:

```
prisma generate && next build
```

Or add a `postinstall` script:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Port already in use (Windows)

```powershell
# Find the process using port 3000
netstat -ano | findstr :3000

# Kill it (replace PID with actual PID)
taskkill /PID <PID> /F
```

### Database connection refused

- **Local dev:** Make sure `npm run dev:db` is running in another terminal
- **Docker:** Check container health: `docker compose ps`
- **Vercel:** Verify `DATABASE_URL` is correct and the database allows connections from Vercel's IP range (most managed providers allow all IPs by default)

### Vercel: Cold start timeouts

If serverless functions time out on cold starts:

1. Use a **pooled connection string** from your database provider
2. Consider enabling Vercel's **Fluid Compute** for longer function execution
3. Ensure your database is in the **same region** as your Vercel deployment

### Docker: Reset everything

```bash
docker compose down -v   # ⚠️ This deletes all data!
docker compose up -d --build
```

---

## Security Notes

- **Session cookies** are HTTP-only, SameSite=Lax, signed with HS256 (jose)
- **Passwords** are hashed with bcryptjs (cost 11)
- **Every database query** is scoped by `businessId` — no cross-tenant data leaks
- **No secrets** are ever sent to the client bundle
- **Rate limiting** on login/register endpoints (in-memory token bucket)

---

## License

See [LICENSE](LICENSE) for details.
