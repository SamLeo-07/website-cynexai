/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth, useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { 
  LogOut, 
  Calendar, 
  CheckCircle, 
  Percent, 
  Camera, 
  Clock, 
  AlertTriangle,
  User,
  CheckSquare
} from "lucide-react";
import ProfileModal from "../../components/ProfileModal";

interface AttendanceRecord {
  id: string;
  timestamp: string | null;
  checkOutTime?: string | null;
  status: "present" | "absent";
  batchName: string;
  trainerName: string;
  sessionDate: string;
}

interface Stats {
  totalSessions: number;
  totalPresents: number;
  percentage: number;
}

interface TodaySession {
  id: string;
  batch_id: string;
  batch_name: string;
  trainer_id: string;
  trainer_name: string;
  session_date: string;
  status: "scheduled" | "active" | "completed";
}

export default function StudentDashboard() {
  const { user, loading: authLoading } = useRequireAuth(["student"]);
  const { logout } = useAuth();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSessions: 0, totalPresents: 0, percentage: 0 });
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Profile modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (user && user.role === "student") {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [attendanceRes, todaySessionsRes] = await Promise.all([
        api.get("/api/attendance/report"),
        api.get("/api/sessions/today")
      ]);

      setHistory(attendanceRes.data.history || []);
      setStats(attendanceRes.data.stats || { totalSessions: 0, totalPresents: 0, percentage: 0 });
      setTodaySessions(todaySessionsRes.data.sessions || []);
    } catch (err: any) {
      console.warn(err);
      setError(err.response?.data?.message || "Failed to load student data.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (loading && !history.length && !todaySessions.length)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Find if there is an active session right now
  const activeSession = todaySessions.find(s => s.status === "active");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-sky-50 border border-sky-200/50 rounded-xl flex items-center justify-center text-sky-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">CynexAI Portal</h1>
            <p className="text-xs text-sky-600 font-semibold">Student Dashboard</p>
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
      <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* Welcome Section & Quick Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-sky-100/50 blur-[80px] pointer-events-none rounded-full" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Welcome back, {user?.name}! 👋
            </h2>
            <p className="text-slate-500 text-sm mt-1.5 max-w-xl font-medium">
              Keep track of your classes and scan the QR code displayed in the classroom to mark your attendance.
            </p>
          </div>
          {activeSession ? (
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="/scanner?action=student"
                className="py-3 px-5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-sky-600/10 flex items-center justify-center gap-2 animate-pulse text-xs"
              >
                <Camera className="w-4 h-4" />
                Scan Check-In
              </Link>
              <Link
                href="/scanner?action=student_end"
                className="py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 text-xs"
              >
                <Camera className="w-4 h-4" />
                Scan Check-Out
              </Link>
            </div>
          ) : (
            <button
              disabled
              className="self-start md:self-auto py-3.5 px-6 bg-slate-100 text-slate-400 font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-3 shrink-0 cursor-not-allowed"
            >
              <Camera className="w-5 h-5" />
              No Active Class
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Today's Lectures Status Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-sky-600" />
            Today&apos;s Scheduled Lectures ({todaySessions.length})
          </h3>
          {todaySessions.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium">No sessions scheduled for your batch today.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {todaySessions.map(s => (
                <div key={s.id} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{s.batch_name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">Instructor: {s.trainer_name}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                    s.status === "scheduled"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : s.status === "active"
                        ? "bg-sky-50 border-sky-200 text-sky-700 animate-pulse"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-slate-200/85 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl text-sky-600">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Attendance Rate</p>
              <h3 className="text-2xl font-bold text-slate-955 mt-1">{stats.percentage}%</h3>
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-200/85 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Sessions</p>
              <h3 className="text-2xl font-bold text-slate-955 mt-1">{stats.totalSessions}</h3>
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-200/85 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Attended Classes</p>
              <h3 className="text-2xl font-bold text-slate-955 mt-1">{stats.totalPresents}</h3>
            </div>
          </div>
        </div>

        {/* Attendance Log Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              Attendance History
            </h3>
            <button 
              onClick={fetchStudentData}
              className="text-xs font-semibold text-sky-600 hover:text-sky-500 transition-colors"
            >
              Sync Log History
            </button>
          </div>

          <div className="overflow-x-auto">
            {history.length === 0 ? (
              <div className="p-12 text-center text-slate-455">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No attendance records found.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-4 px-6">Batch</th>
                    <th className="py-4 px-6">Instructor</th>
                    <th className="py-4 px-6">Lecture Date</th>
                    <th className="py-4 px-6">Check-In Time</th>
                    <th className="py-4 px-6">Check-Out Time</th>
                    <th className="py-4 px-6 text-right">Attendance Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {history.map((record) => {
                    const checkInDate = record.timestamp ? new Date(record.timestamp) : null;
                    return (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4.5 px-6 font-semibold text-slate-900">{record.batchName}</td>
                        <td className="py-4.5 px-6 text-slate-600 flex items-center gap-2">
                          <div className="w-6.5 h-6.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-sky-600 font-bold">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          {record.trainerName}
                        </td>
                        <td className="py-4.5 px-6 text-slate-500 font-medium">{record.sessionDate}</td>
                        <td className="py-4.5 px-6 text-slate-500 text-xs">
                          {checkInDate ? checkInDate.toLocaleTimeString() : "-"}
                        </td>
                        <td className="py-4.5 px-6 text-slate-500 text-xs">
                          {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : "-"}
                        </td>
                        <td className="py-4.5 px-6 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            record.status === "present"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-red-50 border-red-200 text-red-700"
                          }`}>
                            {record.status === "present" ? "Present" : "Absent"}
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
