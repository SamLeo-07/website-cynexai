import db from "../config/db.js";
import bcrypt from "bcryptjs";

// Create a User (Admin Only)
export async function createUser(req, res) {
  const { name, email, password, role, batchId, mobileNumber } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: true, message: "Missing required fields: name, email, password, role." });
  }

  const validRoles = ["admin", "clerk", "trainer", "student"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: true, message: "Invalid role. Must be 'admin', 'clerk', 'trainer', or 'student'." });
  }

  try {
    // Check if email already exists
    const emailCheck = await db.execute({
      sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
      args: [email.toLowerCase().trim()]
    });

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: true, message: "A user with this email already exists." });
    }

    const userId = `${role}_${Math.random().toString(36).substr(2, 9)}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user inside a transaction (using db.batch)
    const queries = [
      {
        sql: "INSERT INTO users (id, name, email, password_hash, role, mobile_number) VALUES (?, ?, ?, ?, ?, ?)",
        args: [userId, name.trim(), email.toLowerCase().trim(), hashedPassword, role, mobileNumber ? mobileNumber.trim() : null]
      }
    ];

    // If batchId is provided, also insert batch mapping
    if (batchId) {
      queries.push({
        sql: "INSERT INTO user_batches (user_id, batch_id) VALUES (?, ?)",
        args: [userId, batchId]
      });
    }

    await db.batch(queries);

    return res.status(201).json({
      success: true,
      message: `${role.toUpperCase()} user created successfully.`,
      user: {
        id: userId,
        name,
        email,
        role,
        mobile_number: mobileNumber ? mobileNumber.trim() : null
      }
    });

  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Get Users (Admin & Teacher Only)
export async function getUsers(req, res) {
  const { role } = req.query;

  try {
    let sql = `
      SELECT u.id, u.name, u.email, u.role, u.mobile_number, b.id as batch_id, b.name as batch_name
      FROM users u
      LEFT JOIN user_batches ub ON u.id = ub.user_id
      LEFT JOIN batches b ON ub.batch_id = b.id
    `;
    const args = [];

    if (role) {
      sql += " WHERE u.role = ?";
      args.push(role);
    }

    const result = await db.execute({ sql, args });

    // Group columns by user since a user could technically have multiple rows (though they'll mostly have one batch in this app)
    const usersMap = {};
    result.rows.forEach(row => {
      if (!usersMap[row.id]) {
        usersMap[row.id] = {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          mobile_number: row.mobile_number || null,
          batches: []
        };
      }
      if (row.batch_id) {
        usersMap[row.id].batches.push({
          id: row.batch_id,
          name: row.batch_name
        });
      }
    });

    return res.status(200).json({
      success: true,
      users: Object.values(usersMap)
    });

  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Create Batch (Admin Only)
export async function createBatch(req, res) {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: true, message: "Batch name is required." });
  }

  try {
    const batchId = `batch_${Math.random().toString(36).substr(2, 9)}`;

    await db.execute({
      sql: "INSERT INTO batches (id, name) VALUES (?, ?)",
      args: [batchId, name.trim()]
    });

    return res.status(201).json({
      success: true,
      message: "Batch created successfully.",
      batch: {
        id: batchId,
        name: name.trim()
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

// Get Batches (All Authenticated Users)
export async function getBatches(req, res) {
  try {
    const result = await db.execute("SELECT * FROM batches ORDER BY name ASC");
    return res.status(200).json({
      success: true,
      batches: result.rows
    });
  } catch (error) {
    console.error("Get batches error:", error);
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
    const user = await db.execute({
      sql: "SELECT id FROM users WHERE id = ? LIMIT 1",
      args: [userId]
    });
    if (user.rows.length === 0) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    // Verify batch exists
    const batch = await db.execute({
      sql: "SELECT id FROM batches WHERE id = ? LIMIT 1",
      args: [batchId]
    });
    if (batch.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Batch not found." });
    }

    // Check if mapping already exists
    const checkMapping = await db.execute({
      sql: "SELECT user_id FROM user_batches WHERE user_id = ? AND batch_id = ? LIMIT 1",
      args: [userId, batchId]
    });

    if (checkMapping.rows.length > 0) {
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

// Update User (Admin Only)
export async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, role, batchId, mobileNumber } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: true, message: "Missing required fields: name, email, role." });
  }

  const validRoles = ["admin", "clerk", "trainer", "student"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: true, message: "Invalid role." });
  }

  try {
    // Check if email is already taken by another user
    const emailCheck = await db.execute({
      sql: "SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1",
      args: [email.toLowerCase().trim(), id]
    });

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: true, message: "Email is already in use by another user." });
    }

    const queries = [
      {
        sql: "UPDATE users SET name = ?, email = ?, role = ?, mobile_number = ? WHERE id = ?",
        args: [name.trim(), email.toLowerCase().trim(), role, mobileNumber ? mobileNumber.trim() : null, id]
      },
      {
        sql: "DELETE FROM user_batches WHERE user_id = ?",
        args: [id]
      }
    ];

    if (role === "student" && batchId) {
      queries.push({
        sql: "INSERT INTO user_batches (user_id, batch_id) VALUES (?, ?)",
        args: [id, batchId]
      });
    }

    await db.batch(queries);

    return res.status(200).json({
      success: true,
      message: "User updated successfully."
    });

  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Delete User (Admin Only)
export async function deleteUser(req, res) {
  const { id } = req.params;

  try {
    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ error: true, message: "You cannot delete your own account." });
    }

    await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [id]
    });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully."
    });

  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Get Profile of Current Authenticated User
export async function getProfile(req, res) {
  const userId = req.user.id;
  try {
    const result = await db.execute({
      sql: "SELECT id, name, email, role, mobile_number FROM users WHERE id = ? LIMIT 1",
      args: [userId]
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: true, message: "User not found." });
    }
    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Update Profile of Current Authenticated User
export async function updateProfile(req, res) {
  const userId = req.user.id;
  const { name, mobile_number, currentPassword, newPassword } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: true, message: "Name is required." });
  }

  try {
    const userRes = await db.execute({
      sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
      args: [userId]
    });

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    const user = userRes.rows[0];
    let hashedPassword = user.password_hash;

    if (newPassword && newPassword.trim()) {
      if (!currentPassword) {
        return res.status(400).json({ error: true, message: "Current password is required to set a new password." });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: true, message: "Incorrect current password." });
      }

      if (newPassword.trim().length < 6) {
        return res.status(400).json({ error: true, message: "New password must be at least 6 characters long." });
      }

      hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    }

    await db.execute({
      sql: "UPDATE users SET name = ?, mobile_number = ?, password_hash = ? WHERE id = ?",
      args: [name.trim(), mobile_number ? mobile_number.trim() : null, hashedPassword, userId]
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user.id,
        name: name.trim(),
        email: user.email,
        role: user.role,
        mobile_number: mobile_number ? mobile_number.trim() : null
      }
    });

  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}
