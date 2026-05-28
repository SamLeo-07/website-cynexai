import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertTriangle, KeyRound, MapPin, Calendar, Check, X } from 'lucide-react';
import { 
  getAttendanceSessions, 
  getStudentAttendance, 
  markAttendance, 
  verifyAttendancePin, 
  getAttendanceRecordsBySession,
  AttendanceSession, 
  AttendanceRecord 
} from '../lib/turso';

interface StudentAttendanceProps {
  studentId: string;
  studentName: string;
  enrollments: { 
    enrollment: { id: string; course_id: string; progress_percentage: number; status: string }; 
    course: { id: string; title: string; image: string; level: string } 
  }[];
}

interface CourseAttendanceStats {
  courseId: string;
  courseTitle: string;
  totalSessions: number;
  attended: number;
  percentage: number;
}

export const StudentAttendance: React.FC<StudentAttendanceProps> = ({
  studentId,
  studentName,
  enrollments
}) => {
  const [stats, setStats] = useState<CourseAttendanceStats[]>([]);
  const [sessions, setSessions] = useState<(AttendanceSession & { attended?: boolean })[]>([]);
  const [pin, setPin] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAttendanceData = async () => {
    if (enrollments.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Stats for each course
      const statsPromises = enrollments.map(async ({ course }) => {
        const s = await getStudentAttendance(studentId, course.id);
        return {
          courseId: course.id,
          courseTitle: course.title,
          totalSessions: s.totalSessions,
          attended: s.attended,
          percentage: s.percentage
        };
      });
      const resolvedStats = await Promise.all(statsPromises);
      setStats(resolvedStats);

      // 2. Fetch Sessions for all courses
      const sessionPromises = enrollments.map(async ({ course }) => {
        const courseSessions = await getAttendanceSessions(course.id);
        return { courseTitle: course.title, courseSessions };
      });
      const resolvedSessionsData = await Promise.all(sessionPromises);

      // Flatten and fetch attendance record for each session to check if student attended
      const allSessions: (AttendanceSession & { attended?: boolean; courseTitle: string })[] = [];
      
      for (const { courseTitle, courseSessions } of resolvedSessionsData) {
        for (const session of courseSessions) {
          const records = await getAttendanceRecordsBySession(session.id);
          const attended = records.some(r => r.student_id === studentId);
          allSessions.push({
            ...session,
            courseTitle,
            attended
          });
        }
      }

      // Sort sessions by date/time desc
      allSessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSessions(allSessions);

    } catch (e) {
      console.error("Failed to load attendance", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    if (enrollments.length > 0) {
      setSelectedCourseId(enrollments[0].course.id);
    }
  }, [studentId, enrollments]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 6);
    setPin(value);
  };

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !selectedCourseId) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit PIN and select a course.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      // 1. Verify PIN
      const verifiedSession = await verifyAttendancePin(pin, selectedCourseId);
      if (!verifiedSession) {
        setMessage({ type: 'error', text: 'Invalid PIN, or session is not active for today.' });
        setSubmitting(false);
        return;
      }

      // 2. Mark Attendance
      const record: AttendanceRecord = {
        id: crypto.randomUUID(),
        session_id: verifiedSession.id,
        student_id: studentId,
        student_name: studentName,
        marked_at: new Date().toISOString(),
        method: 'pin'
      };

      await markAttendance(record);
      setMessage({ type: 'success', text: `Attendance marked successfully for ${verifiedSession.topic}!` });
      setPin('');
      
      // Refresh statistics and list
      await fetchAttendanceData();
    } catch (e) {
      setMessage({ type: 'error', text: 'An error occurred while marking attendance.' });
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const hasLowAttendance = stats.some(s => s.totalSessions > 0 && s.percentage < 75);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-secondary/10 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-secondary/40 uppercase tracking-widest">Verifying Logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h3 className="text-3xl lg:text-4xl font-black text-secondary mb-2 tracking-tight">Attendance Center</h3>
        <p className="text-sm lg:text-base text-secondary/60 font-medium">Keep track of your presence and view session requirements.</p>
      </div>

      {/* Warning Banner */}
      {hasLowAttendance && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 p-6 rounded-xl flex items-start gap-4 text-red-800"
        >
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-red-600 animate-pulse" />
          <div>
            <h4 className="font-bold text-lg">Warning: Low Attendance Alert</h4>
            <p className="text-sm text-red-600 mt-1 font-medium">
              Your attendance in one or more courses is below the required 75% threshold. Please ensure you attend upcoming classes to maintain eligibility for certification.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Panels: Stats & Session Logs */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.map((s) => {
              const radius = 40;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (s.percentage / 100) * circumference;
              
              return (
                <div key={s.courseId} className="bg-background-100 border border-secondary/10 rounded-xl p-6 shadow-sm flex items-center justify-between">
                  <div className="space-y-3 pr-4 max-w-[65%]">
                    <span className="text-[9px] font-black text-secondary/40 uppercase tracking-widest block truncate">
                      {s.courseTitle}
                    </span>
                    <h4 className="text-xl font-bold text-secondary leading-tight line-clamp-2">{s.courseTitle}</h4>
                    <p className="text-xs text-secondary/60 font-medium">
                      Attended <span className="font-black text-secondary">{s.attended}</span> of <span className="font-bold text-slate-700">{s.totalSessions}</span> sessions
                    </p>
                  </div>
                  
                  {/* Circular Progress Bar */}
                  <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        className="stroke-slate-100 fill-none"
                        strokeWidth="8"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        className={`fill-none transition-all duration-1000 ${
                          s.percentage >= 75 ? 'stroke-indigo-600' : 'stroke-red-500'
                        }`}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-base font-black text-secondary">
                      {s.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sessions Log Table */}
          <div className="bg-background-100 border border-secondary/10 rounded-xl overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-secondary/5 flex items-center justify-between">
              <h3 className="font-bold text-lg text-secondary">Session Logs</h3>
              <span className="px-3 py-1 bg-secondary/5 rounded-md text-[9px] font-black text-secondary/40 uppercase tracking-widest">
                Real-Time Updates
              </span>
            </div>
            
            {sessions.length === 0 ? (
              <div className="p-12 text-center text-secondary/40">
                <Clock className="w-12 h-12 mx-auto mb-4 text-secondary/20" />
                <p className="text-sm font-bold uppercase tracking-wider">No sessions logged yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-secondary/5 border-b border-secondary/5">
                    <tr>
                      <th className="px-8 py-4 text-[9px] font-black text-secondary/60 uppercase tracking-widest">Course / Topic</th>
                      <th className="px-8 py-4 text-[9px] font-black text-secondary/60 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-right text-[9px] font-black text-secondary/60 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-secondary/5 transition-colors">
                        <td className="px-8 py-5">
                          <div className="font-bold text-secondary text-sm">{session.topic || 'General Session'}</div>
                          <div className="text-[9px] font-black text-secondary/40 uppercase tracking-widest mt-0.5">
                            {session.courseTitle}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-secondary/60">
                          {new Date(session.session_date || session.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-5 text-right">
                          {session.attended ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-md text-[9px] font-black uppercase tracking-wider">
                              <Check className="w-3 h-3" /> Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-md text-[9px] font-black uppercase tracking-wider">
                              <X className="w-3 h-3" /> Absent
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Mark Attendance PIN Form */}
        <div className="space-y-8">
          <div className="bg-background-100 border border-secondary/10 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-md flex items-center justify-center text-indigo-400">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-secondary">Mark Presence</h3>
                <p className="text-xs text-secondary/60 font-medium">Verify attendance via live PIN.</p>
              </div>
            </div>

            <form onSubmit={handleMarkAttendance} className="space-y-6">
              <div>
                <label className="block text-[9px] font-black text-secondary/40 uppercase tracking-widest mb-2">Select Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-3 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none text-secondary font-bold appearance-none transition-all cursor-pointer text-sm"
                  title="Course selection"
                >
                  {enrollments.map(({ course }) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-secondary/40 uppercase tracking-widest mb-2">6-Digit PIN Code</label>
                <input
                  type="text"
                  required
                  pattern="\d{6}"
                  maxLength={6}
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="000000"
                  className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none text-secondary transition-all placeholder:text-slate-300"
                />
              </div>

              {message && (
                <div className={`p-4 rounded-md text-xs font-bold ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || pin.length !== 6}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md transition-all disabled:opacity-50 shadow-md shadow-indigo-900/10 text-sm"
              >
                {submitting ? 'Verifying...' : 'Submit Attendance'}
              </button>
            </form>
          </div>

          {/* Quick instructions card */}
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl p-6 relative overflow-hidden shadow-md shadow-slate-950/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
            <h4 className="font-bold text-base mb-3 text-indigo-400">How to check-in?</h4>
            <ul className="space-y-3 text-xs text-slate-400 font-medium">
              <li className="flex gap-2">
                <span className="text-indigo-400 font-black">1.</span>
                Your instructor will display a temporary 6-digit PIN code on the screen during the live class.
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-400 font-black">2.</span>
                Select the course matching the class, enter the PIN, and submit before it expires.
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-400 font-black">3.</span>
                If PIN verification succeeds, your presence is logged instantly.
              </li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};
