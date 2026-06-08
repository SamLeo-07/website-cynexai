/**
 * migrate-turso.mjs  (v3 — FK checks disabled, retry failed tables)
 *
 * Copies ALL tables and data from old Turso → new Turso.
 * - Disables PRAGMA foreign_keys during import so ordering doesn't matter
 * - Auto-detects schema from source (no hardcoded columns)
 * - Safe to re-run (uses INSERT OR REPLACE)
 *
 * Usage:
 *   node migrate-turso.mjs
 */

import { createClient } from '@libsql/client';

// ─── OLD DATABASE (source) ────────────────────────────────────────────────────
const OLD_URL   = 'libsql://cynex-ai-cynexai-26.aws-ap-south-1.turso.io';
const OLD_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzE0OTg3MzEsImlkIjoiMGFkMjkzZDctNmM1My00NGRkLWI1ZDQtOGJlNTRmODllZDgxIiwicmlkIjoiMDdjMGZkNmUtMzEwMC00NGZlLTliNDQtMDVkNDdlODIxNmNmIn0.jZ5fYZJ6Jkb7NG8AgurnoKNRb9hVTrc-S3rjxQRXE4oj55TxLPgqMyPfAlvigqMTHHAwRSDZLzGvpJ7QQcp2AA';

// ─── NEW DATABASE (destination) ──────────────────────────────────────────────
const NEW_URL   = 'libsql://cynex-ai-cynexai.aws-ap-south-1.turso.io';
const NEW_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA5MTk5MzYsImlkIjoiMDE5ZWE3MTktNzkwMS03Y2Y3LTgxNDItYmI3ZTdhY2RiZGUyIiwicmlkIjoiZDhlZjQ2NjQtNGZjNy00MTc0LWJlMTItOWIwNDczN2RjNGIyIn0.nzy6qJrwAHywKfZwRZ28eMJFbD20IFojBH-tYxX1xS8Ouaokn7SZcKT2FiG_M5umsbw9HN24TXc0vsKgOJlhDw';

async function getTableNames(db) {
  const res = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  return res.rows.map(r => r.name);
}

async function getCreateSQL(db, table) {
  const res = await db.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
    args: [table],
  });
  return res.rows.length > 0 ? res.rows[0].sql : null;
}

async function migrateTable(srcDb, dstDb, table) {
  // Replicate schema
  const createSQL = await getCreateSQL(srcDb, table);
  if (!createSQL) {
    console.log(`  ⚠️  No schema for '${table}' — skipping.`);
    return { success: 0, total: 0 };
  }

  const createIfNotExists = createSQL.replace(/^CREATE TABLE /i, 'CREATE TABLE IF NOT EXISTS ');
  try {
    await dstDb.execute(createIfNotExists);
  } catch (e) {
    console.warn(`  ⚠️  Create '${table}': ${e.message}`);
  }

  // Add any missing columns (ALTER TABLE)
  const dstCols = await dstDb.execute(`PRAGMA table_info("${table}")`).then(r => r.rows.map(c => c.name));
  const srcColsFull = await srcDb.execute(`PRAGMA table_info("${table}")`).then(r => r.rows);
  for (const col of srcColsFull) {
    if (!dstCols.includes(col.name)) {
      const colType = col.type || 'TEXT';
      try {
        await dstDb.execute(`ALTER TABLE "${table}" ADD COLUMN "${col.name}" ${colType}`);
        console.log(`    ➕ Added column '${col.name}' to '${table}'.`);
      } catch (e) {
        if (!e.message.includes('duplicate column')) {
          console.warn(`    ⚠️  Cannot add '${col.name}': ${e.message}`);
        }
      }
    }
  }

  // Read all rows from source
  let rows;
  try {
    const res = await srcDb.execute(`SELECT * FROM "${table}"`);
    rows = res.rows;
  } catch (e) {
    console.error(`  ❌  Read '${table}' failed: ${e.message}`);
    return { success: 0, total: 0 };
  }

  if (rows.length === 0) {
    console.log(`  ℹ️  '${table}': empty.`);
    return { success: 0, total: 0 };
  }

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

  let success = 0, failed = 0;
  for (const row of rows) {
    const args = columns.map(col => {
      const v = row[col];
      if (typeof v === 'bigint') return Number(v);
      return v ?? null;
    });
    try {
      await dstDb.execute({ sql, args });
      success++;
    } catch (e) {
      console.error(`    ⚠️  Row failed '${table}': ${e.message.substring(0, 80)}`);
      failed++;
    }
  }
  const note = failed > 0 ? ` (${failed} failed)` : '';
  console.log(`  ✅  '${table}': ${success}/${rows.length}${note}`);
  return { success, total: rows.length };
}

async function run() {
  console.log('='.repeat(62));
  console.log('  CynexAI — Turso Migration v3 (FK disabled)');
  console.log('='.repeat(62));
  console.log(`  SOURCE : ${OLD_URL}`);
  console.log(`  DEST   : ${NEW_URL}\n`);

  const srcDb = createClient({ url: OLD_URL, authToken: OLD_TOKEN });
  const dstDb = createClient({ url: NEW_URL, authToken: NEW_TOKEN });

  // Test connections
  for (const [label, db] of [['SOURCE', srcDb], ['DEST', dstDb]]) {
    process.stdout.write(`🔌 ${label}... `);
    try { await db.execute('SELECT 1'); console.log('✅'); }
    catch (e) { console.error(`❌ ${e.message}`); process.exit(1); }
  }

  // ── KEY FIX: disable FK checks on destination ──────────────────────────────
  console.log('\n🔓 Disabling foreign key checks on destination...');
  await dstDb.execute('PRAGMA foreign_keys = OFF');
  console.log('   Done.\n');

  // Discover tables in source
  const tables = await getTableNames(srcDb);
  console.log(`📋 Found ${tables.length} tables in source: ${tables.join(', ')}\n`);
  console.log('📦 Migrating...\n');

  let totalSuccess = 0, totalRows = 0;
  for (const table of tables) {
    console.log(`  → '${table}'`);
    const { success, total } = await migrateTable(srcDb, dstDb, table);
    totalSuccess += success;
    totalRows += total;
  }

  // Re-enable FK checks
  await dstDb.execute('PRAGMA foreign_keys = ON');
  console.log('\n🔒 Foreign key checks re-enabled.\n');

  // Final summary
  console.log('📊 Destination row counts:');
  const dstTables = await getTableNames(dstDb);
  for (const t of dstTables) {
    try {
      const res = await dstDb.execute(`SELECT COUNT(*) as cnt FROM "${t}"`);
      const cnt = Number(res.rows[0]?.cnt ?? 0);
      if (cnt > 0) console.log(`     ✔  ${t}: ${cnt} rows`);
    } catch { /* ignore */ }
  }

  console.log('\n' + '='.repeat(62));
  console.log(`  ✅  Done! Migrated ${totalSuccess}/${totalRows} total rows across ${tables.length} tables.`);
  console.log('='.repeat(62));
}

run().catch(err => { console.error('\n❌ FATAL:', err); process.exit(1); });
