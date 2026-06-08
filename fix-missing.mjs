/**
 * fix-missing.mjs — Fix all missing data between old and new database
 * 1. Shows certificate table schema and all data
 * 2. Copies missing sessions (13), attendance_logs (1), attendance_summary (2)
 */
import { createClient } from '@libsql/client';

const OLD_URL   = 'libsql://cynex-ai-cynexai-26.aws-ap-south-1.turso.io';
const OLD_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzE0OTg3MzEsImlkIjoiMGFkMjkzZDctNmM1My00NGRkLWI1ZDQtOGJlNTRmODllZDgxIiwicmlkIjoiMDdjMGZkNmUtMzEwMC00NGZlLTliNDQtMDVkNDdlODIxNmNmIn0.jZ5fYZJ6Jkb7NG8AgurnoKNRb9hVTrc-S3rjxQRXE4oj55TxLPgqMyPfAlvigqMTHHAwRSDZLzGvpJ7QQcp2AA';
const NEW_URL   = 'libsql://cynex-ai-cynexai.aws-ap-south-1.turso.io';
const NEW_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA5MTk5MzYsImlkIjoiMDE5ZWE3MTktNzkwMS03Y2Y3LTgxNDItYmI3ZTdhY2RiZGUyIiwicmlkIjoiZDhlZjQ2NjQtNGZjNy00MTc0LWJlMTItOWIwNDczN2RjNGIyIn0.nzy6qJrwAHywKfZwRZ28eMJFbD20IFojBH-tYxX1xS8Ouaokn7SZcKT2FiG_M5umsbw9HN24TXc0vsKgOJlhDw';

async function getColNames(db, table) {
  const res = await db.execute(`PRAGMA table_info("${table}")`);
  return res.rows.map(r => r.name);
}

async function getIds(db, table) {
  try {
    const res = await db.execute(`SELECT id FROM "${table}"`);
    return new Set(res.rows.map(r => r.id));
  } catch { return new Set(); }
}

async function copyMissingRows(srcDb, dstDb, table) {
  // Get all source rows
  const srcRes = await srcDb.execute(`SELECT * FROM "${table}"`);
  if (srcRes.rows.length === 0) { console.log(`  '${table}': source empty.`); return; }

  // Get IDs already in destination
  const dstIds = await getIds(dstDb, table);

  // Filter only missing rows
  const missing = srcRes.rows.filter(r => !dstIds.has(r.id));
  if (missing.length === 0) { console.log(`  '${table}': no missing rows.`); return; }

  console.log(`  '${table}': copying ${missing.length} missing rows...`);

  const columns = Object.keys(missing[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

  let ok = 0;
  for (const row of missing) {
    const args = columns.map(col => {
      const v = row[col];
      if (typeof v === 'bigint') return Number(v);
      return v ?? null;
    });
    try { await dstDb.execute({ sql, args }); ok++; }
    catch (e) { console.warn(`    ⚠️  ${e.message.substring(0, 80)}`); }
  }
  console.log(`  ✅ '${table}': inserted ${ok}/${missing.length} missing rows.`);
}

async function run() {
  const srcDb = createClient({ url: OLD_URL, authToken: OLD_TOKEN });
  const dstDb = createClient({ url: NEW_URL, authToken: NEW_TOKEN });

  // ── 1. Certificates deep-dive ───────────────────────────────────────────────
  console.log('\n' + '='.repeat(65));
  console.log('  CERTIFICATES — Schema & Data Audit');
  console.log('='.repeat(65));

  console.log('\n📐 OLD certificates schema:');
  const srcCols = await getColNames(srcDb, 'certificates');
  console.log('  Columns:', srcCols.join(', '));

  console.log('\n📐 NEW certificates schema:');
  const dstCols = await getColNames(dstDb, 'certificates');
  console.log('  Columns:', dstCols.join(', '));

  console.log('\n📋 OLD certificates data:');
  const srcCerts = await srcDb.execute('SELECT * FROM certificates');
  for (const r of srcCerts.rows) {
    const vals = Object.entries(r).map(([k,v]) => `${k}=${v}`).join(' | ');
    console.log('  ', vals);
  }

  console.log('\n📋 NEW certificates data:');
  const dstCerts = await dstDb.execute('SELECT * FROM certificates');
  for (const r of dstCerts.rows) {
    const vals = Object.entries(r).map(([k,v]) => `${k}=${v}`).join(' | ');
    console.log('  ', vals);
  }

  // Check for any columns in OLD not in NEW
  const missingCols = srcCols.filter(c => !dstCols.includes(c));
  if (missingCols.length > 0) {
    console.log(`\n⚠️  Columns in OLD missing from NEW: ${missingCols.join(', ')}`);
    console.log('  Adding missing columns to NEW...');
    for (const col of missingCols) {
      try {
        await dstDb.execute(`ALTER TABLE certificates ADD COLUMN "${col}" TEXT`);
        console.log(`  ✅ Added column '${col}' to certificates in NEW.`);
      } catch (e) { console.warn(`  ⚠️  ${e.message}`); }
    }
    // Re-copy all certificate rows to populate the new columns
    console.log('\n  Re-copying all certificates to fill new columns...');
    const columns = srcCols;
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO "certificates" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
    let ok = 0;
    for (const row of srcCerts.rows) {
      const args = columns.map(col => {
        const v = row[col];
        if (typeof v === 'bigint') return Number(v);
        return v ?? null;
      });
      try { await dstDb.execute({ sql, args }); ok++; }
      catch (e) { console.warn(`  ⚠️  ${e.message.substring(0, 80)}`); }
    }
    console.log(`  ✅ Re-copied ${ok}/${srcCerts.rows.length} certificate rows.`);
  } else {
    console.log('\n  ✅ Certificate schemas match — all columns present.');
  }

  // ── 2. Fix missing sessions ────────────────────────────────────────────────
  console.log('\n' + '='.repeat(65));
  console.log('  FIXING MISSING ROWS');
  console.log('='.repeat(65));

  console.log('\n🔧 Fixing sessions (missing 13)...');
  await copyMissingRows(srcDb, dstDb, 'sessions');

  console.log('\n🔧 Fixing attendance_logs (missing 1)...');
  await copyMissingRows(srcDb, dstDb, 'attendance_logs');

  console.log('\n🔧 Fixing attendance_summary (missing 2)...');
  await copyMissingRows(srcDb, dstDb, 'attendance_summary');

  // ── 3. Final verification ──────────────────────────────────────────────────
  console.log('\n' + '='.repeat(65));
  console.log('  FINAL VERIFICATION');
  console.log('='.repeat(65));
  for (const t of ['certificates', 'sessions', 'attendance_logs', 'attendance_summary', 'users', 'batches', 'courses']) {
    const s = await srcDb.execute(`SELECT COUNT(*) as cnt FROM "${t}"`);
    const d = await dstDb.execute(`SELECT COUNT(*) as cnt FROM "${t}"`);
    const sn = Number(s.rows[0].cnt), dn = Number(d.rows[0].cnt);
    const ok = sn <= dn ? '✅' : `❌ (missing ${sn-dn})`;
    console.log(`  ${t.padEnd(28)}: OLD=${sn}  NEW=${dn}  ${ok}`);
  }
  console.log('\n✅ Done.');
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
