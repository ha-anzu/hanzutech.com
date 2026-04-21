# N2Jewelry Inventory (Open Tool)

Standalone inventory and manufacturing module for N2Jewelry, separate from the Calculator app.

## Features in this implementation

- Product -> Variant -> SKU -> Barcode lifecycle
- Code 128 barcode generation endpoint
- Metal lot tracking (grams + cost)
- Inventory movement engine with negative-stock guard and admin override
- Production orders with lot consumption + completion
- Consignment shipment + settlement flows
- Digital asset repository with S3 presigned upload/download
- Scanner support:
  - Keyboard wedge capture UI
  - LAN scanner ingestion endpoint
  - Camera scan fallback on supported browsers
- Role model: Admin, Production, Warehouse, Sales, Viewer

## Run locally

1. `cd open-tool/n2jewelry-inventory`
2. Copy `.env.example` to `.env.local`
3. Set `DATABASE_URL` and S3 env vars
4. `npm install`
5. `npm run dev`

## Endpoints

- `GET/POST /api/products`
- `GET/POST /api/variants`
- `GET/POST /api/skus`
- `GET/POST /api/barcodes` (`GET ?value=...` returns Code128 PNG)
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
- `GET /api/scan/events` (SSE)
