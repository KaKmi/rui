import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('✗ DATABASE_URL is empty');
    process.exit(1);
  }

  const sql = neon(url);
  const t0 = Date.now();
  const rows = (await sql`SELECT version() AS v, current_database() AS db, now() AS ts`) as Array<{
    v: string;
    db: string;
    ts: string;
  }>;
  const dt = Date.now() - t0;
  const r = rows[0]!;
  console.log(`✓ Connected in ${dt}ms`);
  console.log(`  database:    ${r.db}`);
  console.log(`  server time: ${r.ts}`);
  console.log(`  version:     ${r.v.split(' on ')[0]}`);
}

main().catch((e: unknown) => {
  console.error('✗ Connection failed:');
  console.error('  ', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
