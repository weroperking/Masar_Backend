import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const sql = neon(process.env.DATABASE_URL);

// Read, strip -- comments, then split on ;
const raw = readFileSync("./drizzle/0012_lookup_codes.sql", "utf8");
const noComments = raw
  .split("\n")
  .map(line => line.replace(/--.*$/, ""))
  .join("\n");

const statements = noComments
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Running ${statements.length} statements`);

for (const stmt of statements) {
  const firstLine = stmt.split("\n").find(l => l.trim().length > 0) || "";
  console.log("→", firstLine.slice(0, 90));
  await sql.query(stmt);
}

console.log("Migration complete.");
