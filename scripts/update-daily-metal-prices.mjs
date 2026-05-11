import fs from 'node:fs/promises';
import path from 'node:path';

const TROY_OUNCE_GRAMS = 31.1034768;
const metals = ['XAU', 'XAG', 'XPT', 'XPD'];
const targetPath = path.join(process.cwd(), 'Calculator', 'daily-metal-prices.json');

const bootstrapSnapshot = {
  updated_at: '2026-05-08T12:00:00+07:00',
  base_currency: 'USD',
  unit: 'USD_per_gram',
  source: 'manual_market_snapshot',
  status: 'bootstrap_fallback',
  fallback_reason: 'Seeded from the latest verified market close available when hardening the updater.',
  notes: 'Values are USD per gram. The GitHub Actions updater replaces these with GoldAPI.io prices when GOLDAPI_KEY is configured.',
  prices: {
    XAU: { price_per_gram_usd: 151.591735, source_price_per_troy_ounce_usd: 4715.03 },
    XAG: { price_per_gram_usd: 2.583312, source_price_per_troy_ounce_usd: 80.35 },
    XPT: { price_per_gram_usd: 66.079429, source_price_per_troy_ounce_usd: 2055.30 },
    XPD: { price_per_gram_usd: 48.033215, source_price_per_troy_ounce_usd: 1494.00 }
  }
};

function round(value, places = 6) {
  return Number(value.toFixed(places));
}

function isFinitePrice(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function hasCompletePriceSet(snapshot) {
  return metals.every((symbol) => isFinitePrice(snapshot?.prices?.[symbol]?.price_per_gram_usd));
}

function normalizePriceEntry(entry, inheritedSource) {
  const pricePerGram = Number(entry.price_per_gram_usd);
  const sourcePricePerTroyOunce = isFinitePrice(entry.source_price_per_troy_ounce_usd)
    ? Number(entry.source_price_per_troy_ounce_usd)
    : round(pricePerGram * TROY_OUNCE_GRAMS, 2);

  return {
    price_per_gram_usd: round(pricePerGram),
    source_price_per_troy_ounce_usd: sourcePricePerTroyOunce,
    source: entry.source || inheritedSource
  };
}

function normalizeSnapshot(snapshot, status, reason) {
  const source = snapshot.source || 'previous_snapshot';
  const prices = {};
  for (const symbol of metals) {
    prices[symbol] = normalizePriceEntry(snapshot.prices[symbol], source);
  }

  return {
    updated_at: snapshot.updated_at || bootstrapSnapshot.updated_at,
    base_currency: 'USD',
    unit: 'USD_per_gram',
    source,
    status,
    fallback_reason: reason,
    notes: 'Values are USD per gram. Live daily updates use GoldAPI.io; fallback snapshots are clearly marked.',
    prices
  };
}

async function readExistingSnapshot() {
  try {
    const raw = await fs.readFile(targetPath, 'utf8');
    const parsed = JSON.parse(raw);
    return hasCompletePriceSet(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchJsonWithRetry(url, options, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const body = await response.text();
      if (!response.ok) {
        throw new Error(`${response.status} ${body.slice(0, 500)}`);
      }
      return JSON.parse(body);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }
  throw lastError;
}

async function fetchPricePerGramUsd(symbol, apiKey) {
  const data = await fetchJsonWithRetry(`https://www.goldapi.io/api/${symbol}/USD`, {
    headers: {
      'x-access-token': apiKey,
      'Content-Type': 'application/json'
    }
  });

  const pricePerTroyOunce = Number(data.price);
  const pricePerGram = pricePerTroyOunce / TROY_OUNCE_GRAMS;
  if (!isFinitePrice(pricePerGram)) {
    throw new Error(`Invalid price payload for ${symbol}`);
  }

  return {
    price_per_gram_usd: round(pricePerGram),
    source_price_per_troy_ounce_usd: round(pricePerTroyOunce, 2),
    source: 'goldapi.io'
  };
}

async function writeSnapshot(snapshot) {
  await fs.writeFile(targetPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`Updated ${targetPath}`);
  console.log(`Snapshot status: ${snapshot.status}`);
  if (snapshot.fallback_reason) {
    console.log(`Fallback reason: ${snapshot.fallback_reason}`);
  }
}

async function run() {
  const apiKey = process.env.GOLDAPI_KEY?.trim();
  const existingSnapshot = await readExistingSnapshot();
  const fallbackSnapshot = existingSnapshot
    ? normalizeSnapshot(existingSnapshot, 'stale_fallback', 'GoldAPI was unavailable; using the last valid saved snapshot.')
    : normalizeSnapshot(bootstrapSnapshot, 'bootstrap_fallback', bootstrapSnapshot.fallback_reason);

  if (!apiKey) {
    fallbackSnapshot.status = existingSnapshot ? 'stale_fallback' : 'bootstrap_fallback';
    fallbackSnapshot.fallback_reason = 'Missing GOLDAPI_KEY; using the best available saved snapshot.';
    await writeSnapshot(fallbackSnapshot);
    return;
  }

  const prices = {};
  const failures = {};
  for (const symbol of metals) {
    try {
      prices[symbol] = await fetchPricePerGramUsd(symbol, apiKey);
    } catch (error) {
      failures[symbol] = error.message;
      prices[symbol] = fallbackSnapshot.prices[symbol];
    }
  }

  const failedSymbols = Object.keys(failures);
  const snapshot = {
    updated_at: new Date().toISOString(),
    base_currency: 'USD',
    unit: 'USD_per_gram',
    source: failedSymbols.length ? 'goldapi.io_with_fallbacks' : 'goldapi.io',
    status: failedSymbols.length ? 'partial_fallback' : 'live',
    fallback_reason: failedSymbols.length
      ? `GoldAPI failed for ${failedSymbols.join(', ')}; those symbols use the previous valid snapshot.`
      : null,
    failures,
    notes: 'Auto-updated daily at 12:00 Asia/Bangkok by GitHub Actions. Values are USD per gram.',
    prices
  };

  await writeSnapshot(snapshot);
}

run().catch(async (error) => {
  console.error(error);
  const existingSnapshot = await readExistingSnapshot();
  const fallbackSnapshot = existingSnapshot
    ? normalizeSnapshot(existingSnapshot, 'stale_fallback', `Updater crashed: ${error.message}`)
    : normalizeSnapshot(bootstrapSnapshot, 'bootstrap_fallback', `Updater crashed: ${error.message}`);
  await writeSnapshot(fallbackSnapshot);
});
