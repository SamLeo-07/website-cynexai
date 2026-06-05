/**
 * Shared Turso (LibSQL) database client for the backend API.
 * Credentials are loaded from environment variables — never exposed to the browser.
 */
'use strict';

const { createClient } = require('@libsql/client');

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('[DB] FATAL: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in backend/.env');
  process.exit(1);
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * Helper: run a query and return rows as plain objects (not Turso Row proxies).
 */
async function query(sql, args = []) {
  const result = await db.execute({ sql, args });
  return result.rows.map(row => ({ ...row }));
}

/**
 * Helper: run a mutation (INSERT/UPDATE/DELETE) and return { rowsAffected, lastInsertRowid }.
 */
async function mutate(sql, args = []) {
  const result = await db.execute({ sql, args });
  return { rowsAffected: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
}

module.exports = { db, query, mutate };
