import db from "../config/db.js";

// Helper to get today's date in YYYY-MM-DD
function getTodayDateString() {
  return new Date().toLocaleDateString('en-CA');
}

function combineDateAndTimeBackend(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  let parsedTime = timeStr;
  if (timeStr.includes("T")) {
    parsedTime = timeStr.split("T")[1].substring(0, 5); // extracts "HH:MM"
  }
  const dt = new Date(`${dateStr}T${parsedTime}`);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

// Create Session (Admin Only)
export async function createSession(req, res) {
  const { batchId, trainerId, sessionDate, startTime, endTime, isRecurring, startDate, endDate, excludeWeekends } = req.body;

  if (isRecurring) {
    if (!batchId || !trainerId || !startDate || !endDate) {
      return res.status(400).json({ error: true, message: "batchId, trainerId, startDate, and endDate are required for recurring sessions." });
    }
  } else {
    if (!batchId || !trainerId || !sessionDate) {
      return res.status(400).json({ error: true, message: "batchId, trainerId, and sessionDate are required." });
    }
  }

  try {
    // Validate batch exists
    const batchCheck = await db.execute({
      sql: "SELECT id FROM batches WHERE id = ? LIMIT 1",
      args: [batchId]
    });
    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Batch not found." });
    }

    // Validate trainer exists and has trainer role
    const trainerCheck = await db.execute({
      sql: "SELECT id FROM users WHERE id = ? AND role = 'trainer' LIMIT 1",
      args: [trainerId]
    });
    if (trainerCheck.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Trainer not found or user is not a trainer." });
    }

    if (isRecurring) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: true, message: "Invalid startDate or endDate." });
      }

      if (start > end) {
        return res.status(400).json({ error: true, message: "startDate cannot be after endDate." });
      }

      const queries = [];
      let currentDate = new Date(start);

      while (currentDate <= end) {
        const dayOfWeek = currentDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (!(excludeWeekends && isWeekend)) {
          const dateString = currentDate.toISOString().split('T')[0];
          const sessionId = `session_${Math.random().toString(36).substr(2, 9)}`;
          const qrToken = `tok_${Math.random().toString(36).substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;

          const finalStartTime = combineDateAndTimeBackend(dateString, startTime);
          const finalEndTime = combineDateAndTimeBackend(dateString, endTime);

          queries.push({
            sql: `
              INSERT INTO sessions (id, batch_id, trainer_id, session_date, status, start_time, end_time, qr_token)
              VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?)
            `,
            args: [sessionId, batchId, trainerId, dateString, finalStartTime, finalEndTime, qrToken]
          });
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      if (queries.length === 0) {
        return res.status(400).json({ error: true, message: "No sessions created (all dates were weekends and weekends were excluded)." });
      }

      await db.batch(queries);

      return res.status(201).json({
        success: true,
        message: `Successfully scheduled ${queries.length} recurring daily sessions.`,
        sessionsCount: queries.length
      });

    } else {
      const sessionId = `session_${Math.random().toString(36).substr(2, 9)}`;
      const qrToken = `tok_${Math.random().toString(36).substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;

      await db.execute({
        sql: `
          INSERT INTO sessions (id, batch_id, trainer_id, session_date, status, start_time, end_time, qr_token)
          VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?)
        `,
        args: [sessionId, batchId, trainerId, sessionDate, startTime || null, endTime || null, qrToken]
      });

      return res.status(201).json({
        success: true,
        message: "Attendance session created successfully (scheduled).",
        session: {
          id: sessionId,
          batchId,
          trainerId,
          sessionDate,
          status: "scheduled",
          qrToken
        }
      });
    }

  } catch (error) {
    console.error("Create session error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Get All Sessions (Admin generic CRUD list)
export async function getSessions(req, res) {
  try {
    const result = await db.execute(`
      SELECT s.*, b.name as batch_name, u.name as trainer_name
      FROM sessions s
      JOIN batches b ON s.batch_id = b.id
      JOIN users u ON s.trainer_id = u.id
      ORDER BY s.session_date DESC, s.status ASC
    `);

    return res.status(200).json({
      success: true,
      sessions: result.rows
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Get Clerk/Student Today's Sessions: GET /api/sessions/today
export async function getTodaySessions(req, res) {
  const todayStr = getTodayDateString();
  const { role, id: userId } = req.user;

  try {
    let result;
    if (role === "student") {
      // Students see today's active or scheduled sessions for batches they belong to
      result = await db.execute({
        sql: `
          SELECT s.*, b.name as batch_name, u.name as trainer_name
          FROM sessions s
          JOIN batches b ON s.batch_id = b.id
          JOIN users u ON s.trainer_id = u.id
          JOIN user_batches ub ON s.batch_id = ub.batch_id
          WHERE ub.user_id = ? AND s.session_date = ?
          ORDER BY s.status ASC
        `,
        args: [userId, todayStr]
      });
    } else {
      // Clerks and Admins see all sessions scheduled/active/completed for today
      result = await db.execute({
        sql: `
          SELECT s.*, b.name as batch_name, u.name as trainer_name
          FROM sessions s
          JOIN batches b ON s.batch_id = b.id
          JOIN users u ON s.trainer_id = u.id
          WHERE s.session_date = ?
          ORDER BY s.status ASC
        `,
        args: [todayStr]
      });
    }

    return res.status(200).json({
      success: true,
      sessions: result.rows
    });
  } catch (error) {
    console.error("Get today sessions error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Get Trainer My Sessions: GET /api/sessions/my
export async function getMySessions(req, res) {
  const trainerId = req.user.id;

  try {
    const result = await db.execute({
      sql: `
        SELECT s.*, b.name as batch_name, u.name as trainer_name
        FROM sessions s
        JOIN batches b ON s.batch_id = b.id
        JOIN users u ON s.trainer_id = u.id
        WHERE s.trainer_id = ?
        ORDER BY s.session_date DESC
      `,
      args: [trainerId]
    });

    return res.status(200).json({
      success: true,
      sessions: result.rows
    });
  } catch (error) {
    console.error("Get trainer sessions error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Update Session (Admin Only)
export async function updateSession(req, res) {
  const { id } = req.params;
  const { batchId, trainerId, sessionDate, status, startTime, endTime } = req.body;

  if (!batchId || !trainerId || !sessionDate || !status) {
    return res.status(400).json({ error: true, message: "Missing required update fields." });
  }

  const validStatuses = ["scheduled", "active", "completed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: true, message: "Invalid status." });
  }

  try {
    // Verify session exists
    const check = await db.execute({
      sql: "SELECT status, qr_token FROM sessions WHERE id = ? LIMIT 1",
      args: [id]
    });

    if (check.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Session not found." });
    }

    const currentSession = check.rows[0];

    // Determine qr_token: regenerate if changing status to scheduled/active (if null), or set null on completed
    let qrToken = currentSession.qr_token;
    if (status === "completed") {
      qrToken = null;
    } else if (!qrToken) {
      qrToken = `tok_${Math.random().toString(36).substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;
    }

    await db.execute({
      sql: `
        UPDATE sessions 
        SET batch_id = ?, trainer_id = ?, session_date = ?, status = ?, qr_token = ?, start_time = ?, end_time = ?
        WHERE id = ?
      `,
      args: [batchId, trainerId, sessionDate, status, qrToken, startTime || null, endTime || null, id]
    });

    return res.status(200).json({
      success: true,
      message: "Session updated successfully."
    });
  } catch (error) {
    console.error("Update session error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Delete Session (Admin Only)
export async function deleteSession(req, res) {
  const { id } = req.params;

  try {
    const check = await db.execute({
      sql: "SELECT id FROM sessions WHERE id = ? LIMIT 1",
      args: [id]
    });

    if (check.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Session not found." });
    }

    await db.execute({
      sql: "DELETE FROM sessions WHERE id = ?",
      args: [id]
    });

    return res.status(200).json({
      success: true,
      message: "Session deleted successfully."
    });
  } catch (error) {
    console.error("Delete session error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}
