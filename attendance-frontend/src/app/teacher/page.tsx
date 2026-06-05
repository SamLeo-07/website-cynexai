/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @next/next/no-img-element */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRequireAuth, useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import QRCode from "qrcode";
import { 
  LogOut, 
  Plus, 
  Users, 
  Clock, 
  QrCode, 
  CheckCircle, 
  Play, 
  Activity,
  X,
  User
} from "lucide-react";
import ProfileModal from "../../components/ProfileModal";

interface Batch {
  id: string;
  name: string;
}

interface Session {
  id: string;
  batchId: string;
  batchName: string;
  createdBy: string;
  teacherName: string;
  expiresAt: string;
  isExpired: boolean;
}

interface Attendee {
  id: string;
  studentName: string;
  studentEmail: string;
  timestamp: string;
}

export default function TeacherDashboard() {
  const { user, loading: authLoading } = useRequireAuth(["trainer", "admin"]);
  const { logout } = useAuth();
  
  // Profile modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrExpirationText, setQrExpirationText] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  
  // Form State
  const [selectedBatch, setSelectedBatch] = useState("");
  const [duration, setDuration] = useState("15");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);

  // Timers Refs for polling & countdowns
  const qrIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState("");

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
    return () => {
      clearAllTimers();
    };
  }, [user]);

  const clearAllTimers = () => {
    if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [batchesRes, sessionsRes] = await Promise.all([
        api.get("/api/users/batches"),
        api.get("/api/sessions")
      ]);
      setBatches(batchesRes.data.batches || []);
      const sessionList = sessionsRes.data.sessions || [];
      setSessions(sessionList);

      // Automatically recover active unexpired session if one exists
      const unexpired = sessionList.find((s: Session) => !s.isExpired && s.createdBy === user?.id);
      if (unexpired) {
        startActiveSessionMonitoring(unexpired);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    if (!selectedBatch) {
      setFormError("Please select a batch.");
      return;
    }

    try {
      setFormLoading(true);
      const response = await api.post("/api/sessions/create", {
        batchId: selectedBatch,
        durationMinutes: parseInt(duration)
      });
      
      const newSession = response.data.session;
      
      // Re-fetch sessions to update list
      const sessionsRes = await api.get("/api/sessions");
      const sessionList = sessionsRes.data.sessions || [];
      setSessions(sessionList);

      // Find the newly created session in the populated list to have batchName
      const populatedSession = sessionList.find((s: Session) => s.id === newSession.id);
      if (populatedSession) {
        startActiveSessionMonitoring(populatedSession);
      }
      setSelectedBatch("");
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create session.");
    } finally {
      setFormLoading(false);
    }
  };

  const startActiveSessionMonitoring = (session: Session) => {
    clearAllTimers();
    setActiveSession(session);
    
    fetchQR(session.id);
    qrIntervalRef.current = setInterval(() => {
      fetchQR(session.id);
    }, 10000);

    fetchSessionAttendance(session.id);
    pollIntervalRef.current = setInterval(() => {
      fetchSessionAttendance(session.id);
    }, 5000);

    updateCountdown(session.expiresAt);
    countdownIntervalRef.current = setInterval(() => {
      updateCountdown(session.expiresAt);
    }, 1000);
  };

  const fetchQR = async (sessionId: string) => {
    try {
      const response = await api.get(`/api/sessions/${sessionId}/qr`);
      const { qrToken } = response.data;
      const dataUrl = await QRCode.toDataURL(qrToken, {
        width: 300,
        margin: 2,
        color: {
          dark: "#0f172a", // slate-900 (QR modules)
          light: "#ffffff" // white (QR background)
        }
      });
      setQrCodeUrl(dataUrl);
      setQrExpirationText("Refreshes in 10s");
    } catch (err: any) {
      console.warn("QR Code fetch failed:", err);
      if (err.response?.status === 400) {
        handleSessionExpired();
      }
    }
  };

  const fetchSessionAttendance = async (sessionId: string) => {
    try {
      const response = await api.get(`/api/attendance/report?sessionId=${sessionId}`);
      setAttendees(response.data.report || []);
    } catch (err) {
      console.warn(err);
    }
  };

  const updateCountdown = (expiresAtStr: string) => {
    const expiresAt = new Date(expiresAtStr).getTime();
    const diff = expiresAt - Date.now();

    if (diff <= 0) {
      handleSessionExpired();
      return;
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    setTimeRemaining(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
  };

  const handleSessionExpired = () => {
    clearAllTimers();
    setActiveSession(null);
    setQrCodeUrl("");
    setAttendees([]);
    setTimeRemaining("");
    api.get("/api/sessions").then(res => setSessions(res.data.sessions || []));
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
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-sky-50 border border-sky-200/50 rounded-xl flex items-center justify-center text-sky-600">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">CynexAI Portal</h1>
            <p className="text-xs text-sky-600 font-semibold">Trainer Dashboard</p>
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

      {/* Main layout */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          {/* Create Session Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-600" />
              Create Class Session
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Select Target Batch
                </label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                >
                  <option value="">-- Choose Batch --</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Expiration Duration (Minutes)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                >
                  <option value="5">5 Minutes</option>
                  <option value="10">10 Minutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={formLoading || !!activeSession}
                className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all shadow-md shadow-sky-600/10 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Session
              </button>

              {activeSession && (
                <p className="text-[11px] text-amber-600 text-center font-semibold mt-2">
                  ⚠️ Close the active session before starting a new one.
                </p>
              )}
            </form>
          </div>

          {/* Session logs */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-grow overflow-hidden flex flex-col max-h-[400px] lg:max-h-none">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-slate-400" />
                Previous Sessions
              </h3>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-100 flex-grow">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400 p-8 text-center">No sessions generated yet.</p>
              ) : (
                sessions.map(s => (
                  <div key={s.id} className="p-4 hover:bg-slate-50/50 flex items-center justify-between text-xs transition-colors">
                    <div>
                      <p className="font-bold text-slate-900">{s.batchName}</p>
                      <p className="text-slate-500 mt-1">
                        Expires: {new Date(s.expiresAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      {s.isExpired ? (
                        <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-400 font-semibold">
                          Expired
                        </span>
                      ) : (
                        <button
                          onClick={() => startActiveSessionMonitoring(s)}
                          className="px-2.5 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 font-bold transition-all"
                        >
                          View QR
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {activeSession ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <button 
                onClick={handleSessionExpired}
                className="absolute top-4 right-4 p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-slate-400 transition-colors animate-scale-up"
                title="Close monitor"
              >
                <X className="w-4 h-4" />
              </button>

              {/* QR display column */}
              <div className="flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-100">
                <span className="text-xs font-bold bg-sky-50 border border-sky-200 text-sky-600 px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                  Active Session QR
                </span>
                
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-md shadow-slate-100/50 hover:scale-[1.01] transition-transform duration-300">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Attendance QR Code" className="w-56 h-56 md:w-64 md:h-64" />
                  ) : (
                    <div className="w-56 h-56 md:w-64 md:h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-col items-center gap-1">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">{qrExpirationText}</p>
                  <p className="text-xl font-bold text-amber-600 flex items-center gap-2 mt-2">
                    <Clock className="w-5 h-5 animate-pulse" />
                    {timeRemaining} remaining
                  </p>
                </div>
              </div>

              {/* Live check-ins column */}
              <div className="flex flex-col h-[400px]">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-sky-600 animate-pulse" />
                    Live Student Check-Ins ({attendees.length})
                  </h4>
                </div>

                <div className="overflow-y-auto flex-grow divide-y divide-slate-100 pr-2">
                  {attendees.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-455">
                      <Users className="w-10 h-10 mb-2 opacity-25" />
                      <p className="text-xs">No check-ins logged yet.</p>
                      <p className="text-[10px] mt-1">Students will appear here once they scan the code.</p>
                    </div>
                  ) : (
                    attendees.map(a => (
                      <div key={a.studentEmail} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sky-600 font-bold">
                            {a.studentName[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{a.studentName}</p>
                            <p className="text-[10px] text-slate-500">{a.studentEmail}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 fill-current text-emerald-50" />
                            {new Date(a.timestamp).toLocaleTimeString(undefined, { 
                              hour: '2-digit', 
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-grow bg-white border border-slate-200 rounded-2xl border-dashed flex flex-col items-center justify-center p-12 text-center text-slate-400 min-h-[400px] shadow-sm">
              <QrCode className="w-16 h-16 mb-4 opacity-25 text-sky-500" />
              <h3 className="text-lg font-bold text-slate-700">No Active Attendance Session</h3>
              <p className="text-sm max-w-sm mt-2 text-slate-500">
                Select a batch and define session minutes on the left panel to launch a dynamic QR checkout interface.
              </p>
            </div>
          )}
        </div>

      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

    </div>
  );
}
