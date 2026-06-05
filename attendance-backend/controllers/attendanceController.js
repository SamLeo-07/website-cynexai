import db from "../config/db.js";

// Get Overall Attendance Report (Admin, Trainer, Clerk)
export async function getAttendanceReport(req, res) {
  const { role, id: userId } = req.user;
  const { batchId, sessionId, studentId } = req.query;

  try {
    if (role === "admin" || role === "clerk" || role === "trainer") {
      let sql = "";
      const args = [];

      if (sessionId) {
        // Single session report: list ALL students in the batch of this session
        sql = `
          SELECT 
            asu.id AS attendance_id, 
            al_start.timestamp AS check_in_time, 
            al_end.timestamp AS check_out_time, 
            COALESCE(asu.status, 'absent') AS status, 
            u.name AS student_name, 
            u.email AS student_email,
            s.id AS session_id,
            s.session_date AS session_date,
            b.name AS batch_name,
            t.name AS trainer_name
          FROM user_batches ub
          JOIN users u ON ub.user_id = u.id AND u.role = 'student'
          JOIN sessions s ON s.id = ?
          JOIN batches b ON s.batch_id = b.id
          JOIN users t ON s.trainer_id = t.id
          LEFT JOIN attendance_summary asu ON (asu.student_id = u.id AND asu.session_id = s.id)
          LEFT JOIN (
            SELECT session_id, user_id, MIN(timestamp) AS timestamp 
            FROM attendance_logs 
            WHERE scan_type = 'student' 
            GROUP BY session_id, user_id
          ) al_start ON (al_start.session_id = s.id AND al_start.user_id = u.id)
          LEFT JOIN (
            SELECT session_id, user_id, MIN(timestamp) AS timestamp 
            FROM attendance_logs 
            WHERE scan_type = 'end' 
            GROUP BY session_id, user_id
          ) al_end ON (al_end.session_id = s.id AND al_end.user_id = u.id)
          WHERE ub.batch_id = s.batch_id
          ORDER BY u.name ASC
        `;
        args.push(sessionId);
      } else {
        // General report
        sql = `
          SELECT 
            asu.id AS attendance_id, 
            al_start.timestamp AS check_in_time, 
            al_end.timestamp AS check_out_time, 
            asu.status AS status, 
            u.name AS student_name, 
            u.email AS student_email,
            s.id AS session_id,
            s.session_date AS session_date,
            b.name AS batch_name,
            t.name AS trainer_name
          FROM attendance_summary asu
          JOIN users u ON asu.student_id = u.id
          JOIN sessions s ON asu.session_id = s.id
          JOIN batches b ON s.batch_id = b.id
          JOIN users t ON s.trainer_id = t.id
          LEFT JOIN (
            SELECT session_id, user_id, MIN(timestamp) AS timestamp 
            FROM attendance_logs 
            WHERE scan_type = 'student' 
            GROUP BY session_id, user_id
          ) al_start ON (al_start.session_id = s.id AND al_start.user_id = u.id)
          LEFT JOIN (
            SELECT session_id, user_id, MIN(timestamp) AS timestamp 
            FROM attendance_logs 
            WHERE scan_type = 'end' 
            GROUP BY session_id, user_id
          ) al_end ON (al_end.session_id = s.id AND al_end.user_id = u.id)
        `;
        const conditions = [];
        if (batchId) {
          conditions.push("s.batch_id = ?");
          args.push(batchId);
        }
        if (studentId) {
          conditions.push("asu.student_id = ?");
          args.push(studentId);
        }
        if (conditions.length > 0) {
          sql += " WHERE " + conditions.join(" AND ");
        }
        sql += " ORDER BY s.session_date DESC, u.name ASC";
      }

      const result = await db.execute({ sql, args });

      return res.status(200).json({
        success: true,
        report: result.rows.map(row => ({
          id: row.attendance_id || null,
          timestamp: row.check_in_time || null,
          checkOutTime: row.check_out_time || null,
          status: row.status,
          studentName: row.student_name,
          studentEmail: row.student_email,
          sessionId: row.session_id,
          sessionDate: row.session_date,
          batchName: row.batch_name,
          trainerName: row.trainer_name
        }))
      });

    } else {
      // Students see only their own attendance history
      return getStudentReportInternal(userId, res);
    }
  } catch (error) {
    console.error("Get attendance report error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Get Specific Student Attendance Report (Admin & Trainer Only)
export async function getStudentReport(req, res) {
  const { id } = req.params; // Student User ID

  try {
    return getStudentReportInternal(id, res);
  } catch (error) {
    console.error("Get student report error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}

// Shared helper function to retrieve a student's stats & history
async function getStudentReportInternal(studentId, res) {
  // Get student info
  const studentInfo = await db.execute({
    sql: "SELECT name, email FROM users WHERE id = ? LIMIT 1",
    args: [studentId]
  });

  if (studentInfo.rows.length === 0) {
    return res.status(404).json({ error: true, message: "Student not found." });
  }

  const student = studentInfo.rows[0];

  const studentHistorySql = `
    SELECT 
      asu.id AS attendance_id, 
      al_start.timestamp AS check_in_time, 
      al_end.timestamp AS check_out_time, 
      asu.status AS status,
      b.name AS batch_name,
      t.name AS trainer_name,
      s.session_date AS session_date
    FROM attendance_summary asu
    JOIN sessions s ON asu.session_id = s.id
    JOIN batches b ON s.batch_id = b.id
    JOIN users t ON s.trainer_id = t.id
    LEFT JOIN (
      SELECT session_id, user_id, MIN(timestamp) AS timestamp 
      FROM attendance_logs 
      WHERE scan_type = 'student' 
      GROUP BY session_id, user_id
    ) al_start ON (al_start.session_id = s.id AND al_start.user_id = asu.student_id)
    LEFT JOIN (
      SELECT session_id, user_id, MIN(timestamp) AS timestamp 
      FROM attendance_logs 
      WHERE scan_type = 'end' 
      GROUP BY session_id, user_id
    ) al_end ON (al_end.session_id = s.id AND al_end.user_id = asu.student_id)
    WHERE asu.student_id = ?
    ORDER BY s.session_date DESC
  `;
  const historyResult = await db.execute({
    sql: studentHistorySql,
    args: [studentId]
  });

  // Calculate statistics (percentage):
  // Get all sessions created for the student's batch(es)
  const totalSessionsSql = `
    SELECT COUNT(s.id) AS count
    FROM sessions s
    JOIN user_batches ub ON s.batch_id = ub.batch_id
    WHERE ub.user_id = ?
  `;
  const totalSessionsResult = await db.execute({
    sql: totalSessionsSql,
    args: [studentId]
  });

  const totalSessions = totalSessionsResult.rows[0]?.count || 0;
  const totalPresents = historyResult.rows.filter(r => r.status === "present").length;
  const attendancePercentage = totalSessions > 0 ? Math.round((totalPresents / totalSessions) * 100) : 0;

  return res.status(200).json({
    success: true,
    student: {
      id: studentId,
      name: student.name,
      email: student.email
    },
    stats: {
      totalSessions,
      totalPresents,
      percentage: attendancePercentage
    },
    history: historyResult.rows.map(row => ({
      id: row.attendance_id,
      timestamp: row.check_in_time || null,
      checkOutTime: row.check_out_time || null,
      status: row.status,
      batchName: row.batch_name,
      trainerName: row.trainer_name,
      sessionDate: row.session_date
    }))
  });
}

// Get All Scan Logs Audit Trail (Admin Only)
export async function getScanLogs(req, res) {
  try {
    const result = await db.execute(`
      SELECT 
        l.id, 
        l.scan_type, 
        l.timestamp,
        u.name AS user_name, 
        u.email AS user_email, 
        u.role AS user_role,
        s.session_date, 
        b.name AS batch_name
      FROM attendance_logs l
      JOIN users u ON l.user_id = u.id
      JOIN sessions s ON l.session_id = s.id
      JOIN batches b ON s.batch_id = b.id
      ORDER BY l.timestamp DESC
    `);
    
    return res.status(200).json({
      success: true,
      logs: result.rows
    });
  } catch (error) {
    console.error("Get scan logs error:", error);
    return res.status(500).json({ error: true, message: "Internal server error." });
  }
}
