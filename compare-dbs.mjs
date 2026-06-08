/**
 * compare-dbs.mjs — Compare row counts between OLD and NEW Turso databases
 * Shows exactly what's missing in the new database.
 */
import { createClient } from '@libsql/client';

const OLD_URL   = 'libsql://cynex-ai-cynexai-26.aws-ap-south-1.turso.io';
const OLD_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzE0OTg3MzEsImlkIjoiMGFkMjkzZDctNmM1My00NGRkLWI1ZDQtOGJlNTRmODllZDgxIiwicmlkIjoiMDdjMGZkNmUtMzEwMC00NGZlLTliNDQtMDVkNDdlODIxNmNmIn0.jZ5fYZJ6Jkb7NG8AgurnoKNRb9hVTrc-S3rjxQRXE4oj55TxLPgqMyPfAlvigqMTHHAwRSDZLzGvpJ7QQcp2AA';

const NEW_URL   = 'libsql://cynex-ai-cynexai.aws-ap-south-1.turso.io';
const NEW_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA5MTk5MzYsImlkIjoiMDE5ZWE3MTktNzkwMS03Y2Y3LTgxNDItYmI3ZTdhY2RiZGUyIiwicmlkIjoiZDhlZjQ2NjQtNGZjNy00MTc0LWJlMTItOWIwNDczN2RjNGIyIn0.nzy6qJrwAHywKfZwRZ28eMJFbD20IFojBH-tYxX1xS8Ouaokn7SZcKT2FiG_M5umsbw9HN24TXc0vsKgOJlhDw';

async function getTableNames(db) {
  const res = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  return res.rows.map(r => r.name);
}

async function getCount(db, table) {
  try {
    const res = await db.execute(`SELECT COUNT(*) as cnt FROM "${table}"`);
    return Number(res.rows[0]?.cnt ?? 0);
  } catch { return -1; }
}

async function run() {
  const srcDb = createClient({ url: OLD_URL, authToken: OLD_TOKEN });
  const dstDb = createClient({ url: NEW_URL, authToken: NEW_TOKEN });

  const srcTables = await getTableNames(srcDb);
  const dstTables = await getTableNames(dstDb);
  const allTables = [...new Set([...srcTables, ...dstTables])].sort();

  console.log('\n' + '='.repeat(70));
  console.log('  Table Comparison: OLD vs NEW Database');
  console.log('='.repeat(70));
  console.log(`  ${'TABLE'.padEnd(35)} ${'OLD'.padEnd(8)} ${'NEW'.padEnd(8)} STATUS`);
  console.log('-'.repeat(70));

  const issues = [];

  for (const table of allTables) {
    const srcCount = srcTables.includes(table) ? await getCount(srcDb, table) : -1;
    const dstCount = dstTables.includes(table) ? await getCount(dstDb, table) : -1;

    let status = '✅ OK';
    if (srcCount === -1) status = '⚠️  Only in NEW';
    else if (dstCount === -1) status = '❌ MISSING from NEW';
    else if (srcCount > dstCount) { status = `❌ MISSING ${srcCount - dstCount} rows`; issues.push({ table, srcCount, dstCount, missing: srcCount - dstCount }); }
    else if (srcCount === 0 && dstCount === 0) status = '—  both empty';

    const srcStr = srcCount === -1 ? 'N/A' : String(srcCount);
    const dstStr = dstCount === -1 ? 'N/A' : String(dstCount);
    console.log(`  ${table.padEnd(35)} ${srcStr.padEnd(8)} ${dstStr.padEnd(8)} ${status}`);
  }

  if (issues.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('  ❌ Tables needing re-migration:');
    for (const i of issues) {
      console.log(`     ${i.table}: OLD has ${i.srcCount}, NEW has ${i.dstCount} (missing ${i.missing})`);
    }
  }

  // Deep dive: certificates
  console.log('\n' + '='.repeat(70));
  console.log('  🔍 Certificates deep-dive (OLD database):');
  try {
    const certs = await srcDb.execute('SELECT * FROM certificates ORDER BY created_at DESC');
    console.log(`  Total: ${certs.rows.length} rows`);
    for (const r of certs.rows) {
      console.log(`    id=${r.id} | student_id=${r.student_id} | course_id=${r.course_id} | issued_at=${r.issued_at || r.created_at}`);
    }
  } catch (e) { console.log('  Error:', e.message); }

  console.log('\n  🔍 Certificates deep-dive (NEW database):');
  try {
    const certs = await dstDb.execute('SELECT * FROM certificates ORDER BY created_at DESC');
    console.log(`  Total: ${certs.rows.length} rows`);
    for (const r of certs.rows) {
      console.log(`    id=${r.id} | student_id=${r.student_id} | course_id=${r.course_id} | issued_at=${r.issued_at || r.created_at}`);
    }
  } catch (e) { console.log('  Error:', e.message); }

  console.log('\n' + '='.repeat(70));
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
