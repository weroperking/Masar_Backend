import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const dbCache = new Map<string, ReturnType<typeof drizzle>>();

export function createDb(databaseUrl: string) {
  if (!dbCache.has(databaseUrl)) {
    const sql = neon(databaseUrl);
    dbCache.set(databaseUrl, drizzle(sql, { schema }));
  }
  return dbCache.get(databaseUrl)!;
}

export { schema };
