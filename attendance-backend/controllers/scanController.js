import db from "../config/db.js";

// Helper to get today's date in YYYY-MM-DD format (IST local / server matches)
function getTodayDateString() {
  return new Date().toLocaleDateString('en-CA'); // en-CA locale formats to YYYY-MM-DD
}

// Clerk START scan: transitions session from 'scheduled' -> 'active'
export async function startScan(req, res) {
  const { sessionId, batchId, sessionDate, token } = req.body;
  const clerkId = req.user.id;

  if (!sessionId || !batchId || !sessionDate || !token) {
    return res.status(400).json({ error: true, message: "Missing required scan payload parameters." });
  }

  try {
    const todayStr = getTodayDateString();
    if (sessionDate !== todayStr) {
      return res.status(400).json({
        error: true,
        message: `Scan rejected: session is scheduled for ${sessionDate}, but today is ${todayStr}.`
      });
    }

    // Fetch session
    const sessionRes = await db.execute({
      sql: "SELECT * FROM sessions WHERE id = ? LIMIT 1",
      args: [sessionId]
    });

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Session not found." });
    }

    const session = sessionRes.rows[0];

    // Validate token and state
    if (session.qr_token !== token) {
      return res.status(400).json({ error: true, message: "Scan rejected: Invalid QR token." });
    }

    if (session.status !== "scheduled") {
      return res.status(400).json({
        error: true,
        message: `Scan rejected: Session is already in '${session.status}' state.`
      });
    }

    const timestamp = new Date().toISOString();
    const logId = `log_${Math.random().toString(36).substr(2, 9)}`;

    // Perform updates inside a transaction
    await db.batch([
      {
        sql: "UPDATE sessions SET status = 'active', start_time = ? WHERE id = ?",
        args: [timestamp, sessionId]
      },
      {
        sql: "INSERT INTO attendance_logs (id, user_id, session_id, scan_type, timestamp) VALUES (?, ?, ?, ?, ?)",
        args: [logId, clerkId, sessionId, "start", timestamp]
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Session successfully activated and started!",
      sessionStatus: "active"
    });
  } catch (error) {
    console.error("Start scan error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Trainer check-in scan: registers trainer attendance log
export async function trainerScan(req, res) {
  const { sessionId, batchId, sessionDate, token } = req.body;
  const trainerId = req.user.id;

  if (!sessionId || !batchId || !sessionDate || !token) {
    return res.status(400).json({ error: true, message: "Missing required scan payload parameters." });
  }

  try {
    const todayStr = getTodayDateString();
    if (sessionDate !== todayStr) {
      return res.status(400).json({
        error: true,
        message: `Scan rejected: session is scheduled for ${sessionDate}, but today is ${todayStr}.`
      });
    }

    // Fetch session
    const sessionRes = await db.execute({
      sql: "SELECT * FROM sessions WHERE id = ? LIMIT 1",
      args: [sessionId]
    });

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Session not found." });
    }

    const session = sessionRes.rows[0];

    // Validate token and assignment
    if (session.qr_token !== token) {
      return res.status(400).json({ error: true, message: "Scan rejected: Invalid QR token." });
    }

    if (session.status === "completed") {
      return res.status(400).json({ error: true, message: "Scan rejected: Session has already completed." });
    }

    if (session.trainer_id !== trainerId) {
      return res.status(403).json({
        error: true,
        message: "Scan rejected: You are not the assigned trainer for this session."
      });
    }

    // Prevent duplicate scans
    const dupCheck = await db.execute({
      sql: "SELECT id FROM attendance_logs WHERE user_id = ? AND session_id = ? AND scan_type = 'trainer' LIMIT 1",
      args: [trainerId, sessionId]
    });

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: true, message: "Trainer check-in already logged for this session." });
    }

    const timestamp = new Date().toISOString();
    const logId = `log_${Math.random().toString(36).substr(2, 9)}`;

    await db.execute({
      sql: "INSERT INTO attendance_logs (id, user_id, session_id, scan_type, timestamp) VALUES (?, ?, ?, ?, ?)",
      args: [logId, trainerId, sessionId, "trainer", timestamp]
    });

    return res.status(200).json({
      success: true,
      message: "Trainer check-in logged successfully!"
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT" || (error.message && error.message.includes("UNIQUE constraint failed"))) {
      return res.status(409).json({ error: true, message: "Trainer check-in already logged for this session." });
    }
    console.error("Trainer scan error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Student attendance mark scan: marks status = 'present' in attendance_summary
export async function studentScan(req, res) {
  const { sessionId, batchId, sessionDate, token } = req.body;
  const studentId = req.user.id;

  if (!sessionId || !batchId || !sessionDate || !token) {
    return res.status(400).json({ error: true, message: "Missing required scan payload parameters." });
  }

  try {
    const todayStr = getTodayDateString();
    if (sessionDate !== todayStr) {
      return res.status(400).json({
        error: true,
        message: `Scan rejected: session is scheduled for ${sessionDate}, but today is ${todayStr}.`
      });
    }

    // Fetch session
    const sessionRes = await db.execute({
      sql: "SELECT * FROM sessions WHERE id = ? LIMIT 1",
      args: [sessionId]
    });

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Session not found." });
    }

    const session = sessionRes.rows[0];

    // Validate session status and token
    if (session.status !== "active") {
      return res.status(400).json({
        error: true,
        message: `Scan rejected: Session is currently '${session.status}'. Student scans are only allowed when session is active.`
      });
    }

    if (session.qr_token !== token) {
      return res.status(400).json({ error: true, message: "Scan rejected: Invalid QR token." });
    }

    // Validate student belongs to batch
    const batchCheck = await db.execute({
      sql: "SELECT user_id FROM user_batches WHERE user_id = ? AND batch_id = ? LIMIT 1",
      args: [studentId, batchId]
    });

    if (batchCheck.rows.length === 0) {
      return res.status(403).json({ error: true, message: "Scan rejected: You do not belong to this batch." });
    }

    // Check duplicate scan
    const dupCheck = await db.execute({
      sql: "SELECT id FROM attendance_logs WHERE user_id = ? AND session_id = ? AND scan_type = 'student' LIMIT 1",
      args: [studentId, sessionId]
    });

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: true, message: "Attendance check-in already logged for this session." });
    }

    const timestamp = new Date().toISOString();
    const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
    const summaryId = `sum_${Math.random().toString(36).substr(2, 9)}`;

    // Add log and mark present in summary
    await db.batch([
      {
        sql: "INSERT INTO attendance_logs (id, user_id, session_id, scan_type, timestamp) VALUES (?, ?, ?, ?, ?)",
        args: [logId, studentId, sessionId, "student", timestamp]
      },
      {
        sql: "INSERT INTO attendance_summary (id, student_id, session_id, status) VALUES (?, ?, ?, ?) ON CONFLICT(student_id, session_id) DO UPDATE SET status = EXCLUDED.status",
        args: [summaryId, studentId, sessionId, "present"]
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Attendance marked successfully! Status: Present"
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT" || (error.message && error.message.includes("UNIQUE constraint failed"))) {
      return res.status(409).json({ error: true, message: "Attendance check-in already logged for this session." });
    }
    console.error("Student scan error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Clerk END scan: transitions session from 'active' -> 'completed', invalidates QR, auto-fills 'absent' for missing students
export async function endScan(req, res) {
  const { sessionId, batchId, sessionDate, token } = req.body;
  const clerkId = req.user.id;

  if (!sessionId || !batchId || !sessionDate || !token) {
    return res.status(400).json({ error: true, message: "Missing required scan payload parameters." });
  }

  try {
    const todayStr = getTodayDateString();
    if (sessionDate !== todayStr) {
      return res.status(400).json({
        error: true,
        message: `Scan rejected: session is scheduled for ${sessionDate}, but today is ${todayStr}.`
      });
    }

    // Fetch session
    const sessionRes = await db.execute({
      sql: "SELECT * FROM sessions WHERE id = ? LIMIT 1",
      args: [sessionId]
    });

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Session not found." });
    }

    const session = sessionRes.rows[0];

    // Validate token and active status
    if (session.qr_token !== token) {
      return res.status(400).json({ error: true, message: "Scan rejected: Invalid QR token." });
    }

    if (session.status !== "active") {
      return res.status(400).json({
        error: true,
        message: `Scan rejected: Session is in '${session.status}' status. Only active sessions can be ended.`
      });
    }

    const timestamp = new Date().toISOString();
    const logId = `log_${Math.random().toString(36).substr(2, 9)}`;

    // Update status to completed, set end_time, clear qr_token
    const batchQueries = [
      {
        sql: "UPDATE sessions SET status = 'completed', end_time = ?, qr_token = NULL WHERE id = ?",
        args: [timestamp, sessionId]
      },
      {
        sql: "INSERT INTO attendance_logs (id, user_id, session_id, scan_type, timestamp) VALUES (?, ?, ?, ?, ?)",
        args: [logId, clerkId, sessionId, "end", timestamp]
      }
    ];

    // Auto-fill absent records for students in this batch who haven't check-in
    const studentsRes = await db.execute({
      sql: `
        SELECT u.id 
        FROM users u 
        JOIN user_batches ub ON u.id = ub.user_id 
        WHERE ub.batch_id = ? AND u.role = 'student'
      `,
      args: [batchId]
    });

    const presentStudentsRes = await db.execute({
      sql: "SELECT student_id FROM attendance_summary WHERE session_id = ? AND status = 'present'",
      args: [sessionId]
    });

    const presentStudentIds = new Set(presentStudentsRes.rows.map(r => r.student_id));

    studentsRes.rows.forEach(student => {
      if (!presentStudentIds.has(student.id)) {
        const sumId = `sum_${Math.random().toString(36).substr(2, 9)}`;
        batchQueries.push({
          sql: "INSERT INTO attendance_summary (id, student_id, session_id, status) VALUES (?, ?, ?, ?) ON CONFLICT(student_id, session_id) DO UPDATE SET status = EXCLUDED.status",
          args: [sumId, student.id, sessionId, "absent"]
        });
      }
    });

    await db.batch(batchQueries);

    return res.status(200).json({
      success: true,
      message: "Session ended successfully. Attendance finalized!",
      sessionStatus: "completed"
    });
  } catch (error) {
    console.error("End scan error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Student check-out scan: logs checkout scan_type = 'end'
export async function studentEndScan(req, res) {
  const { sessionId, batchId, sessionDate, token } = req.body;
  const studentId = req.user.id;

  if (!sessionId || !batchId || !sessionDate || !token) {
    return res.status(400).json({ error: true, message: "Missing required scan payload parameters." });
  }

  try {
    const todayStr = getTodayDateString();
    if (sessionDate !== todayStr) {
      return res.status(400).json({
        error: true,
        message: `Scan rejected: session is scheduled for ${sessionDate}, but today is ${todayStr}.`
      });
    }

    // Fetch session
    const sessionRes = await db.execute({
      sql: "SELECT * FROM sessions WHERE id = ? LIMIT 1",
      args: [sessionId]
    });

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: true, message: "Session not found." });
    }

    const session = sessionRes.rows[0];

    // Validate session status and token
    if (session.status !== "active") {
      return res.status(400).json({
        error: true,
        message: `Scan rejected: Session is currently '${session.status}'. Student scans are only allowed when session is active.`
      });
    }

    if (session.qr_token !== token) {
      return res.status(400).json({ error: true, message: "Scan rejected: Invalid QR token." });
    }

    // Validate student belongs to batch
    const batchCheck = await db.execute({
      sql: "SELECT user_id FROM user_batches WHERE user_id = ? AND batch_id = ? LIMIT 1",
      args: [studentId, batchId]
    });

    if (batchCheck.rows.length === 0) {
      return res.status(403).json({ error: true, message: "Scan rejected: You do not belong to this batch." });
    }

    // Validate student has checked in (has a 'student' log)
    const checkInCheck = await db.execute({
      sql: "SELECT id FROM attendance_logs WHERE user_id = ? AND session_id = ? AND scan_type = 'student' LIMIT 1",
      args: [studentId, sessionId]
    });

    if (checkInCheck.rows.length === 0) {
      return res.status(400).json({ error: true, message: "Scan rejected: You must scan the check-in QR code first before checking out." });
    }

    // Check duplicate check-out scan
    const dupCheck = await db.execute({
      sql: "SELECT id FROM attendance_logs WHERE user_id = ? AND session_id = ? AND scan_type = 'end' LIMIT 1",
      args: [studentId, sessionId]
    });

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: true, message: "Attendance check-out already logged for this session." });
    }

    const timestamp = new Date().toISOString();
    const logId = `log_${Math.random().toString(36).substr(2, 9)}`;

    // Add check-out log (scan_type = 'end')
    await db.execute({
      sql: "INSERT INTO attendance_logs (id, user_id, session_id, scan_type, timestamp) VALUES (?, ?, ?, ?, ?)",
      args: [logId, studentId, sessionId, "end", timestamp]
    });

    return res.status(200).json({
      success: true,
      message: "Attendance check-out marked successfully!"
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT" || (error.message && error.message.includes("UNIQUE constraint failed"))) {
      return res.status(409).json({ error: true, message: "Attendance check-out already logged for this session." });
    }
    console.error("Student end scan error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}
