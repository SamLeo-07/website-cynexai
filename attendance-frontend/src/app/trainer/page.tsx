/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth, useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { 
  LogOut, 
  BookOpen, 
  Calendar, 
  QrCode, 
  CheckCircle, 
  AlertTriangle,
  ListFilter,
  Activity,
  User
} from "lucide-react";
import ProfileModal from "../../components/ProfileModal";

interface Session {
  id: string;
  batch_id: string;
  batch_name: string;
  session_date: string;
  status: "scheduled" | "active" | "completed";
  start_time: string | null;
  end_time: string | null;
  qr_token: string | null;
}

export default function TrainerPortal() {
  const { user, loading: authLoading } = useRequireAuth(["trainer", "admin"]);
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  // Profile modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTrainerData();
    }
  }, [user]);

  const fetchTrainerData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const sessionsRes = await api.get("/api/sessions/my");
      setSessions(sessionsRes.data.sessions || []);
    } catch (err: any) {
      console.warn(err);
      setError(err.response?.data?.message || "Failed to load trainer data.");
    } finally {
      setLoading(false);
    }
  };

  const handleScanAction = () => {
    router.push("/scanner?action=trainer");
  };

  // Helper to determine if trainer has checked in for a session
  // Since logs are in database, we can check if trainer_id and session_id log exists
  // For simplicity, we can inspect s.start_time or lookup in logs

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate statistics
  const totalAssigned = sessions.length;
  const activeSessionsCount = sessions.filter(s => s.status === "active").length;
  const completedSessionsCount = sessions.filter(s => s.status === "completed").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-sky-50 border border-sky-200/50 rounded-xl flex items-center justify-center text-sky-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">CynexAI Portal</h1>
            <p className="text-xs text-sky-600 font-semibold">Trainer Console</p>
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
            <span className="text-xs text-slate-500">{user?.role === "trainer" ? "Lead Trainer" : "Administrator"}</span>
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

      {/* Main Grid */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        
        {/* Welcome Card & Scanner shortcut */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-sky-100/50 blur-[80px] pointer-events-none rounded-full" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Assigned Lectures Dashboard
            </h2>
            <p className="text-slate-500 text-xs mt-1.5 max-w-xl font-medium">
              View your assigned sessions, track your lecture status, and check-in to class lectures by scanning the generated session QR code.
            </p>
          </div>
          <button
            onClick={handleScanAction}
            className="self-start md:self-auto py-3 px-6 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-sky-600/10 flex items-center justify-center gap-2 shrink-0"
          >
            <QrCode className="w-5 h-5" />
            Trainer Check-In Scan
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-slate-200/85 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl text-sky-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Lectures</p>
              <h3 className="text-2xl font-bold text-slate-950 mt-1">{totalAssigned}</h3>
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-200/85 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl text-sky-600">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Lectures</p>
              <h3 className="text-2xl font-bold text-slate-950 mt-1">{activeSessionsCount}</h3>
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-200/85 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Completed Lectures</p>
              <h3 className="text-2xl font-bold text-slate-950 mt-1">{completedSessionsCount}</h3>
            </div>
          </div>
        </div>

        {/* Assigned Sessions */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ListFilter className="w-4.5 h-4.5 text-slate-400" />
              Your Assigned Class Sessions
            </h3>
            <button
              onClick={fetchTrainerData}
              className="text-xs font-semibold text-sky-600 hover:text-sky-500 transition-colors"
            >
              Sync Records
            </button>
          </div>

          <div className="overflow-x-auto">
            {sessions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="text-sm">No class sessions assigned to your account.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-6">Batch Name</th>
                    <th className="py-3.5 px-6">Scheduled Date</th>
                    <th className="py-3.5 px-6">State Machine Status</th>
                    <th className="py-3.5 px-6">Lecture Start</th>
                    <th className="py-3.5 px-6">Lecture End</th>
                    <th className="py-3.5 px-6 text-right">Self Check-In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {sessions.map(s => {
                    // Trainer check in is recorded if status is active or completed, or start_time is set
                    const hasCheckedIn = s.status === "active" || s.status === "completed";
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">{s.batch_name}</td>
                        <td className="py-4 px-6 text-slate-500 font-medium">{s.session_date}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            s.status === "scheduled"
                              ? "bg-amber-50 border-amber-200 text-amber-750"
                              : s.status === "active"
                                ? "bg-sky-50 border-sky-200 text-sky-750"
                                : "bg-emerald-50 border-emerald-200 text-emerald-750"
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
                        <td className="py-4 px-6 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            hasCheckedIn
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-slate-50 border-slate-200 text-slate-500"
                          }`}>
                            {hasCheckedIn ? "Checked In" : "Pending Scan"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
