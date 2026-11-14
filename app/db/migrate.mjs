// Aplica db/schema.sql no banco de DATABASE_URL. Uso: node --env-file=.env.local db/migrate.mjs
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const sql = neon(process.env.DATABASE_URL);
const text = readFileSync(new URL("./schema.sql", import.meta.url), "utf8").replace(/--[^\n]*/g, "");
for (const stmt of text.split(";").map((s) => s.trim()).filter(Boolean)) {
  await sql.query(stmt);
}
console.log("Esquema aplicado.");
