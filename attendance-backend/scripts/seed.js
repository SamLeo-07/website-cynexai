import db from "../config/db.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Starting database migrations and seeding for QR Attendance module...");

  try {
    // 1. Drop old tables that we are refactoring (safe, since they only belong to this module)
    console.log("Dropping old sessions/attendance tables...");
    await db.execute("DROP TABLE IF EXISTS attendance");
    await db.execute("DROP TABLE IF EXISTS sessions");
    await db.execute("DROP TABLE IF EXISTS attendance_logs");
    await db.execute("DROP TABLE IF EXISTS attendance_summary");

    // 2. Create Courses table if not exists (maps name internally to title)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT
      )
    `);
    console.log("Table 'courses' verified.");

    // 3. Create Users table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'clerk', 'trainer', 'student')),
        mobile_number TEXT,
        created_at TEXT
      )
    `);
    console.log("Table 'users' verified.");

    // 4. Create Batches table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        course_id TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        created_at TEXT,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `);
    console.log("Table 'batches' verified.");

    // 5. Create User-Batches mapping table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_batches (
        user_id TEXT,
        batch_id TEXT,
        PRIMARY KEY (user_id, batch_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
      )
    `);
    console.log("Table 'user_batches' verified.");

    // 6. Create Sessions table (refactored status machine)
    await db.execute(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        trainer_id TEXT NOT NULL,
        session_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('scheduled', 'active', 'completed')),
        start_time TEXT,
        end_time TEXT,
        qr_token TEXT,
        FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
        FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("Table 'sessions' created.");

    // 7. Create Attendance Logs table
    await db.execute(`
      CREATE TABLE attendance_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        scan_type TEXT NOT NULL CHECK(scan_type IN ('start', 'trainer', 'student', 'end')),
        timestamp TEXT NOT NULL,
        UNIQUE(user_id, session_id, scan_type),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);
    console.log("Table 'attendance_logs' created.");

    // 8. Create Attendance Summary table
    await db.execute(`
      CREATE TABLE attendance_summary (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
        UNIQUE(student_id, session_id),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);
    console.log("Table 'attendance_summary' created.");

    // 9. Seeding initial accounts if not present
    const usersToSeed = [
      { id: "admin_seed", name: "System Admin", email: "admin@cynexai.in", password: "Admin@1234", role: "admin" },
      { id: "clerk_seed", name: "System Clerk", email: "clerk@cynexai.in", password: "Clerk@1234", role: "clerk" },
      { id: "trainer_seed", name: "Lead Trainer", email: "trainer@cynexai.in", password: "Trainer@1234", role: "trainer" },
      { id: "student_seed", name: "John Student", email: "student@cynexai.in", password: "Student@1234", role: "student" }
    ];

    for (const u of usersToSeed) {
      const check = await db.execute({
        sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
        args: [u.email]
      });
      if (check.rows.length === 0) {
        console.log(`Seeding ${u.role} user: ${u.email}...`);
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await db.execute({
          sql: "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          args: [u.id, u.name, u.email, hashedPassword, u.role, new Date().toISOString()]
        });
      }
    }

    // 10. Verify/Seed a Course and a Batch if empty
    const coursesCheck = await db.execute("SELECT id FROM courses LIMIT 1");
    let courseId = "artificial-intelligence-generative-ai";
    if (coursesCheck.rows.length === 0) {
      console.log("Seeding initial course...");
      await db.execute({
        sql: "INSERT INTO courses (id, title, description) VALUES (?, ?, ?)",
        args: [courseId, "Artificial Intelligence & Generative AI", "Learn advanced AI and Generative Models."]
      });
    } else {
      courseId = coursesCheck.rows[0].id;
    }

    const batchesCheck = await db.execute("SELECT id FROM batches LIMIT 1");
    let batchId = "batch_1779799323518";
    if (batchesCheck.rows.length === 0) {
      console.log("Seeding initial batch...");
      await db.execute({
        sql: "INSERT INTO batches (id, name, course_id, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [batchId, "AI-GEN-01", courseId, "2026-06-01", "2026-12-01", new Date().toISOString()]
      });
    } else {
      batchId = batchesCheck.rows[0].id;
    }

    // 11. Assign Student & Trainer to the Batch if not mapped
    const mappings = [
      { user_id: "student_seed", batch_id: batchId },
      { user_id: "trainer_seed", batch_id: batchId }
    ];

    for (const map of mappings) {
      const checkMap = await db.execute({
        sql: "SELECT user_id FROM user_batches WHERE user_id = ? AND batch_id = ? LIMIT 1",
        args: [map.user_id, map.batch_id]
      });
      if (checkMap.rows.length === 0) {
        console.log(`Mapping user ${map.user_id} to batch ${map.batch_id}...`);
        await db.execute({
          sql: "INSERT INTO user_batches (user_id, batch_id) VALUES (?, ?)",
          args: [map.user_id, map.batch_id]
        });
      }
    }

    console.log("Migrations and seeding finished successfully!");
  } catch (error) {
    console.error("Migration/Seeding failed:", error);
    process.exit(1);
  }
}

main();
