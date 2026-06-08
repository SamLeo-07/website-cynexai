/**
 * fix-final.mjs — copies the 4 missing sessions then retries attendance_logs + attendance_summary
 */
import { createClient } from '@libsql/client';

const OLD_URL   = 'libsql://cynex-ai-cynexai-26.aws-ap-south-1.turso.io';
const OLD_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzE0OTg3MzEsImlkIjoiMGFkMjkzZDctNmM1My00NGRkLWI1ZDQtOGJlNTRmODllZDgxIiwicmlkIjoiMDdjMGZkNmUtMzEwMC00NGZlLTliNDQtMDVkNDdlODIxNmNmIn0.jZ5fYZJ6Jkb7NG8AgurnoKNRb9hVTrc-S3rjxQRXE4oj55TxLPgqMyPfAlvigqMTHHAwRSDZLzGvpJ7QQcp2AA';
const NEW_URL   = 'libsql://cynex-ai-cynexai.aws-ap-south-1.turso.io';
const NEW_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA5MTk5MzYsImlkIjoiMDE5ZWE3MTktNzkwMS03Y2Y3LTgxNDItYmI3ZTdhY2RiZGUyIiwicmlkIjoiZDhlZjQ2NjQtNGZjNy00MTc0LWJlMTItOWIwNDczN2RjNGIyIn0.nzy6qJrwAHywKfZwRZ28eMJFbD20IFojBH-tYxX1xS8Ouaokn7SZcKT2FiG_M5umsbw9HN24TXc0vsKgOJlhDw';

const MISSING_SESSION_IDS = [
  'session_1zgobnqtm',
  'session_skqud30qh',
  'session_vy2s75x4j',
  'session_erswxh11l',
];

async function copyRows(srcDb, dstDb, table, whereClause, args) {
  const res = await srcDb.execute({ sql: `SELECT * FROM "${table}" WHERE ${whereClause}`, args });
  if (res.rows.length === 0) { console.log(`  No rows found in '${table}' for: ${args}`); return 0; }
  const columns = Object.keys(res.rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
  let ok = 0;
  for (const row of res.rows) {
    const rowArgs = columns.map(col => {
      const v = row[col];
      if (typeof v === 'bigint') return Number(v);
      return v ?? null;
    });
    try { await dstDb.execute({ sql, args: rowArgs }); ok++; }
    catch (e) { console.warn(`  ⚠️  ${e.message.substring(0, 80)}`); }
  }
  console.log(`  ✅ '${table}': inserted ${ok}/${res.rows.length} rows.`);
  return ok;
}

async function run() {
  const srcDb = createClient({ url: OLD_URL, authToken: OLD_TOKEN });
  const dstDb = createClient({ url: NEW_URL, authToken: NEW_TOKEN });
  console.log('✅ Connected.\n');

  // Step 1: Copy the 4 missing sessions
  console.log('🔧 Step 1 — Copy 4 missing sessions to destination...');
  for (const sid of MISSING_SESSION_IDS) {
    await copyRows(srcDb, dstDb, 'sessions', 'id = ?', [sid]);
  }

  // Verify
  console.log('\n📋 Verifying sessions now exist in destination...');
  for (const sid of MISSING_SESSION_IDS) {
    const r = await dstDb.execute({ sql: 'SELECT id FROM sessions WHERE id = ?', args: [sid] });
    console.log(`  ${sid}: ${r.rows.length > 0 ? '✅ EXISTS' : '❌ STILL MISSING'}`);
  }

  // Step 2: Retry attendance_logs
  console.log('\n🔧 Step 2 — Retry attendance_logs...');
  await copyRows(srcDb, dstDb, 'attendance_logs', '1=1', []);

  // Step 3: Retry attendance_summary
  console.log('\n🔧 Step 3 — Retry attendance_summary...');
  await copyRows(srcDb, dstDb, 'attendance_summary', '1=1', []);

  // Final counts
  console.log('\n📊 Final row counts:');
  for (const t of ['sessions', 'attendance_logs', 'attendance_summary', 'users']) {
    const r = await dstDb.execute(`SELECT COUNT(*) as cnt FROM "${t}"`);
    console.log(`   ${t}: ${Number(r.rows[0].cnt)} rows`);
  }
  console.log('\n✅ All done!');
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
