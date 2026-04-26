# Vercel + Neon Deployment Checklist

## 1. Database (Neon)

- Create Neon project/database
- Copy pooled `DATABASE_URL` with `sslmode=require`
- Run schema:
  - `npm run db:generate`
  - `npm run db:push`
- Optional initial import:
  - `npm run seed:excel -- --file "<path-to-file.xlsx>"`

## 2. Vercel Project

- Import repository into Vercel
- Framework preset: Next.js
- Build command: `npm run build`
- Output: default `.next`

## 3. Production Environment Variables

- `DATABASE_URL`
- `APP_BASE_URL` (your Vercel domain)
- `FALLBACK_SILVER_USD_PER_GRAM`
- `FALLBACK_GOLD_USD_PER_GRAM`
- `FALLBACK_DIAMOND_USD_PER_CARAT`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`

## 4. Pre-Deploy Verification (Local)

- `npm install`
- `npm run check`
- `npm run build`

## 5. First Production Smoke Test

- Open `/` and verify dashboard stats load
- Switch roles in top bar and verify route access behavior
- Open `/settings` as Admin and save market + storage settings
- Create product + variant at `/products`
- Run `Sync Pricing`
- Test barcode scan flow on `/scan`
- Test one movement on `/inventory`
- Test one order on `/production`
- Test one shipment/settlement on `/consignment`

## 6. Team Onboarding (3-4 users)

- Assign each user role policy:
  - Admin (1)
  - Production (1)
  - Warehouse (1)
  - Sales (1)
- Validate each role sees only permitted modules
- Do one shared UAT run with real scanner device and one sample label print
