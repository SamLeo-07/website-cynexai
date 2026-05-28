import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Calendar, Clock, Plus, Trash2, Eye, 
  CheckCircle, AlertTriangle, KeyRound, QrCode, X, UserPlus, ShieldAlert 
} from 'lucide-react';
import { 
  createAttendanceSession, 
  getAttendanceSessions, 
  getAttendanceRecordsBySession, 
  markAttendance, 
  deleteAttendanceSession, 
  getAllAttendanceStats, 
  AttendanceSession, 
  AttendanceRecord 
} from '../lib/turso';
import QRCode from 'qrcode';

interface AdminAttendanceProps {
  courses: { id: string; title: string }[];
  users: { id: string; name: string; email: string }[];
}

interface StatsRow {
  student_id: string;
  student_name: string;
  course_id: string;
  total: number;
  attended: number;
  percentage: number;
}

export const AdminAttendance: React.FC<AdminAttendanceProps> = ({
  courses,
  users
}) => {
  const [sessions, setSessions] = useState<(AttendanceSession & { studentCount: number })[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<StatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeSessionForPin, setActiveSessionForPin] = useState<AttendanceSession | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false);
  const [selectedSessionForView, setSelectedSessionForView] = useState<AttendanceSession | null>(null);
  const [sessionRecords, setSessionRecords] = useState<AttendanceRecord[]>([]);

  // Create Form State
  const [createFormData, setCreateFormData] = useState({
    course_id: '',
    topic: '',
    session_date: new Date().toISOString().split('T')[0],
    batch_name: '',
    session_time: ''
  });

  // Manual Mark State
  const [manualMarkStudentId, setManualMarkStudentId] = useState('');

  const fetchSessionsAndStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch sessions
      const rawSessions = await getAttendanceSessions();
      
      // Load student counts per session
      const sessionsWithCounts = await Promise.all(
        rawSessions.map(async (sess) => {
          const records = await getAttendanceRecordsBySession(sess.id);
          return {
            ...sess,
            studentCount: records.length
          };
        })
      );
      setSessions(sessionsWithCounts);

      // 2. Fetch stats
      const stats = await getAllAttendanceStats();
      setAttendanceStats(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionsAndStats();
    if (courses.length > 0) {
      setCreateFormData(prev => ({ ...prev, course_id: courses[0].id }));
    }
  }, [courses]);

  useEffect(() => {
    if (users.length > 0) {
      setManualMarkStudentId(users[0].id);
    }
  }, [users]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.course_id || !createFormData.topic) return;

    // Generate random 6 digit pin
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const newSession: AttendanceSession = {
      id: crypto.randomUUID(),
      course_id: createFormData.course_id,
      session_date: createFormData.session_date,
      topic: createFormData.topic,
      pin_code: pin,
      created_by: 'admin',
      created_at: new Date().toISOString(),
      batch_name: createFormData.batch_name,
      session_time: createFormData.session_time
    };

    try {
      await createAttendanceSession(newSession);
      
      // Generate QR Code URL
      const qrData = await QRCode.toDataURL(pin);
      setQrCodeUrl(qrData);
      
      setActiveSessionForPin(newSession);
      setIsCreateModalOpen(false);
      setCreateFormData({
        course_id: courses[0]?.id || '',
        topic: '',
        session_date: new Date().toISOString().split('T')[0],
        batch_name: '',
        session_time: ''
      });

      await fetchSessionsAndStats();
    } catch (e) {
      console.error(e);
      alert("Failed to create attendance session.");
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this session and its attendance records?")) return;
    try {
      await deleteAttendanceSession(id);
      await fetchSessionsAndStats();
    } catch (e) {
      console.error(e);
      alert("Failed to delete session.");
    }
  };

  const handleViewStudents = async (sess: AttendanceSession) => {
    setSelectedSessionForView(sess);
    setIsViewStudentsModalOpen(true);
    try {
      const records = await getAttendanceRecordsBySession(sess.id);
      setSessionRecords(records);
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualMark = async () => {
    if (!selectedSessionForView || !manualMarkStudentId) return;
    
    const student = users.find(u => u.id === manualMarkStudentId);
    if (!student) return;

    // Check if already present
    if (sessionRecords.some(r => r.student_id === student.id)) {
      alert("Student is already marked present for this session.");
      return;
    }

    try {
      const record: AttendanceRecord = {
        id: crypto.randomUUID(),
        session_id: selectedSessionForView.id,
        student_id: student.id,
        student_name: student.name,
        marked_at: new Date().toISOString(),
        method: 'manual'
      };

      await markAttendance(record);
      
      // Reload session records
      const records = await getAttendanceRecordsBySession(selectedSessionForView.id);
      setSessionRecords(records);
      
      await fetchSessionsAndStats();
    } catch (e) {
      console.error(e);
      alert("Failed to mark attendance.");
    }
  };

  const getCourseTitle = (courseId: string) => {
    const c = courses.find(item => item.id === courseId);
    return c ? c.title : 'General';
  };

  // Dashboard Stats Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const sessionsToday = sessions.filter(s => s.session_date === todayStr).length;
  
  // Total presents in all sessions today
  const presentsToday = sessions
    .filter(s => s.session_date === todayStr)
    .reduce((sum, s) => sum + s.studentCount, 0);

  const lowAttendanceCount = attendanceStats.filter(s => s.total > 0 && s.percentage < 75).length;

  return (
    <div className="space-y-8 text-white">
      
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-white">Attendance Control</h3>
          <p className="text-sm text-gray-400 font-medium">Verify live class check-ins and monitor student completion limits.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto px-6 py-3 bg-[#41c8df] hover:bg-[#2bb5cc] text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#41c8df]/15 text-sm"
        >
          <Plus size={18} /> Create Live Session
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sessions Active Today</p>
            <h4 className="text-3xl font-black">{sessionsToday}</h4>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
            <Calendar size={22} />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Checked-In Today</p>
            <h4 className="text-3xl font-black">{presentsToday}</h4>
          </div>
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Low Attendance Warnings</p>
            <h4 className="text-3xl font-black text-red-400">{lowAttendanceCount}</h4>
          </div>
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-400">
            <ShieldAlert size={22} />
          </div>
        </div>
      </div>

      {/* Live Session Active PIN Projection Banner */}
      {activeSessionForPin && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800 border-2 border-[#41c8df] rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl"
        >
          <div className="space-y-3 text-center md:text-left">
            <span className="px-3 py-1 bg-[#41c8df]/15 text-[#41c8df] border border-[#41c8df]/30 rounded-lg text-[10px] font-black uppercase tracking-widest">
              Live Check-In Active
            </span>
            <h4 className="text-2xl font-bold text-white">{activeSessionForPin.topic}</h4>
            <p className="text-xs text-gray-400 font-medium">
              Course: <span className="text-white font-bold">{getCourseTitle(activeSessionForPin.course_id)}</span> | Date: {activeSessionForPin.session_date}
              {activeSessionForPin.session_time && ` | Time: ${activeSessionForPin.session_time}`}
              {activeSessionForPin.batch_name && <span className="text-white font-bold ml-1"> | Batch: {activeSessionForPin.batch_name}</span>}
            </p>
            <button
              onClick={() => setActiveSessionForPin(null)}
              className="text-xs font-bold text-red-400 hover:text-red-300 underline mt-2 block"
            >
              Dismiss Projection Box
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 shrink-0 bg-gray-900 p-6 rounded-2xl border border-gray-700">
            {/* PIN Display */}
            <div className="text-center space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enter Class PIN</span>
              <div className="text-4xl font-mono font-black tracking-widest text-[#41c8df] bg-slate-950 px-6 py-3 rounded-xl border border-gray-800">
                {activeSessionForPin.pin_code}
              </div>
            </div>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scan QR Code</span>
                <div className="p-2 bg-white rounded-xl">
                  <img src={qrCodeUrl} alt="Session QR PIN" className="w-24 h-24" />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Grid: Session Logs & Student Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Sessions Table (7 cols) */}
        <div className="xl:col-span-7 bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="font-bold text-lg text-white">Active & Past Sessions</h3>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-sm font-bold uppercase tracking-wider">No sessions created yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-900 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Session Details</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">PIN</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Presents</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-white">{sess.topic}</div>
                        <div className="text-[10px] text-[#41c8df] font-bold uppercase tracking-wider mt-0.5">
                          {getCourseTitle(sess.course_id)}
                        </div>
                        <div className="text-[9px] text-gray-400 mt-1">
                          Date: {sess.session_date}
                          {sess.session_time && ` | Time: ${sess.session_time}`}
                          {sess.batch_name && <span className="text-white ml-1 font-bold">| {sess.batch_name}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-[#41c8df]">
                        {sess.pin_code}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-sm">
                        {sess.studentCount} Present
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewStudents(sess)}
                            className="p-2 bg-gray-900 hover:bg-[#41c8df]/10 text-gray-400 hover:text-[#41c8df] rounded-lg transition-all border border-gray-700 hover:border-[#41c8df]/20"
                            title="View Present Students"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              // Project PIN again
                              QRCode.toDataURL(sess.pin_code).then(url => {
                                setQrCodeUrl(url);
                                setActiveSessionForPin(sess);
                              });
                            }}
                            className="p-2 bg-gray-900 hover:bg-[#41c8df]/10 text-gray-400 hover:text-[#41c8df] rounded-lg transition-all border border-gray-700 hover:border-[#41c8df]/20"
                            title="Project PIN Display"
                          >
                            <QrCode size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(sess.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/10 hover:border-red-500/20"
                            title="Delete Session"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Student Stats Table (5 cols) */}
        <div className="xl:col-span-5 bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="font-bold text-lg text-white">Student Stats Ledger</h3>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400">
              Loading statistics...
            </div>
          ) : attendanceStats.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-sm font-bold uppercase tracking-wider">No student attendance logs</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-900 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Student / Course</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {attendanceStats.map((stat, i) => (
                    <tr key={i} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="text-sm font-bold text-white">{stat.student_name}</div>
                        <div className="text-[9px] text-[#41c8df] font-bold uppercase tracking-wider">
                          {getCourseTitle(stat.course_id)}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="font-bold text-sm text-white">
                          {stat.attended} / {stat.total}
                        </div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase mt-1 tracking-wider ${
                          stat.percentage >= 75 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          stat.percentage >= 50 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {stat.percentage}% Pres.
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Create Live Attendance Session */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-gray-800 border border-gray-700 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden text-white"
            >
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
                <h3 className="text-xl font-bold">New Attendance Session</h3>
                <button 
                  onClick={() => setIsCreateModalOpen(false)} 
                  className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-all"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSession} className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Course</label>
                  <select
                    value={createFormData.course_id}
                    onChange={(e) => setCreateFormData({ ...createFormData, course_id: e.target.value })}
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#41c8df] focus:outline-none w-full cursor-pointer font-bold text-sm"
                    title="Course selection"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Session Topic</label>
                  <input
                    type="text"
                    required
                    value={createFormData.topic}
                    onChange={(e) => setCreateFormData({ ...createFormData, topic: e.target.value })}
                    placeholder="e.g. Introduction to React state"
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#41c8df] focus:outline-none w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Student Batch Name</label>
                  <input
                    type="text"
                    required
                    value={createFormData.batch_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, batch_name: e.target.value })}
                    placeholder="e.g. Batch A, Full Stack Morning"
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#41c8df] focus:outline-none w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Session Date</label>
                    <input
                      type="date"
                      required
                      value={createFormData.session_date}
                      onChange={(e) => setCreateFormData({ ...createFormData, session_date: e.target.value })}
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#41c8df] focus:outline-none w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Session Time</label>
                    <input
                      type="time"
                      required
                      value={createFormData.session_time}
                      onChange={(e) => setCreateFormData({ ...createFormData, session_time: e.target.value })}
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#41c8df] focus:outline-none w-full"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#41c8df] hover:bg-[#2bb5cc] text-black font-bold rounded-xl transition-all shadow-lg shadow-[#41c8df]/15 text-sm"
                >
                  Generate Class PIN & Launch
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: View Students in Session */}
      <AnimatePresence>
        {isViewStudentsModalOpen && selectedSessionForView && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsViewStudentsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-gray-800 border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden text-white flex flex-col max-h-[80vh]"
            >
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
                <div>
                  <h3 className="text-lg font-bold">Present Students Logs</h3>
                  <p className="text-xs text-gray-400 font-medium">Session: {selectedSessionForView.topic}</p>
                </div>
                <button 
                  onClick={() => setIsViewStudentsModalOpen(false)} 
                  className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-all"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Manual Mark Controls */}
              <div className="p-6 bg-gray-900 border-b border-gray-700 flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Mark Student Manually</label>
                  <select
                    value={manualMarkStudentId}
                    onChange={(e) => setManualMarkStudentId(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#41c8df] w-full text-xs font-bold"
                    title="Student selection"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleManualMark}
                  className="px-5 py-2.5 bg-[#41c8df] hover:bg-[#2bb5cc] text-black font-bold rounded-xl text-xs uppercase tracking-widest transition-all shrink-0 flex items-center gap-1.5"
                >
                  <UserPlus size={14} /> Mark Present
                </button>
              </div>

              {/* Records List */}
              <div className="flex-1 overflow-y-auto p-6">
                {sessionRecords.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-sm">
                    No students have checked in yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessionRecords.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-700">
                        <div>
                          <div className="font-bold text-sm text-white">{rec.student_name}</div>
                          <div className="text-[10px] text-gray-400 font-medium">Student ID: {rec.student_id}</div>
                        </div>
                        <div className="text-right space-y-1">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            rec.method === 'manual' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-[#41c8df]/15 text-[#41c8df] border border-[#41c8df]/25'
                          }`}>
                            {rec.method === 'manual' ? 'Manual marked' : 'Verified PIN'}
                          </span>
                          <div className="text-[8px] text-gray-500">{new Date(rec.marked_at).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
