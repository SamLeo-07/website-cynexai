import db from "../config/db.js";

// Get All Courses
export async function getCourses(req, res) {
  try {
    const result = await db.execute("SELECT id, title AS name, description FROM courses ORDER BY title ASC");
    return res.status(200).json({
      success: true,
      courses: result.rows
    });
  } catch (error) {
    console.error("Get courses error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Create Course (Admin Only)
export async function createCourse(req, res) {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: true, message: "Course name is required." });
  }

  try {
    const courseId = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    // Check for duplicate id
    const check = await db.execute({
      sql: "SELECT id FROM courses WHERE id = ? LIMIT 1",
      args: [courseId]
    });

    if (check.rows.length > 0) {
      return res.status(400).json({ error: true, message: "A course with this name (or slug) already exists." });
    }

    await db.execute({
      sql: "INSERT INTO courses (id, title, description) VALUES (?, ?, ?)",
      args: [courseId, name.trim(), description ? description.trim() : ""]
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully.",
      course: {
        id: courseId,
        name: name.trim(),
        description: description ? description.trim() : ""
      }
    });
  } catch (error) {
    console.error("Create course error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Update Course (Admin Only)
export async function updateCourse(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: true, message: "Course name is required." });
  }

  try {
    // Check if course exists
    const check = await db.execute({
      sql: "SELECT id FROM courses WHERE id = ? LIMIT 1",
      args: [id]
    });

    if (check.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Course not found." });
    }

    await db.execute({
      sql: "UPDATE courses SET title = ?, description = ? WHERE id = ?",
      args: [name.trim(), description ? description.trim() : "", id]
    });

    return res.status(200).json({
      success: true,
      message: "Course updated successfully."
    });
  } catch (error) {
    console.error("Update course error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Delete Course (Admin Only)
export async function deleteCourse(req, res) {
  const { id } = req.params;

  try {
    // Check if course is linked to any batches
    const batchCheck = await db.execute({
      sql: "SELECT id FROM batches WHERE course_id = ? LIMIT 1",
      args: [id]
    });

    if (batchCheck.rows.length > 0) {
      return res.status(400).json({
        error: true,
        message: "Cannot delete course: it is currently linked to one or more active batches."
      });
    }

    await db.execute({
      sql: "DELETE FROM courses WHERE id = ?",
      args: [id]
    });

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully."
    });
  } catch (error) {
    console.error("Delete course error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}
