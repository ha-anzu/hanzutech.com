<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/05a1a612-2634-4ad8-8761-ff1de4ed041e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Daily metal prices

`daily-metal-prices.json` is updated by `.github/workflows/update-daily-metal-prices.yml` at 12:00 Asia/Bangkok. The workflow needs the repository secret `GOLDAPI_KEY`.

If the secret is missing or GoldAPI fails, `scripts/update-daily-metal-prices.mjs` keeps the calculator usable by writing the last valid saved snapshot. If there is no valid saved snapshot, it writes the dated bootstrap fallback values and marks the JSON with `status` and `fallback_reason`. The calculator shows that status beside the metal unit price so operators know when to verify or override the spot price manually.
