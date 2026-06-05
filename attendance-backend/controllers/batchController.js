import db from "../config/db.js";

// Get All Batches (with Course details)
export async function getBatches(req, res) {
  try {
    const result = await db.execute(`
      SELECT b.*, c.title AS course_name 
      FROM batches b 
      JOIN courses c ON b.course_id = c.id
      ORDER BY b.name ASC
    `);
    return res.status(200).json({
      success: true,
      batches: result.rows
    });
  } catch (error) {
    console.error("Get batches error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Create Batch (Admin Only)
export async function createBatch(req, res) {
  const { id, name, courseId, start_date, end_date } = req.body;

  if (!name || !name.trim() || !courseId) {
    return res.status(400).json({ error: true, message: "name and courseId are required." });
  }

  try {
    // Verify course exists
    const courseCheck = await db.execute({
      sql: "SELECT id FROM courses WHERE id = ? LIMIT 1",
      args: [courseId]
    });
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Course not found." });
    }

    const batchId = id && id.trim() ? id.trim() : `batch_${Math.random().toString(36).substr(2, 9)}`;

    // Verify batch ID uniqueness if manually provided
    if (id && id.trim()) {
      const idCheck = await db.execute({
        sql: "SELECT id FROM batches WHERE id = ? LIMIT 1",
        args: [batchId]
      });
      if (idCheck.rows.length > 0) {
        return res.status(400).json({ error: true, message: "A batch with this ID already exists." });
      }
    }

    await db.execute({
      sql: "INSERT INTO batches (id, name, course_id, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [batchId, name.trim(), courseId, start_date || null, end_date || null, new Date().toISOString()]
    });

    return res.status(201).json({
      success: true,
      message: "Batch created successfully.",
      batch: {
        id: batchId,
        name: name.trim(),
        courseId,
        start_date: start_date || null,
        end_date: end_date || null
      }
    });
  } catch (error) {
    console.error("Create batch error:", error);
    if (error.message && error.message.includes("UNIQUE")) {
      return res.status(400).json({ error: true, message: "A batch with this name already exists." });
    }
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Update Batch (Admin Only)
export async function updateBatch(req, res) {
  const { id } = req.params;
  const { name, courseId, start_date, end_date } = req.body;

  if (!name || !name.trim() || !courseId) {
    return res.status(400).json({ error: true, message: "name and courseId are required." });
  }

  try {
    // Verify batch exists
    const batchCheck = await db.execute({
      sql: "SELECT id FROM batches WHERE id = ? LIMIT 1",
      args: [id]
    });
    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Batch not found." });
    }

    // Verify course exists
    const courseCheck = await db.execute({
      sql: "SELECT id FROM courses WHERE id = ? LIMIT 1",
      args: [courseId]
    });
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Course not found." });
    }

    await db.execute({
      sql: "UPDATE batches SET name = ?, course_id = ?, start_date = ?, end_date = ? WHERE id = ?",
      args: [name.trim(), courseId, start_date || null, end_date || null, id]
    });

    return res.status(200).json({
      success: true,
      message: "Batch updated successfully."
    });
  } catch (error) {
    console.error("Update batch error:", error);
    if (error.message && error.message.includes("UNIQUE")) {
      return res.status(400).json({ error: true, message: "A batch with this name already exists." });
    }
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Delete Batch (Admin Only)
export async function deleteBatch(req, res) {
  const { id } = req.params;

  try {
    const check = await db.execute({
      sql: "SELECT id FROM batches WHERE id = ? LIMIT 1",
      args: [id]
    });
    if (check.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Batch not found." });
    }

    await db.execute({
      sql: "DELETE FROM batches WHERE id = ?",
      args: [id]
    });

    return res.status(200).json({
      success: true,
      message: "Batch deleted successfully."
    });
  } catch (error) {
    console.error("Delete batch error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Assign user to batch (Admin Only)
export async function assignBatch(req, res) {
  const { userId, batchId } = req.body;

  if (!userId || !batchId) {
    return res.status(400).json({ error: true, message: "userId and batchId are required." });
  }

  try {
    // Verify user exists
    const userCheck = await db.execute({
      sql: "SELECT id FROM users WHERE id = ? LIMIT 1",
      args: [userId]
    });
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    // Verify batch exists
    const batchCheck = await db.execute({
      sql: "SELECT id FROM batches WHERE id = ? LIMIT 1",
      args: [batchId]
    });
    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Batch not found." });
    }

    // Check duplicate assignment
    const dupCheck = await db.execute({
      sql: "SELECT user_id FROM user_batches WHERE user_id = ? AND batch_id = ? LIMIT 1",
      args: [userId, batchId]
    });

    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ error: true, message: "User is already assigned to this batch." });
    }

    await db.execute({
      sql: "INSERT INTO user_batches (user_id, batch_id) VALUES (?, ?)",
      args: [userId, batchId]
    });

    return res.status(200).json({
      success: true,
      message: "Batch assigned successfully."
    });
  } catch (error) {
    console.error("Assign batch error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Get all students assigned to a specific batch
export async function getBatchStudents(req, res) {
  const { id } = req.params;

  try {
    // Verify batch exists
    const batchCheck = await db.execute({
      sql: "SELECT id FROM batches WHERE id = ? LIMIT 1",
      args: [id]
    });
    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Batch not found." });
    }

    const result = await db.execute({
      sql: `
        SELECT u.id, u.name, u.email, u.mobile_number, u.created_at 
        FROM users u
        JOIN user_batches ub ON u.id = ub.user_id
        WHERE ub.batch_id = ? AND u.role = 'student'
        ORDER BY u.name ASC
      `,
      args: [id]
    });

    return res.status(200).json({
      success: true,
      students: result.rows
    });
  } catch (error) {
    console.error("Get batch students error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Update students assigned to a specific batch
export async function updateBatchStudents(req, res) {
  const { id } = req.params;
  const { studentIds } = req.body;

  if (!Array.isArray(studentIds)) {
    return res.status(400).json({ error: true, message: "studentIds must be an array." });
  }

  try {
    // Verify batch exists
    const batchCheck = await db.execute({
      sql: "SELECT id FROM batches WHERE id = ? LIMIT 1",
      args: [id]
    });
    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Batch not found." });
    }

    // Deleting existing student assignments for this batch
    await db.execute({
      sql: `
        DELETE FROM user_batches 
        WHERE batch_id = ? 
        AND user_id IN (SELECT id FROM users WHERE role = 'student')
      `,
      args: [id]
    });

    // Inserting new student assignments
    if (studentIds.length > 0) {
      const placeholders = studentIds.map(() => "?").join(", ");
      const userCheck = await db.execute({
        sql: `SELECT id, role FROM users WHERE id IN (${placeholders})`,
        args: studentIds
      });

      const batchQueries = userCheck.rows
        .filter(row => row.role === "student")
        .map(row => ({
          sql: "INSERT INTO user_batches (user_id, batch_id) VALUES (?, ?)",
          args: [row.id, id]
        }));

      if (batchQueries.length > 0) {
        await db.batch(batchQueries);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Batch student list updated successfully."
    });
  } catch (error) {
    console.error("Update batch students error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}
