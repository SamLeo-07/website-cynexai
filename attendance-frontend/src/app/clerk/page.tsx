/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useRequireAuth, useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import QRCode from "qrcode";
import { 
  LogOut, 
  Clock, 
  Play, 
  StopCircle, 
  User, 
  Activity, 
  Layers, 
  Calendar,
  AlertCircle
} from "lucide-react";
import ProfileModal from "../../components/ProfileModal";

interface Session {
  id: string;
  batch_id: string;
  batch_name: string;
  trainer_id: string;
  trainer_name: string;
  session_date: string;
  status: "scheduled" | "active" | "completed";
  start_time: string | null;
  end_time: string | null;
  qr_token: string | null;
}

export default function ClerkPortal() {
  const { user, loading: authLoading } = useRequireAuth(["clerk", "admin"]);
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // Profile modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [startQrUrl, setStartQrUrl] = useState("");
  const [endQrUrl, setEndQrUrl] = useState("");
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      fetchTodaySessions();
    }
  }, [user]);

  useEffect(() => {
    if (selectedSession) {
      if (selectedSession.qr_token) {
        generateQRCodes(selectedSession);
      } else {
        setStartQrUrl("");
        setEndQrUrl("");
      }
      fetchAttendance(selectedSession.id);
    } else {
      setStartQrUrl("");
      setEndQrUrl("");
      setAttendanceList([]);
    }
  }, [selectedSession]);

  const generateQRCodes = async (session: Session) => {
    try {
      const startPayload = JSON.stringify({
        sessionId: session.id,
        batchId: session.batch_id,
        sessionDate: session.session_date,
        token: session.qr_token
      });
      const endPayload = JSON.stringify({
        sessionId: session.id,
        batchId: session.batch_id,
        sessionDate: session.session_date,
        token: session.qr_token,
        isCheckout: true
      });

      const [startUrl, endUrl] = await Promise.all([
        QRCode.toDataURL(startPayload, {
          width: 220,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" }
        }),
        QRCode.toDataURL(endPayload, {
          width: 220,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" }
        })
      ]);

      setStartQrUrl(startUrl);
      setEndQrUrl(endUrl);
    } catch (err) {
      console.warn("Failed to generate QR codes:", err);
    }
  };

  const fetchAttendance = async (sessionId: string) => {
    try {
      const res = await api.get(`/api/attendance/report?sessionId=${sessionId}`);
      setAttendanceList(res.data.report || []);
    } catch (err) {
      console.warn("Failed to fetch session attendance:", err);
    }
  };

  const fetchTodaySessions = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/sessions/today");
      const list = res.data.sessions || [];
      setSessions(list);
      
      // Auto-select session or keep current one in sync
      if (list.length > 0) {
        if (selectedSession) {
          const updated = list.find((s: any) => s.id === selectedSession.id);
          if (updated) {
            setSelectedSession(updated);
            return;
          }
        }
        const active = list.find((s: any) => s.status === "active");
        const scheduled = list.find((s: any) => s.status === "scheduled");
        setSelectedSession(active || scheduled || list[0]);
      } else {
        setSelectedSession(null);
      }
    } catch (err: any) {
      console.warn(err);
      setError(err.response?.data?.message || "Failed to fetch today's sessions.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (session: Session) => {
    try {
      setError("");
      await api.post("/api/scan/start", {
        sessionId: session.id,
        batchId: session.batch_id,
        sessionDate: session.session_date,
        token: session.qr_token
      });
      await fetchTodaySessions();
      setSelectedSession({ ...session, status: "active" });
    } catch (err: any) {
      console.warn(err);
      setError(err.response?.data?.message || "Failed to start session.");
    }
  };

  const handleEndSession = async (session: Session) => {
    try {
      setError("");
      await api.post("/api/scan/end", {
        sessionId: session.id,
        batchId: session.batch_id,
        sessionDate: session.session_date,
        token: session.qr_token
      });
      await fetchTodaySessions();
      setSelectedSession({ ...session, status: "completed", qr_token: null });
    } catch (err: any) {
      console.warn(err);
      setError(err.response?.data?.message || "Failed to end session.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-sky-50 border border-sky-200/50 rounded-xl flex items-center justify-center text-sky-600">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">CynexAI Portal</h1>
            <p className="text-xs text-sky-600 font-semibold">Clerk Attendance Operations</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end text-right">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="text-sm font-semibold text-slate-900 hover:text-sky-600 transition-colors"
            >
              {user?.name}
            </button>
            <span className="text-xs text-slate-500">{user?.email}</span>
          </div>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-xl border border-slate-200 transition-colors"
            title="Profile Settings"
          >
            <User className="w-5 h-5" />
          </button>
          <button
            onClick={logout}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-xl border border-slate-200 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Selected Session & Student Attendance QR codes */}
        {selectedSession ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-sky-50/50 blur-[70px] pointer-events-none rounded-full" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div>
                <span className="text-[10px] text-sky-600 font-bold uppercase tracking-wider">Active Lecture Monitor</span>
                <h3 className="font-bold text-slate-900 text-lg mt-0.5">{selectedSession.batch_name}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Instructor: {selectedSession.trainer_name} | Date: {selectedSession.session_date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                  selectedSession.status === "scheduled"
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : selectedSession.status === "active"
                      ? "bg-sky-50 border-sky-200 text-sky-700 animate-pulse"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}>
                  {selectedSession.status}
                </span>
                
                {selectedSession.status === "scheduled" && (
                  <button
                    onClick={() => handleStartSession(selectedSession)}
                    className="py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Session
                  </button>
                )}
                {selectedSession.status === "active" && (
                  <button
                    onClick={() => handleEndSession(selectedSession)}
                    className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <StopCircle className="w-3.5 h-3.5" /> End Session
                  </button>
                )}
              </div>
            </div>

            {selectedSession.status === "active" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4">
                <div className="flex flex-col items-center text-center p-4 border border-slate-100 bg-slate-50/50 rounded-2xl">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">1. Check-In QR Code</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mb-4">Students scan this to mark attendance entry</p>
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                    {startQrUrl ? (
                      <img src={startQrUrl} alt="Check-In QR" className="w-[180px] h-[180px]" />
                    ) : (
                      <div className="w-[180px] h-[180px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">Loading...</div>
                    )}
                  </div>
                  <span className="mt-4 px-3 py-1 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-full border border-sky-100 uppercase tracking-wider">
                    Check-In Active
                  </span>
                </div>

                <div className="flex flex-col items-center text-center p-4 border border-slate-100 bg-slate-50/50 rounded-2xl">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">2. Check-Out QR Code</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mb-4">Students scan this to mark attendance exit</p>
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                    {endQrUrl ? (
                      <img src={endQrUrl} alt="Check-Out QR" className="w-[180px] h-[180px]" />
                    ) : (
                      <div className="w-[180px] h-[180px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">Loading...</div>
                    )}
                  </div>
                  <span className="mt-4 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-wider">
                    Check-Out Active
                  </span>
                </div>
              </div>
            ) : selectedSession.status === "scheduled" ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Play className="w-12 h-12 mb-3 text-slate-300" />
                <h4 className="font-bold text-slate-800 text-sm">Session is Scheduled</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Click the &quot;Start Session&quot; button above to activate the lecture and display the attendance QR codes for students.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-emerald-600 bg-emerald-50/30 rounded-2xl border border-dashed border-emerald-200">
                <StopCircle className="w-12 h-12 mb-3 text-emerald-300" />
                <h4 className="font-bold text-slate-800 text-sm">Session Completed</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">This lecture session has finished. Attendance records have been finalized and stored in the database.</p>
              </div>
            )}

            {/* Student Attendance List */}
            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-600" />
                  Student Attendance Registry ({attendanceList.length})
                </h4>
                <button
                  type="button"
                  onClick={() => fetchAttendance(selectedSession.id)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-500 transition-colors"
                >
                  Sync Attendance
                </button>
              </div>

              {attendanceList.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium">No students registered in this session&apos;s batch, or session is not active yet.</p>
              ) : (
                <div className="overflow-hidden border border-slate-100 rounded-xl bg-slate-50/20">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
                        <th className="py-2.5 px-4">Student Name</th>
                        <th className="py-2.5 px-4">Email</th>
                        <th className="py-2.5 px-4">Check-In</th>
                        <th className="py-2.5 px-4">Check-Out</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {attendanceList.map((record) => (
                        <tr key={record.studentEmail} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">{record.studentName}</td>
                          <td className="py-2.5 px-4 text-slate-500">{record.studentEmail}</td>
                          <td className="py-2.5 px-4 text-slate-500 font-medium">
                            {record.timestamp ? new Date(record.timestamp).toLocaleTimeString() : "-"}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-medium">
                            {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : "-"}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                              record.status === "present"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-red-50 border-red-200 text-red-700"
                            }`}>
                              {record.status}
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
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <h4 className="font-bold text-slate-800 text-sm">No Active Session Selected</h4>
            <p className="text-xs mt-1">Select one of today&apos;s scheduled sessions in the monitor below to start it and display QR codes.</p>
          </div>
        )}

        {/* Sessions Monitor */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400" />
              Today&apos;s Session Monitor ({sessions.length})
            </h3>
            <button
              onClick={fetchTodaySessions}
              className="text-xs font-bold text-sky-600 hover:text-sky-500 transition-colors"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            {sessions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="text-sm">No attendance sessions scheduled for today.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-6">Batch Name</th>
                    <th className="py-3.5 px-6">Assigned Trainer</th>
                    <th className="py-3.5 px-6">Scheduled Date</th>
                    <th className="py-3.5 px-6">State Machine Status</th>
                    <th className="py-3.5 px-6">Start Time</th>
                    <th className="py-3.5 px-6">End Time</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {sessions.map(s => (
                    <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${selectedSession?.id === s.id ? "bg-sky-50/20" : ""}`}>
                      <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                        {s.batch_name}
                      </td>
                      <td className="py-4 px-6 text-slate-500 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-sky-600 font-bold">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        {s.trainer_name}
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-medium">{s.session_date}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          s.status === "scheduled"
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : s.status === "active"
                              ? "bg-sky-50 border-sky-200 text-sky-700"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-xs">
                        {s.start_time ? new Date(s.start_time).toLocaleTimeString() : "-"}
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-xs">
                        {s.end_time ? new Date(s.end_time).toLocaleTimeString() : "-"}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedSession(s);
                              fetchAttendance(s.id);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              selectedSession?.id === s.id
                                ? "bg-sky-600 text-white border-sky-600"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 shadow-xs"
                            }`}
                          >
                            Select View
                          </button>
                          {s.status === "scheduled" && (
                            <button
                              onClick={() => handleStartSession(s)}
                              className="px-3 py-1.5 bg-sky-50 text-sky-750 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-bold transition-colors"
                            >
                              Start
                            </button>
                          )}
                          {s.status === "active" && (
                            <button
                              onClick={() => handleEndSession(s)}
                              className="px-3 py-1.5 bg-red-50 text-red-755 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-colors"
                            >
                              End
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

    </div>
  );
}
