import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Client, Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Autoscale instances must fail fast instead of holding requests open while
  // the database is unavailable or a cold connection cannot be established.
  connectionTimeoutMillis: 1_500,
  idleTimeoutMillis: 30_000,
  query_timeout: 1_500,
  statement_timeout: 1_500,
  max: 5,
});
export const db = drizzle(pool, { schema });

export async function checkDatabaseReadiness(timeoutMs = 1_500): Promise<void> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: timeoutMs,
    query_timeout: timeoutMs,
    statement_timeout: timeoutMs,
  });
  let timedOut = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const check = (async () => {
    await client.connect();
    await client.query("select 1");
  })();
  // Prevent a late connection/query rejection from becoming unhandled after
  // the timeout branch has already returned a readiness failure.
  void check.catch(() => undefined);

  try {
    await Promise.race([
      check,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          timedOut = true;
          void client.end().catch(() => undefined);
          reject(new Error("Database readiness check timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (!timedOut) await client.end().catch(() => undefined);
  }
}

export * from "./schema";
