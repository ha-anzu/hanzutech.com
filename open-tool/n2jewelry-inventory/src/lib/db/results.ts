import type { QueryResult, QueryResultRow } from "pg";

export function oneRow<T extends QueryResultRow>(result: T[] | QueryResult<T>, context: string): T {
  const row = Array.isArray(result) ? result[0] : result.rows[0];
  if (!row) {
    throw new Error(`${context} returned no rows`);
  }

  return row;
}
