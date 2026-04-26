# N2Jewelry Inventory

N2Jewelry inventory and manufacturing system built with Next.js 15, TypeScript, Drizzle ORM, Tailwind CSS v4, and shadcn/ui.

## Local Setup (Neon or Local Postgres)

### 1. Prerequisites

- Node.js 20+ (Node 22 recommended)
- npm 10+
- PostgreSQL database:
  - Option A: Neon Postgres
  - Option B: Local Postgres

### 2. Install dependencies

```bash
cd open-tool/n2jewelry-inventory
npm install
```

### 3. Configure environment

Create `.env.local`:

```env
# Neon example:
# DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Local Postgres example:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/n2inventory"

DATABASE_URL="postgresql://..."
APP_BASE_URL="http://localhost:3020"

FALLBACK_SILVER_USD_PER_GRAM="0.95"
FALLBACK_GOLD_USD_PER_GRAM="76"
FALLBACK_DIAMOND_USD_PER_CARAT="350"

S3_ENDPOINT=""
S3_REGION="ap-southeast-1"
S3_BUCKET="n2jewelry-assets"
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_PUBLIC_BASE_URL=""
```

### 4. Generate and apply DB schema

```bash
npm run db:generate
npm run db:push
```

### 5. Optional: seed/import from Excel script

```bash
npm run seed:excel -- --file "C:/absolute/path/to/your-data.xlsx"
```

### 6. Run checks

```bash
npm run check
```

### 7. Run development server

```bash
npm run dev
```

Open:
- `http://localhost:3020`
- `http://localhost:3020/products`
- `http://localhost:3020/inventory`
- `http://localhost:3020/scan`
- `http://localhost:3020/settings` (Admin only)

## Role-Based UI

Use the top bar role selector (`Admin`, `Production`, `Warehouse`, `Sales`, `Viewer`).

- `Admin`: all modules
- `Production`: products + inventory + production + scanner
- `Warehouse`: inventory + scanner
- `Sales`: products + consignment
- `Viewer`: dashboard only

Routes are enforced by middleware.

## Products Excel Import (UI)

On `/products`, click **Import from Excel**.

- Upload your `Product Data.xlsx`
- First sheet is read
- Auto-mapping supports common headers:
  - product: `productCode`, `name`, `description`
  - grouping: `category`, `collection/subcategory`
  - variant: `style`, `size`, `color`, `finish`, `material`
- Categories/products are upserted, variants are created

## Settings

Admin page: `/settings`

- **Market Reference Prices**
  - silver USD/gram
  - gold USD/gram
  - diamond USD/carat
- **Label Printer**
  - default size 58mm/80mm
  - printer name
  - default copies
- **S3/Object Storage**
  - endpoint
  - region
  - bucket
  - public base URL

Settings are persisted in `app_settings` and used by pricing sync and uploads.

## Core API Endpoints

- `GET/POST /api/products`
- `GET/POST /api/variants`
- `GET/POST /api/skus`
- `GET/POST /api/barcodes`
- `GET/POST /api/categories`
- `GET/POST /api/locations`
- `GET /api/inventory/balances`
- `POST /api/inventory/movements`
- `GET/POST /api/inventory/lots`
- `GET/POST /api/production/orders`
- `POST /api/production/consume`
- `POST /api/production/complete`
- `GET/POST /api/consignment/accounts`
- `GET/POST /api/consignment/shipments`
- `GET/POST /api/consignment/settlements`
- `POST /api/assets/upload`
- `GET /api/assets/[id]`
- `POST /api/scan/resolve`
- `POST /api/scan/ingest`
- `GET /api/scan/events`
- `GET /api/system/db-status`
- `GET /api/health`

## Deployment

- Use `npm run build:verify` before deploying
- See `docs/deployment-checklist.md` for Vercel + Neon rollout
