import fs from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.GOLDAPI_KEY;
if (!apiKey) {
  throw new Error('Missing GOLDAPI_KEY environment variable.');
}

const metals = ['XAU', 'XAG', 'XPT', 'XPD'];

async function fetchPricePerGramUsd(symbol) {
  const response = await fetch(`https://www.goldapi.io/api/${symbol}/USD`, {
    headers: {
      'x-access-token': apiKey,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GoldAPI request failed for ${symbol}: ${response.status} ${body}`);
  }
  const data = await response.json();
  const perGram = Number(data.price) / 31.1034768;
  if (!Number.isFinite(perGram)) {
    throw new Error(`Invalid price payload for ${symbol}`);
  }
  return Number(perGram.toFixed(6));
}

async function run() {
  const prices = {};
  for (const symbol of metals) {
    prices[symbol] = {
      price_per_gram_usd: await fetchPricePerGramUsd(symbol)
    };
  }

  const output = {
    updated_at: new Date().toISOString(),
    base_currency: 'USD',
    source: 'goldapi.io',
    notes: 'Auto-updated daily at 12:00 Asia/Bangkok by GitHub Actions. Values are USD per gram.',
    prices
  };

  const repoRoot = process.cwd();
  const targetPath = path.join(repoRoot, 'Calculator', 'daily-metal-prices.json');
  await fs.writeFile(targetPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Updated ${targetPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
