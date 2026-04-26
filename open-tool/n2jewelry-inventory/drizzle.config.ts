import "dotenv/config";
import type { Config } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Drizzle. Set it in .env.local or your shell environment.");
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl
  }
} satisfies Config;
