const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = process.env.VITE_TURSO_DATABASE_URL;
const authToken = process.env.VITE_TURSO_AUTH_TOKEN;

console.log("Diagnosing Turso Cloud Database...");
console.log("Database URL:", url);

if (!url || !authToken) {
  console.error("Missing Turso environment variables.");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
  try {
    const tests = await client.execute("SELECT id, title, course_id, batch_id FROM mock_tests");
    console.log("\n--- Mock Tests inside Turso Database ---");
    console.log(tests.rows);

    const questions = await client.execute("SELECT id, testId, text FROM questions");
    console.log("\n--- Questions inside Turso Database (First 10) ---");
    console.log(questions.rows.slice(0, 10));
    console.log(`Total questions in Turso: ${questions.rows.length}`);

    const courses = await client.execute("SELECT id, title FROM courses");
    console.log("\n--- Courses inside Turso Database ---");
    console.log(courses.rows);

    const enrollments = await client.execute("SELECT id, student_id, course_id FROM enrollments");
    console.log("\n--- Enrollments inside Turso Database ---");
    console.log(enrollments.rows);

  } catch (error) {
    console.error("Failed to query database:", error);
  } finally {
    process.exit(0);
  }
}

run();
