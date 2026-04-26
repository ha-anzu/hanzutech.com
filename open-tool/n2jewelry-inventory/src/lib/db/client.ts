import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DbGlobals = {
  pool?: Pool;
  db?: NodePgDatabase<typeof schema>;
};

const globalForDb = globalThis as unknown as DbGlobals;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  return url || "postgres://postgres:postgres@localhost:5432/n2inventory";
}

function createPool() {
  const connectionString = requireDatabaseUrl();

  return new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });
}

export const pool = globalForDb.pool ?? createPool();

if (!globalForDb.pool) {
  globalForDb.pool = pool;
}

export const db =
  globalForDb.db ??
  drizzle({
    client: pool,
    schema
  });

if (!globalForDb.db) {
  globalForDb.db = db;
}

export async function checkDatabaseConnection() {
  const result = await pool.query("select now() as now");

  return {
    ok: result.rowCount === 1,
    now: result.rows[0]?.now ?? null
  };
}
