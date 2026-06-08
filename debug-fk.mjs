/**
 * debug-fk.mjs — investigate what session_ids are missing
 */
import { createClient } from '@libsql/client';

const OLD_URL   = 'libsql://cynex-ai-cynexai-26.aws-ap-south-1.turso.io';
const OLD_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzE0OTg3MzEsImlkIjoiMGFkMjkzZDctNmM1My00NGRkLWI1ZDQtOGJlNTRmODllZDgxIiwicmlkIjoiMDdjMGZkNmUtMzEwMC00NGZlLTliNDQtMDVkNDdlODIxNmNmIn0.jZ5fYZJ6Jkb7NG8AgurnoKNRb9hVTrc-S3rjxQRXE4oj55TxLPgqMyPfAlvigqMTHHAwRSDZLzGvpJ7QQcp2AA';
const NEW_URL   = 'libsql://cynex-ai-cynexai.aws-ap-south-1.turso.io';
const NEW_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA5MTk5MzYsImlkIjoiMDE5ZWE3MTktNzkwMS03Y2Y3LTgxNDItYmI3ZTdhY2RiZGUyIiwicmlkIjoiZDhlZjQ2NjQtNGZjNy00MTc0LWJlMTItOWIwNDczN2RjNGIyIn0.nzy6qJrwAHywKfZwRZ28eMJFbD20IFojBH-tYxX1xS8Ouaokn7SZcKT2FiG_M5umsbw9HN24TXc0vsKgOJlhDw';

async function run() {
  const srcDb = createClient({ url: OLD_URL, authToken: OLD_TOKEN });
  const dstDb = createClient({ url: NEW_URL, authToken: NEW_TOKEN });

  // Find session_ids referenced in attendance_logs
  const logs = await srcDb.execute('SELECT DISTINCT session_id FROM attendance_logs');
  const logSessionIds = logs.rows.map(r => r.session_id);
  console.log('attendance_logs references session_ids:', logSessionIds);

  // Find session_ids referenced in attendance_summary
  const summ = await srcDb.execute('SELECT DISTINCT session_id FROM attendance_summary');
  const summSessionIds = summ.rows.map(r => r.session_id);
  console.log('attendance_summary references session_ids:', summSessionIds);

  // Check which exist in destination sessions table
  console.log('\nChecking sessions in destination...');
  const allIds = [...new Set([...logSessionIds, ...summSessionIds])];
  for (const sid of allIds) {
    const r = await dstDb.execute({ sql: 'SELECT id FROM sessions WHERE id = ?', args: [sid] });
    console.log(`  sessions.id="${sid}" exists in dest: ${r.rows.length > 0 ? '✅' : '❌ MISSING'}`);
  }

  // Also check user_ids
  const logUsers = await srcDb.execute('SELECT DISTINCT user_id FROM attendance_logs');
  console.log('\nattendance_logs user_ids:', logUsers.rows.map(r => r.user_id));

  const summStudents = await srcDb.execute('SELECT DISTINCT student_id FROM attendance_summary');
  console.log('attendance_summary student_ids:', summStudents.rows.map(r => r.student_id));

  // Check these users exist in dest
  const allUserIds = [...new Set([
    ...logUsers.rows.map(r => r.user_id),
    ...summStudents.rows.map(r => r.student_id)
  ])];
  console.log('\nChecking users in destination...');
  for (const uid of allUserIds) {
    const r = await dstDb.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [uid] });
    console.log(`  users.id="${uid}" exists in dest: ${r.rows.length > 0 ? '✅' : '❌ MISSING'}`);
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
