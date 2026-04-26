# N2Jewelry Inventory Setup Guide (Team Edition)

This guide is for non-developer daily operations and first-time environment setup.

## 1. What you need

- Node.js 20+ (Node 22 recommended)
- npm 10+
- Neon Postgres database
- Vercel project
- S3-compatible storage (for product images/assets)

## 2. Local setup

From:

`open-tool/n2jewelry-inventory`

Run:

```bash
npm install
```

Create `.env.local`:

```env
DATABASE_URL="postgresql://<user>:<pass>@<host>/<db>?sslmode=require"
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

Apply DB schema:

```bash
npm run db:push
```

Run checks:

```bash
npm run check
```

Start app:

```bash
npm run dev
```

Open:

- `http://localhost:3020`

## 3. First admin setup (important)

1. Open `/settings` as `Admin`
2. Set:
   - Silver / Gold / Diamond market references
   - Label printer defaults (58mm/80mm)
   - S3 storage endpoint/region/bucket/public URL
3. Save all sections
4. Go to `/products` and run **Sync Pricing**

## 4. Product import flow (Excel)

1. Open `/products`
2. Click **Import from Excel**
3. Upload your `Product Data.xlsx` (first sheet used)
4. Confirm summary message (products/variants/categories imported)

Supported headers include:
- `productCode`, `name`, `description`
- `category`, `collection` / `subcategory`
- `style`, `size`, `color`, `finish`, `material`

## 5. Role-based usage

- `Admin`: full access
- `Production`: products + inventory + production + scanner
- `Warehouse`: inventory + scanner
- `Sales`: products + consignment
- `Viewer`: dashboard only

Use the role dropdown in the top bar for team testing/onboarding.

## 6. Vercel deployment setup

In Vercel Project Settings -> Environment Variables, set:

- `DATABASE_URL`
- `APP_BASE_URL` (your Vercel URL/domain)
- `FALLBACK_SILVER_USD_PER_GRAM`
- `FALLBACK_GOLD_USD_PER_GRAM`
- `FALLBACK_DIAMOND_USD_PER_CARAT`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`

Then deploy:

```bash
npx vercel deploy -y --no-wait
```

Check status:

```bash
npx vercel inspect <deployment-url>
```

## 7. Daily startup checklist

1. Dashboard loads with no error banners
2. `/api/system/db-status` shows connected
3. Scanner page accepts wedge scan input
4. Product pricing sync runs without errors
5. Inventory/production/consignment pages open and load tables
