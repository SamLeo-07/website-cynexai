import db from "../config/db.js";

async function checkSchema() {
  try {
    console.log("Checking tables in database...");
    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables in database:", tables.rows.map(r => r.name));

    for (const table of tables.rows) {
      console.log(`\nSchema for table '${table.name}':`);
      const info = await db.execute(`PRAGMA table_info(${table.name})`);
      console.table(info.rows);
    }
  } catch (error) {
    console.error("Failed to fetch schema info:", error);
  }
}

checkSchema();
