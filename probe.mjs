import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const vars = readFileSync("/workspaces/Masar_Backend/.dev.vars", "utf8");
const dbUrl = vars.split("\n").find(l => l.startsWith("DATABASE_URL="))?.slice("DATABASE_URL=".length);
if (!dbUrl) { console.error("No DATABASE_URL"); process.exit(1); }

const sql = neon(dbUrl);

const tables = process.argv[2];

if (tables) {
  const cols = await sql`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name = ${tables} ORDER BY ordinal_position`;
  console.log(`\n=== ${tables} ===`);
  cols.forEach(c => console.log(`${c.column_name}: ${c.data_type}`));
} else {
  const all = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
  console.log("All tables:", JSON.stringify(all.map(r => r.tablename)));
}
