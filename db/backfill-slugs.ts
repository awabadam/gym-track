import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  await sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS slug text`;

  await sql`UPDATE programs SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g')) WHERE slug IS NULL`;

  await sql`ALTER TABLE programs ALTER COLUMN slug SET NOT NULL`;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS programs_slug_unique ON programs (slug)`;

  const rows = await sql`SELECT id, name, slug FROM programs`;
  console.log("Backfilled slugs:", rows);
}

main().catch(console.error);
