import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { consignmentAccounts, consignmentSettlements, consignmentShipments, inventoryBalances, locations, products, skus, variants } from "@/lib/db/schema";

export type ConsignmentWorkspaceData = {
  agents: Array<{
    id: string;
    accountCode: string;
    accountName: string;
    country: string;
    currency: string;
    locationId: string | null;
    locationName: string | null;
    currentStockValue: number;
    pendingSettlement: number;
    stockUnits: number;
  }>;
  shipments: Array<{
    id: string;
    shipmentCode: string;
    accountId: string;
    accountName: string;
    fromLocationId: string;
    fromLocationName: string;
    toLocationId: string;
    toLocationName: string;
    status: string;
    lines: Array<{ skuId: string; qty: number; unitPrice: number }>;
    createdAt: string;
  }>;
  settlements: Array<{
    id: string;
    settlementCode: string;
    shipmentId: string;
    accountName: string;
    soldAmount: number;
    cogs: number;
    agentPayout: number;
    grossProfit: number;
    createdAt: string;
    currency: string;
  }>;
  lookups: {
    accounts: Array<{ id: string; accountCode: string; accountName: string }>;
    skus: Array<{ id: string; skuCode: string; productName: string }>;
    sourceLocations: Array<{ id: string; name: string; type: string; specialMalaysia: boolean }>;
    agentLocations: Array<{ id: string; name: string }>;
  };
};

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asShipmentLines(value: unknown): Array<{ skuId: string; qty: number; unitPrice: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((line) => {
    const item = line as { skuId?: string; qty?: number; unitPrice?: number };
    return {
      skuId: String(item.skuId ?? ""),
      qty: Math.max(0, Math.trunc(toNumber(item.qty))),
      unitPrice: toNumber(item.unitPrice)
    };
  });
}

function asSoldLines(value: unknown): Array<{ skuId: string; soldQty: number; soldAmount: number; cogs?: number; agentPayout?: number; grossProfit?: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((line) => {
    const item = line as {
      skuId?: string;
      soldQty?: number;
      soldAmount?: number;
      cogs?: number;
      agentPayout?: number;
      grossProfit?: number;
    };
    return {
      skuId: String(item.skuId ?? ""),
      soldQty: Math.max(0, Math.trunc(toNumber(item.soldQty))),
      soldAmount: toNumber(item.soldAmount),
      cogs: toNumber(item.cogs),
      agentPayout: toNumber(item.agentPayout),
      grossProfit: toNumber(item.grossProfit)
    };
  });
}

function accountLocationCode(accountCode: string) {
  return `CONS-${accountCode}`.toUpperCase().slice(0, 50);
}

export async function getConsignmentWorkspaceData(): Promise<ConsignmentWorkspaceData> {
  const [accounts, shipments, settlements, allLocations, balances, skuRows, variantRows, productRows] = await Promise.all([
    db.select().from(consignmentAccounts),
    db.select().from(consignmentShipments),
    db.select().from(consignmentSettlements),
    db.select().from(locations),
    db.select().from(inventoryBalances),
    db.select().from(skus),
    db.select().from(variants),
    db.select().from(products)
  ]);

  const locationMap = new Map(allLocations.map((loc) => [loc.id, loc]));
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const skuMap = new Map(skuRows.map((sku) => [sku.id, sku]));
  const variantMap = new Map(variantRows.map((variant) => [variant.id, variant]));
  const productMap = new Map(productRows.map((product) => [product.id, product]));

  const agentLocationByAccountId = new Map<string, { id: string; name: string }>();
  for (const account of accounts) {
    const code = accountLocationCode(account.accountCode);
    const location = allLocations.find((loc) => loc.code === code) ?? allLocations.find((loc) => loc.name === `Consignment - ${account.accountName}`);
    if (location) {
      agentLocationByAccountId.set(account.id, { id: location.id, name: location.name });
    }
  }

  const shipmentWithDetails = shipments.map((shipment) => {
    const lines = asShipmentLines(shipment.lines);
    const account = accountMap.get(shipment.accountId);
    return {
      id: shipment.id,
      shipmentCode: shipment.shipmentCode,
      accountId: shipment.accountId,
      accountName: account?.accountName ?? "Unknown Agent",
      fromLocationId: shipment.fromLocationId,
      fromLocationName: locationMap.get(shipment.fromLocationId)?.name ?? "Unknown",
      toLocationId: shipment.toLocationId,
      toLocationName: locationMap.get(shipment.toLocationId)?.name ?? "Unknown",
      status: shipment.status,
      lines,
      createdAt: shipment.createdAt.toISOString()
    };
  });

  const settlementsWithDetails = settlements.map((settlement) => {
    const shipment = shipmentWithDetails.find((item) => item.id === settlement.shipmentId);
    const soldLines = asSoldLines(settlement.soldLines);

    const soldAmount = soldLines.reduce((sum, line) => sum + line.soldAmount, 0);
    const cogs = soldLines.reduce((sum, line) => sum + toNumber(line.cogs), 0);
    const agentPayout = soldLines.reduce((sum, line) => sum + toNumber(line.agentPayout), 0);
    const grossProfit = soldLines.reduce((sum, line) => sum + toNumber(line.grossProfit), 0);

    return {
      id: settlement.id,
      settlementCode: settlement.settlementCode,
      shipmentId: settlement.shipmentId,
      accountName: shipment?.accountName ?? "Unknown Agent",
      soldAmount,
      cogs,
      agentPayout,
      grossProfit,
      createdAt: settlement.createdAt.toISOString(),
      currency: settlement.currency
    };
  });

  const agents = accounts.map((account) => {
    const location = agentLocationByAccountId.get(account.id);
    const locationBalances = location ? balances.filter((balance) => balance.locationId === location.id) : [];

    let currentStockValue = 0;
    let stockUnits = 0;

    for (const balance of locationBalances) {
      stockUnits += balance.qtyOnHand;
      const shipmentLines = shipmentWithDetails
        .filter((shipment) => shipment.accountId === account.id)
        .flatMap((shipment) => shipment.lines)
        .filter((line) => line.skuId === balance.skuId);

      const latestUnitPrice = shipmentLines.length ? shipmentLines[shipmentLines.length - 1].unitPrice : 0;
      currentStockValue += balance.qtyOnHand * latestUnitPrice;
    }

    const pendingSettlement = shipmentWithDetails
      .filter((shipment) => shipment.accountId === account.id)
      .reduce((sum, shipment) => {
        const settled = settlementsWithDetails
          .filter((settlement) => settlement.shipmentId === shipment.id)
          .reduce((inner, settlement) => inner + settlement.soldAmount, 0);
        const shippedValue = shipment.lines.reduce((inner, line) => inner + line.qty * line.unitPrice, 0);
        return sum + Math.max(0, shippedValue - settled);
      }, 0);

    return {
      id: account.id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      country: account.country,
      currency: account.currency,
      locationId: location?.id ?? null,
      locationName: location?.name ?? null,
      currentStockValue,
      pendingSettlement,
      stockUnits
    };
  });

  return {
    agents,
    shipments: shipmentWithDetails.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    settlements: settlementsWithDetails.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    lookups: {
      accounts: accounts.map((account) => ({ id: account.id, accountCode: account.accountCode, accountName: account.accountName })),
      skus: skuRows.map((sku) => {
        const variant = variantMap.get(sku.variantId);
        const product = variant ? productMap.get(variant.productId) : null;
        return {
          id: sku.id,
          skuCode: sku.skuCode,
          productName: product?.name ?? "Unknown Product"
        };
      }),
      sourceLocations: allLocations
        .filter((location) => location.type === "Factory" || location.type === "Warehouse" || location.type === "Branch")
        .map((location) => ({
          id: location.id,
          name: location.name,
          type: location.type,
          specialMalaysia: location.name.toLowerCase().includes("malaysia")
        })),
      agentLocations: Array.from(agentLocationByAccountId.values())
    }
  };
}

export async function ensureAgentLocation(accountId: string) {
  const [account] = await db.select().from(consignmentAccounts).where(eq(consignmentAccounts.id, accountId));
  if (!account) {
    throw new Error("Agent account not found");
  }

  const expectedCode = accountLocationCode(account.accountCode);
  const [existing] = await db.select().from(locations).where(eq(locations.code, expectedCode));
  if (existing) {
    return existing;
  }

  return oneRow(
    await db
      .insert(locations)
      .values({
        code: expectedCode,
        name: `Consignment - ${account.accountName}`,
        type: "Agent",
        currency: account.currency
      })
      .returning(),
    "Create agent location"
  );
}
