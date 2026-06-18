import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

// Applies pending migrations over Neon's HTTP driver. Run with the right env:
//   local: npx dotenv -e .env.local -- npm run db:migrate
//   prod:  env is provided by the platform (e.g. Vercel)
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function run() {
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("Migrations applied.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
