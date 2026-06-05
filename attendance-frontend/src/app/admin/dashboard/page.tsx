/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useRequireAuth, useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import QRCode from "qrcode";
import { 
  LogOut, 
  Users, 
  Layers, 
  BookOpen,
  Calendar,
  ClipboardList, 
  Download, 
  CheckCircle,
  AlertCircle,
  Search,
  Pencil,
  Trash2,
  Plus,
  QrCode,
  History,
  User,
  ArrowLeft,
  Phone,
  UserPlus
} from "lucide-react";
import ProfileModal from "../../../components/ProfileModal";

interface Course {
  id: string;
  name: string;
  description: string;
}

interface Batch {
  id: string;
  name: string;
  course_id: string;
  course_name: string;
  start_date?: string;
  end_date?: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "admin" | "clerk" | "trainer" | "student";
  mobile_number?: string | null;
  created_at?: string | null;
  batches?: Array<{ id: string; name: string }>;
}

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

interface AuditLog {
  id: string;
  scan_type: "start" | "trainer" | "student" | "end";
  timestamp: string;
  user_name: string;
  user_email: string;
  user_role: string;
  session_date: string;
  batch_name: string;
}

interface ReportRecord {
  id: string;
  timestamp: string | null;
  checkOutTime?: string | null;
  status: "present" | "absent";
  studentName: string;
  studentEmail: string;
  sessionId: string;
  sessionDate: string;
  batchName: string;
  trainerName: string;
}

const extractTimeFromIso = (isoStr: string | null) => {
  if (!isoStr) return "";
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return "";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "";
  }
};

const formatJoinedDate = (isoStr: string | null | undefined) => {
  if (!isoStr) return "N/A";
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "N/A";
  }
};

const combineDateAndTime = (dateStr: string, timeStr: string) => {
  if (!dateStr || !timeStr) return null;
  // dateStr is YYYY-MM-DD, timeStr is HH:MM
  const dt = new Date(`${dateStr}T${timeStr}`);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
};

export default function AdminConsole() {
  const { user, loading: authLoading } = useRequireAuth(["admin"]);
  const { logout } = useAuth();
  
  // Profile modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<"users" | "batches" | "courses" | "sessions" | "audit" | "reports">("users");

  // Data Lists
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [batchesList, setBatchesList] = useState<Batch[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [sessionsList, setSessionsList] = useState<Session[]>([]);
  const [auditList, setAuditList] = useState<AuditLog[]>([]);
  const [reportList, setReportList] = useState<ReportRecord[]>([]);

  // Search/Filters
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [reportBatchFilter, setReportBatchFilter] = useState("");
  const [reportSearchQuery, setReportSearchQuery] = useState("");

  // Loading States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // --- CRUD Modals & Forms State ---
  
  // Course Modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseName, setCourseName] = useState("");
  const [courseDesc, setCourseDesc] = useState("");

  // Batch Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [batchId, setBatchId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [batchCourseId, setBatchCourseId] = useState("");
  const [batchStartDate, setBatchStartDate] = useState("");
  const [batchEndDate, setBatchEndDate] = useState("");

  // Manage Students Modal
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [selectedManageStudentsBatch, setSelectedManageStudentsBatch] = useState<Batch | null>(null);
  const [assignedStudentsList, setAssignedStudentsList] = useState<UserItem[]>([]);
  const [manageStudentsError, setManageStudentsError] = useState("");
  const [studentToAddId, setStudentToAddId] = useState("");

  // Batch details view states
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<Batch | null>(null);
  const [batchStudents, setBatchStudents] = useState<UserItem[]>([]);
  const [studentsSearchQuery, setStudentsSearchQuery] = useState("");
  const [allStudents, setAllStudents] = useState<UserItem[]>([]);
  const [studentToAssignId, setStudentToAssignId] = useState("");
  const [batchDetailsError, setBatchDetailsError] = useState("");
  
  // Quick Register Student states
  const [regStudentName, setRegStudentName] = useState("");
  const [regStudentEmail, setRegStudentEmail] = useState("");
  const [regStudentPassword, setRegStudentPassword] = useState("");
  const [regStudentMobile, setRegStudentMobile] = useState("");
  const [regStudentError, setRegStudentError] = useState("");
  const [regStudentSuccess, setRegStudentSuccess] = useState("");
  const [isRegisteringStudent, setIsRegisteringStudent] = useState(false);

  // Session Modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionBatchId, setSessionBatchId] = useState("");
  const [sessionTrainerId, setSessionTrainerId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionStatus, setSessionStatus] = useState<"scheduled" | "active" | "completed">("scheduled");
  const [sessionStartTime, setSessionStartTime] = useState("");
  const [sessionEndTime, setSessionEndTime] = useState("");
  const [sessionScheduleType, setSessionScheduleType] = useState<"single" | "recurring">("single");
  const [sessionStartDate, setSessionStartDate] = useState("");
  const [sessionEndDate, setSessionEndDate] = useState("");
  const [sessionExcludeWeekends, setSessionExcludeWeekends] = useState(true);

  // User Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "clerk" | "trainer" | "student">("student");
  const [userBatchId, setUserBatchId] = useState("");

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // QR Viewer Modal
  const [qrSession, setQrSession] = useState<Session | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      
      if (activeTab === "courses") {
        const res = await api.get("/api/courses");
        setCoursesList(res.data.courses || []);
      } else if (activeTab === "batches") {
        const [batchesRes, coursesRes] = await Promise.all([
          api.get("/api/batches"),
          api.get("/api/courses")
        ]);
        setBatchesList(batchesRes.data.batches || []);
        setCoursesList(coursesRes.data.courses || []);
      } else if (activeTab === "sessions") {
        const [sessionsRes, batchesRes, usersRes] = await Promise.all([
          api.get("/api/sessions"),
          api.get("/api/batches"),
          api.get("/api/users?role=trainer")
        ]);
        setSessionsList(sessionsRes.data.sessions || []);
        setBatchesList(batchesRes.data.batches || []);
        setUsersList(usersRes.data.users || []);
      } else if (activeTab === "users") {
        const [usersRes, batchesRes] = await Promise.all([
          api.get("/api/users"),
          api.get("/api/batches")
        ]);
        setUsersList(usersRes.data.users || []);
        setBatchesList(batchesRes.data.batches || []);
      } else if (activeTab === "audit") {
        const res = await api.get("/api/attendance/logs");
        setAuditList(res.data.logs || []);
      } else if (activeTab === "reports") {
        const [reportRes, batchesRes] = await Promise.all([
          api.get("/api/attendance/report"),
          api.get("/api/batches")
        ]);
        setReportList(reportRes.data.report || []);
        setBatchesList(batchesRes.data.batches || []);
      }
    } catch (err: any) {
      console.warn(err);
      setError(err.response?.data?.message || "Failed to fetch dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // --- Actions ---

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await api.put(`/api/courses/${editingCourse.id}`, { name: courseName, description: courseDesc });
        setSuccessMsg("Course updated successfully!");
      } else {
        await api.post("/api/courses", { name: courseName, description: courseDesc });
        setSuccessMsg("Course created successfully!");
      }
      setShowCourseModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save course.");
    }
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (batchStartDate && batchEndDate && new Date(batchStartDate) > new Date(batchEndDate)) {
        setError("Start date cannot be after end date.");
        return;
      }
      if (editingBatch) {
        await api.put(`/api/batches/${editingBatch.id}`, { 
          name: batchName, 
          courseId: batchCourseId,
          start_date: batchStartDate || null,
          end_date: batchEndDate || null
        });
        setSuccessMsg("Batch updated successfully!");
      } else {
        await api.post("/api/batches", { 
          id: batchId || undefined,
          name: batchName, 
          courseId: batchCourseId,
          start_date: batchStartDate || null,
          end_date: batchEndDate || null
        });
        setSuccessMsg("Batch created successfully!");
      }
      setShowBatchModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save batch.");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOpenManageStudents = async (batch: Batch) => {
    setSelectedManageStudentsBatch(batch);
    setManageStudentsError("");
    setStudentToAddId("");
    setShowManageStudentsModal(true);
    try {
      const [studentsRes, allUsersRes] = await Promise.all([
        api.get(`/api/batches/${batch.id}/students`),
        api.get("/api/users?role=student")
      ]);
      setAssignedStudentsList(studentsRes.data.students || []);
      setUsersList(allUsersRes.data.users || []);
    } catch (err: any) {
      setManageStudentsError(err.response?.data?.message || "Failed to load batch students.");
    }
  };

  const handleOpenBatchDetails = async (batch: Batch) => {
    setSelectedBatchDetails(batch);
    setBatchDetailsError("");
    setStudentsSearchQuery("");
    setStudentToAssignId("");
    
    // Clear registration form states
    setRegStudentName("");
    setRegStudentEmail("");
    setRegStudentPassword("");
    setRegStudentMobile("");
    setRegStudentError("");
    setRegStudentSuccess("");
    
    try {
      const [studentsRes, allUsersRes] = await Promise.all([
        api.get(`/api/batches/${batch.id}/students`),
        api.get("/api/users?role=student")
      ]);
      setBatchStudents(studentsRes.data.students || []);
      setAllStudents(allUsersRes.data.users || []);
    } catch (err: any) {
      setBatchDetailsError(err.response?.data?.message || "Failed to load batch student details.");
    }
  };

  const refreshBatchDetails = async (batchId: string) => {
    try {
      const [studentsRes, allUsersRes] = await Promise.all([
        api.get(`/api/batches/${batchId}/students`),
        api.get("/api/users?role=student")
      ]);
      setBatchStudents(studentsRes.data.students || []);
      setAllStudents(allUsersRes.data.users || []);
    } catch (err: any) {
      setBatchDetailsError(err.response?.data?.message || "Failed to refresh batch student details.");
    }
  };

  const handleAssignExistingStudent = async (studentId: string) => {
    if (!selectedBatchDetails || !studentId) return;
    setBatchDetailsError("");
    try {
      const currentIds = batchStudents.map(s => s.id);
      if (currentIds.includes(studentId)) {
        setBatchDetailsError("Student is already in this batch.");
        return;
      }
      
      const newIds = [...currentIds, studentId];
      await api.post(`/api/batches/${selectedBatchDetails.id}/students`, { studentIds: newIds });
      setSuccessMsg("Student assigned successfully!");
      setStudentToAssignId("");
      await refreshBatchDetails(selectedBatchDetails.id);
    } catch (err: any) {
      setBatchDetailsError(err.response?.data?.message || "Failed to assign student.");
    }
  };

  const handleRemoveStudentFromDetails = async (studentId: string) => {
    if (!selectedBatchDetails) return;
    setBatchDetailsError("");
    try {
      const newIds = batchStudents.filter(s => s.id !== studentId).map(s => s.id);
      await api.post(`/api/batches/${selectedBatchDetails.id}/students`, { studentIds: newIds });
      setSuccessMsg("Student removed from batch successfully.");
      await refreshBatchDetails(selectedBatchDetails.id);
    } catch (err: any) {
      setBatchDetailsError(err.response?.data?.message || "Failed to remove student.");
    }
  };

  const handleRegisterAndAssignStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchDetails) return;
    setRegStudentError("");
    setRegStudentSuccess("");
    setIsRegisteringStudent(true);
    
    try {
      await api.post("/api/users/create", {
        name: regStudentName.trim(),
        email: regStudentEmail.trim().toLowerCase(),
        password: regStudentPassword,
        role: "student",
        batchId: selectedBatchDetails.id,
        mobileNumber: regStudentMobile.trim() || undefined
      });
      
      setRegStudentSuccess(`Student "${regStudentName}" registered and assigned successfully!`);
      setRegStudentName("");
      setRegStudentEmail("");
      setRegStudentPassword("");
      setRegStudentMobile("");
      
      await refreshBatchDetails(selectedBatchDetails.id);
    } catch (err: any) {
      setRegStudentError(err.response?.data?.message || "Failed to register and assign student.");
    } finally {
      setIsRegisteringStudent(false);
    }
  };

  const handleRemoveStudentFromBatch = (studentId: string) => {
    setAssignedStudentsList(prev => prev.filter(s => s.id !== studentId));
  };

  const handleAddStudentToBatch = () => {
    if (!studentToAddId) return;
    const student = usersList.find(u => u.id === studentToAddId);
    if (!student) return;
    if (assignedStudentsList.some(s => s.id === student.id)) {
      setManageStudentsError("Student is already assigned to this batch.");
      return;
    }
    setAssignedStudentsList(prev => [...prev, student]);
    setStudentToAddId("");
    setManageStudentsError("");
  };

  const handleSaveBatchStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManageStudentsBatch) return;
    try {
      const studentIds = assignedStudentsList.map(s => s.id);
      await api.post(`/api/batches/${selectedManageStudentsBatch.id}/students`, { studentIds });
      setSuccessMsg("Batch student assignments updated successfully!");
      setShowManageStudentsModal(false);
      fetchData();
    } catch (err: any) {
      setManageStudentsError(err.response?.data?.message || "Failed to update batch students.");
    }
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSession) {
        const startTimeIso = combineDateAndTime(sessionDate, sessionStartTime);
        const endTimeIso = combineDateAndTime(sessionDate, sessionEndTime);
        await api.put(`/api/sessions/${editingSession.id}`, {
          batchId: sessionBatchId,
          trainerId: sessionTrainerId,
          sessionDate: sessionDate,
          status: sessionStatus,
          startTime: startTimeIso,
          endTime: endTimeIso
        });
        setSuccessMsg("Session updated successfully!");
      } else {
        if (sessionScheduleType === "recurring") {
          if (!sessionStartDate || !sessionEndDate) {
            setError("Start date and End date are required for recurring sessions.");
            return;
          }
          if (new Date(sessionStartDate) > new Date(sessionEndDate)) {
            setError("Start date cannot be after end date.");
            return;
          }
          const res = await api.post("/api/sessions", {
            batchId: sessionBatchId,
            trainerId: sessionTrainerId,
            isRecurring: true,
            startDate: sessionStartDate,
            endDate: sessionEndDate,
            excludeWeekends: sessionExcludeWeekends,
            startTime: sessionStartTime || null,
            endTime: sessionEndTime || null
          });
          setSuccessMsg(res.data.message || "Recurring sessions created successfully!");
        } else {
          const startTimeIso = combineDateAndTime(sessionDate, sessionStartTime);
          const endTimeIso = combineDateAndTime(sessionDate, sessionEndTime);
          await api.post("/api/sessions", {
            batchId: sessionBatchId,
            trainerId: sessionTrainerId,
            sessionDate: sessionDate,
            startTime: startTimeIso,
            endTime: endTimeIso
          });
          setSuccessMsg("Session created successfully!");
        }
      }
      setShowSessionModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save session.");
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/api/users/${editingUser.id}`, {
          name: userName,
          email: userEmail,
          role: userRole,
          batchId: userRole === "student" ? userBatchId : undefined
        });
        setSuccessMsg("User updated successfully!");
      } else {
        await api.post("/api/users/create", {
          name: userName,
          email: userEmail,
          password: userPassword,
          role: userRole,
          batchId: userRole === "student" ? userBatchId : undefined
        });
        setSuccessMsg("User created successfully!");
      }
      setShowUserModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save user.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { type, id } = deleteTarget;
      if (type === "course") await api.delete(`/api/courses/${id}`);
      else if (type === "batch") await api.delete(`/api/batches/${id}`);
      else if (type === "session") await api.delete(`/api/sessions/${id}`);
      else if (type === "user") await api.delete(`/api/users/${id}`);
      
      setSuccessMsg(`${type.toUpperCase()} deleted successfully.`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete item.");
      setDeleteTarget(null);
    }
  };

  const showQR = async (session: Session) => {
    setQrSession(session);
    try {
      const qrPayload = JSON.stringify({
        sessionId: session.id,
        batchId: session.batch_id,
        sessionDate: session.session_date,
        token: session.qr_token
      });
      const dataUrl = await QRCode.toDataURL(qrPayload, {
        width: 300,
        margin: 2,
        color: {
          dark: "#0f172a", // slate-900
          light: "#ffffff" // white
        }
      });
      setQrCodeUrl(dataUrl);
    } catch (err) {
      console.warn(err);
    }
  };

  const exportCSV = () => {
    const headers = ["Student Name", "Student Email", "Batch", "Trainer", "Session Date", "Check-In Time", "Check-Out Time", "Status"];
    const rows = filteredReports.map(r => {
      const checkInTime = r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : "-";
      const checkOutTime = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "-";
      return [r.studentName, r.studentEmail, r.batchName, r.trainerName, r.sessionDate, checkInTime, checkOutTime, r.status];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CynexAI_E2E_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Lists
  const filteredUsers = usersList.filter(u => {
    if (userRoleFilter && u.role !== userRoleFilter) return false;
    return true;
  });

  const filteredReports = reportList.filter(r => {
    if (reportBatchFilter && r.batchName !== reportBatchFilter) return false;
    if (reportSearchQuery) {
      const q = reportSearchQuery.toLowerCase();
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.studentEmail.toLowerCase().includes(q) ||
        r.trainerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-200 flex items-center gap-3">
          <div className="h-9 w-9 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-center text-sky-600 font-bold shrink-0">
            C
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900">CynexAI Portal</h1>
            <p className="text-[10px] text-sky-600 font-semibold uppercase tracking-wider">Console Panel</p>
          </div>
        </div>

        <nav className="p-4 flex flex-col gap-1.5 flex-grow">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2.5 ${
              activeTab === "users" 
                ? "bg-sky-50 text-sky-600 border border-sky-200/50" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Users className="w-4.5 h-4.5" />
            Manage Users
          </button>
          <button
            onClick={() => setActiveTab("batches")}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2.5 ${
              activeTab === "batches" 
                ? "bg-sky-50 text-sky-600 border border-sky-200/50" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Layers className="w-4.5 h-4.5" />
            Manage Batches
          </button>
          <button
            onClick={() => setActiveTab("courses")}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2.5 ${
              activeTab === "courses" 
                ? "bg-sky-50 text-sky-600 border border-sky-200/50" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-4.5 h-4.5" />
            Manage Courses
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2.5 ${
              activeTab === "sessions" 
                ? "bg-sky-50 text-sky-600 border border-sky-200/50" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4.5 h-4.5" />
            Manage Sessions
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2.5 ${
              activeTab === "audit" 
                ? "bg-sky-50 text-sky-600 border border-sky-200/50" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <History className="w-4.5 h-4.5" />
            Scan Logs Audit
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2.5 ${
              activeTab === "reports" 
                ? "bg-sky-50 text-sky-600 border border-sky-200/50" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <ClipboardList className="w-4.5 h-4.5" />
            Attendance Reports
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex flex-col">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="text-xs font-bold text-slate-800 hover:text-sky-600 transition-colors text-left truncate max-w-[120px]"
            >
              {user?.name}
            </button>
            <span className="text-[10px] text-slate-400">Admin Account</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl transition-colors"
              title="Profile Settings"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-grow p-6 md:p-8 flex flex-col gap-6 overflow-hidden max-w-7xl">
        
        {/* Toast Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
            <button onClick={() => setError("")} className="text-xs font-bold hover:text-red-800">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-600 flex items-center justify-between animate-scale-up">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 shrink-0" />
              {successMsg}
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-xs font-bold hover:text-emerald-800">✕</button>
          </div>
        )}

        {/* Dynamic Headers */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 capitalize tracking-tight">{activeTab} Dashboard</h2>
            <p className="text-xs text-slate-400 font-medium">Create, inspect, and update module records.</p>
          </div>

          {/* Add Actions */}
          {activeTab === "courses" && (
            <button
              onClick={() => { setEditingCourse(null); setCourseName(""); setCourseDesc(""); setShowCourseModal(true); }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Course
            </button>
          )}
          {activeTab === "batches" && (
            <button
              onClick={() => { setEditingBatch(null); setBatchName(""); setBatchId(""); setBatchStartDate(""); setBatchEndDate(""); setBatchCourseId(coursesList[0]?.id || ""); setShowBatchModal(true); }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Batch
            </button>
          )}
          {activeTab === "sessions" && (
            <button
              onClick={() => { 
                setEditingSession(null); 
                setSessionBatchId(batchesList[0]?.id || ""); 
                setSessionTrainerId(usersList.filter(u=>u.role==="trainer")[0]?.id || ""); 
                setSessionDate(new Date().toLocaleDateString('en-CA')); 
                setSessionStatus("scheduled"); 
                setSessionStartTime("");
                setSessionEndTime("");
                setSessionScheduleType("single");
                setSessionStartDate(new Date().toLocaleDateString('en-CA'));
                setSessionEndDate(new Date().toLocaleDateString('en-CA'));
                setSessionExcludeWeekends(true);
                setShowSessionModal(true); 
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Session
            </button>
          )}
          {activeTab === "users" && (
            <button
              onClick={() => { setEditingUser(null); setUserName(""); setUserEmail(""); setUserPassword(""); setUserRole("student"); setUserBatchId(batchesList[0]?.id || ""); setShowUserModal(true); }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add User
            </button>
          )}
        </div>

        {/* Dynamic Panels */}
        {loading && <div className="text-center p-12 text-slate-400">Loading registry details...</div>}

        {!loading && (
          <>
            {/* 1. COURSES TAB */}
            {activeTab === "courses" && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Course ID</th>
                      <th className="py-3.5 px-6">Course Name</th>
                      <th className="py-3.5 px-6">Description</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {coursesList.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-6 font-semibold text-slate-500 text-xs">{c.id}</td>
                        <td className="py-3.5 px-6 font-bold text-slate-900">{c.name}</td>
                        <td className="py-3.5 px-6 text-slate-500 text-xs">{c.description || "-"}</td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => { setEditingCourse(c); setCourseName(c.name); setCourseDesc(c.description); setShowCourseModal(true); }}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors mr-1.5"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: "course", id: c.id, name: c.name })}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. BATCHES TAB */}
            {activeTab === "batches" && (
              selectedBatchDetails ? (
                <div className="space-y-6 animate-scale-up">
                  {/* Breadcrumbs and back button */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedBatchDetails(null)}
                      className="w-fit flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Batches
                    </button>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                            {selectedBatchDetails.name}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-sky-50 border-sky-200 text-sky-700 uppercase tracking-wider">
                            {selectedBatchDetails.course_name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          Batch ID: {selectedBatchDetails.id}
                        </p>
                      </div>
                      
                      {selectedBatchDetails.start_date || selectedBatchDetails.end_date ? (
                        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-600 font-semibold shadow-xs">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span>
                            {selectedBatchDetails.start_date ? new Date(selectedBatchDetails.start_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "Start"} - {selectedBatchDetails.end_date ? new Date(selectedBatchDetails.end_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "End"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/50 px-3 py-1 rounded-lg text-xs text-slate-405">
                          <Calendar className="w-4 h-4" />
                          <span>No Schedule Assigned</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {batchDetailsError && (
                    <div className="p-4 bg-red-50 border border-red-205 rounded-xl text-sm text-red-600 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {batchDetailsError}
                      </div>
                      <button onClick={() => setBatchDetailsError("")} className="text-xs font-bold hover:text-red-800">✕</button>
                    </div>
                  )}

                  {/* Summary Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sky-600">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Students</span>
                        <span className="text-lg font-black text-slate-900">{batchStudents.length}</span>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Linked Course</span>
                        <span className="text-sm font-bold text-slate-800 truncate block max-w-full" title={selectedBatchDetails.course_name}>
                          {selectedBatchDetails.course_name}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-600">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Batch Timeline</span>
                        <span className="text-xs font-semibold text-slate-600 block">
                          {selectedBatchDetails.start_date || selectedBatchDetails.end_date ? "Active Scheduled" : "Flexible/TBD"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Columns Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left 2/3 - Students List */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Students Registry</h4>
                          <p className="text-[10px] text-slate-400 font-medium">Manage student associations for this batch.</p>
                        </div>
                        
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Search className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="text"
                            placeholder="Filter list..."
                            value={studentsSearchQuery}
                            onChange={e => setStudentsSearchQuery(e.target.value)}
                            className="pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500 w-full sm:w-56 transition-all"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                              <th className="py-3 px-5">Student</th>
                              <th className="py-3 px-5">Email Address</th>
                              <th className="py-3 px-5">Mobile Number</th>
                              <th className="py-3 px-5">Date Joined</th>
                              <th className="py-3 px-5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {batchStudents.filter(student => {
                              if (!studentsSearchQuery) return true;
                              const q = studentsSearchQuery.toLowerCase();
                              return (
                                student.name.toLowerCase().includes(q) ||
                                student.email.toLowerCase().includes(q)
                              );
                            }).length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-12 px-6 text-center text-slate-400 font-medium bg-white">
                                  {studentsSearchQuery ? "No students matching filter query." : "No students currently assigned to this batch."}
                                </td>
                              </tr>
                            ) : (
                              batchStudents
                                .filter(student => {
                                  if (!studentsSearchQuery) return true;
                                  const q = studentsSearchQuery.toLowerCase();
                                  return (
                                    student.name.toLowerCase().includes(q) ||
                                    student.email.toLowerCase().includes(q)
                                  );
                                })
                                .map(student => (
                                  <tr key={student.id} className="hover:bg-slate-50/30">
                                    <td className="py-3 px-5 font-bold text-slate-950 flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-[10px] text-sky-600 font-extrabold shrink-0">
                                        {student.name ? student.name[0].toUpperCase() : "?"}
                                      </div>
                                      <span>{student.name}</span>
                                    </td>
                                    <td className="py-3 px-5 text-slate-500 font-medium">{student.email}</td>
                                    <td className="py-3 px-5 text-slate-500">
                                      {student.mobile_number ? (
                                        <span className="flex items-center gap-1">
                                          <Phone className="w-3 h-3 text-slate-400" />
                                          {student.mobile_number}
                                        </span>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                    <td className="py-3 px-5 text-slate-400 font-mono text-[10px]">
                                      {formatJoinedDate(student.created_at)}
                                    </td>
                                    <td className="py-3 px-5 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveStudentFromDetails(student.id)}
                                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold border border-red-200/50 rounded-lg transition-all"
                                        title="Remove Student from Batch"
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right 1/3 - Actions Panel */}
                    <div className="space-y-6">
                      {/* Assign Existing student panel */}
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Assign Existing Student</h4>
                          <p className="text-[10px] text-slate-400 font-medium">Link a student who is already registered in the system.</p>
                        </div>
                        
                        <div className="space-y-2">
                          <select
                            value={studentToAssignId}
                            onChange={e => setStudentToAssignId(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-905 text-xs focus:outline-none focus:border-sky-500"
                          >
                            <option value="">-- Select student --</option>
                            {allStudents
                              .filter(u => u.role === "student" && !batchStudents.some(s => s.id === u.id))
                              .map(u => (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({u.email})
                                </option>
                              ))}
                          </select>
                          
                          <button
                            type="button"
                            onClick={() => handleAssignExistingStudent(studentToAssignId)}
                            disabled={!studentToAssignId}
                            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                          >
                            Assign to Batch
                          </button>
                        </div>
                      </div>

                      {/* Register New student panel */}
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <UserPlus className="w-4 h-4 text-slate-500" />
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quick Register Student</h4>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">Create a new student profile and auto-assign them.</p>
                        </div>

                        {regStudentError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="flex-1 leading-tight">{regStudentError}</span>
                          </div>
                        )}

                        {regStudentSuccess && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-600 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            <span className="flex-1 leading-tight">{regStudentSuccess}</span>
                          </div>
                        )}

                        <form onSubmit={handleRegisterAndAssignStudent} className="space-y-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                            <input
                              type="text"
                              required
                              value={regStudentName}
                              onChange={e => setRegStudentName(e.target.value)}
                              placeholder="John Doe"
                              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                            <input
                              type="email"
                              required
                              value={regStudentEmail}
                              onChange={e => setRegStudentEmail(e.target.value)}
                              placeholder="john@example.com"
                              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                            <input
                              type="password"
                              required
                              value={regStudentPassword}
                              onChange={e => setRegStudentPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mobile Number (Optional)</label>
                            <input
                              type="tel"
                              value={regStudentMobile}
                              onChange={e => setRegStudentMobile(e.target.value)}
                              placeholder="e.g. 9876543210"
                              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isRegisteringStudent}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
                          >
                            {isRegisteringStudent ? (
                              <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              "Register & Assign"
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3.5 px-6">Batch ID</th>
                        <th className="py-3.5 px-6">Batch Name</th>
                        <th className="py-3.5 px-6">Course Name</th>
                        <th className="py-3.5 px-6">Timeline</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {batchesList.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-6">
                            <button
                              type="button"
                              onClick={() => handleOpenBatchDetails(b)}
                              className="text-slate-500 text-xs font-mono hover:text-sky-600 hover:underline transition-colors text-left"
                            >
                              {b.id}
                            </button>
                          </td>
                          <td className="py-3.5 px-6">
                            <button
                              type="button"
                              onClick={() => handleOpenBatchDetails(b)}
                              className="font-bold text-slate-900 hover:text-sky-600 hover:underline transition-colors text-left"
                            >
                              {b.name}
                            </button>
                          </td>
                          <td className="py-3.5 px-6 text-slate-500 font-medium">{b.course_name}</td>
                          <td className="py-3.5 px-6 text-slate-500 text-xs">
                            {b.start_date || b.end_date ? (
                              <span className="font-semibold text-slate-600 bg-slate-50 border border-slate-200/50 px-2 py-1 rounded-lg">
                                {b.start_date ? new Date(b.start_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "Start"} - {b.end_date ? new Date(b.end_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "End"}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Not Scheduled</span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenBatchDetails(b)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors mr-1.5"
                              title="Manage Students"
                            >
                              <Users className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { 
                                setEditingBatch(b); 
                                setBatchName(b.name); 
                                setBatchId(b.id);
                                setBatchStartDate(b.start_date || "");
                                setBatchEndDate(b.end_date || "");
                                setBatchCourseId(b.course_id); 
                                setShowBatchModal(true); 
                              }}
                              className="p-1.5 text-sky-600 hover:bg-sky-555/5 hover:bg-sky-50 rounded-lg transition-colors mr-1.5"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: "batch", id: b.id, name: b.name })}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* 3. SESSIONS TAB */}
            {activeTab === "sessions" && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Batch</th>
                      <th className="py-3.5 px-6">Trainer</th>
                      <th className="py-3.5 px-6">Scheduled Date</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Start Time</th>
                      <th className="py-3.5 px-6">End Time</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sessionsList.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-4 px-6 font-bold text-slate-900">{s.batch_name}</td>
                        <td className="py-4 px-6 text-slate-700 font-medium">{s.trainer_name}</td>
                        <td className="py-4 px-6 text-slate-500 font-semibold">{s.session_date}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            s.status === "scheduled"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : s.status === "active"
                                ? "bg-sky-50 border-sky-200 text-sky-705"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-400 text-xs">
                          {s.start_time ? new Date(s.start_time).toLocaleTimeString() : "-"}
                        </td>
                        <td className="py-4 px-6 text-slate-400 text-xs">
                          {s.end_time ? new Date(s.end_time).toLocaleTimeString() : "-"}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          {s.status !== "completed" && (
                            <button
                              onClick={() => showQR(s)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors mr-1.5"
                              title="Show Session QR Payload"
                            >
                              <QrCode className="w-4.5 h-4.5" />
                            </button>
                          )}
                          <button
                            onClick={() => { 
                              setEditingSession(s); 
                              setSessionBatchId(s.batch_id); 
                              setSessionTrainerId(s.trainer_id); 
                              setSessionDate(s.session_date); 
                              setSessionStatus(s.status); 
                              setSessionStartTime(extractTimeFromIso(s.start_time));
                              setSessionEndTime(extractTimeFromIso(s.end_time));
                              setSessionScheduleType("single");
                              setShowSessionModal(true); 
                            }}
                            className="p-1.5 text-sky-600 hover:bg-sky-500/5 hover:bg-sky-50 rounded-lg transition-colors mr-1.5"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: "session", id: s.id, name: `${s.batch_name} - ${s.session_date}` })}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. USERS TAB */}
            {activeTab === "users" && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold">Filters</span>
                  <select
                    value={userRoleFilter}
                    onChange={e => setUserRoleFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-sky-500"
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admins</option>
                    <option value="clerk">Clerks</option>
                    <option value="trainer">Trainers</option>
                    <option value="student">Students</option>
                  </select>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Name</th>
                      <th className="py-3.5 px-6">Email</th>
                      <th className="py-3.5 px-6">Role</th>
                      <th className="py-3.5 px-6">Assigned Batch</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-6 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-6.5 h-6.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-sky-600 font-bold shrink-0">
                            {u.name ? u.name[0].toUpperCase() : "?"}
                          </div>
                          {u.name}
                        </td>
                        <td className="py-3.5 px-6 text-slate-500">{u.email}</td>
                        <td className="py-3.5 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            u.role === "admin" 
                              ? "bg-red-50 border-red-200 text-red-750" 
                              : u.role === "clerk"
                                ? "bg-indigo-50 border-indigo-200 text-indigo-755"
                                : u.role === "trainer" 
                                  ? "bg-amber-50 border-amber-200 text-amber-750" 
                                  : "bg-sky-50 border-sky-200 text-sky-750"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 text-xs">
                          {u.batches && u.batches.length > 0 ? (
                            u.batches.map(b => (
                              <span key={b.id} className="inline-block bg-slate-100 border border-slate-200 px-2 py-0.5 rounded mr-1">
                                {b.name}
                              </span>
                            ))
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => { setEditingUser(u); setUserName(u.name); setUserEmail(u.email); setUserRole(u.role); setUserBatchId(u.batches && u.batches.length > 0 ? u.batches[0].id : ""); setShowUserModal(true); }}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors mr-1.5"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            disabled={user?.id === u.id}
                            onClick={() => setDeleteTarget({ type: "user", id: u.id, name: u.name })}
                            className={`p-1.5 rounded-lg transition-colors ${user?.id === u.id ? "text-slate-300 cursor-not-allowed" : "text-red-600 hover:bg-red-50"}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. AUDIT LOGS TAB */}
            {activeTab === "audit" && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">User Name</th>
                      <th className="py-3.5 px-6">System Role</th>
                      <th className="py-3.5 px-6">Scan Workflow Step</th>
                      <th className="py-3.5 px-6">Lecture Batch</th>
                      <th className="py-3.5 px-6">Lecture Date</th>
                      <th className="py-3.5 px-6">Logs Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {auditList.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-4 px-6 font-bold text-slate-900">{log.user_name}</td>
                        <td className="py-4 px-6 text-slate-500 text-xs capitalize">{log.user_role}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            log.scan_type === "start"
                              ? "bg-sky-50 border-sky-200 text-sky-700"
                              : log.scan_type === "trainer"
                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                : log.scan_type === "student"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-705"
                                  : "bg-red-50 border-red-200 text-red-700"
                          }`}>
                            {log.scan_type === "start" ? "Clerk Start" : log.scan_type === "end" ? "Clerk End" : log.scan_type}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500">{log.batch_name}</td>
                        <td className="py-4 px-6 text-slate-500 font-medium">{log.session_date}</td>
                        <td className="py-4 px-6 text-slate-400 text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. REPORTS TAB */}
            {activeTab === "reports" && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search student/trainer..."
                        value={reportSearchQuery}
                        onChange={e => setReportSearchQuery(e.target.value)}
                        className="pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-sky-500 w-44"
                      />
                    </div>
                    <select
                      value={reportBatchFilter}
                      onChange={e => setReportBatchFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-sky-500"
                    >
                      <option value="">All Batches</option>
                      {batchesList.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={exportCSV}
                    disabled={filteredReports.length === 0}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-30"
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3.5 px-6">Student</th>
                        <th className="py-3.5 px-6">Email</th>
                        <th className="py-3.5 px-6">Batch</th>
                        <th className="py-3.5 px-6">Trainer</th>
                        <th className="py-3.5 px-6">Session Date</th>
                        <th className="py-3.5 px-6">Check-In Time</th>
                        <th className="py-3.5 px-6">Check-Out Time</th>
                        <th className="py-3.5 px-6 text-right">Summary Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredReports.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="py-4 px-6 font-bold text-slate-900">{r.studentName}</td>
                          <td className="py-4 px-6 text-slate-500">{r.studentEmail}</td>
                          <td className="py-4 px-6 text-slate-500 font-semibold">{r.batchName}</td>
                          <td className="py-4 px-6 text-slate-500">{r.trainerName}</td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{r.sessionDate}</td>
                          <td className="py-4 px-6 text-slate-455 text-xs">
                            {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : "-"}
                          </td>
                          <td className="py-4 px-6 text-slate-455 text-xs">
                            {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "-"}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              r.status === "present"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-red-50 border-red-200 text-red-700"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* --- Modals Overlay --- */}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editingCourse ? "Edit Course" : "Add Course"}</h3>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveCourse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Course Name</label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                  placeholder="e.g. DevOps & Cloud Technologies"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={courseDesc}
                  onChange={e => setCourseDesc(e.target.value)}
                  placeholder="Course summary details..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500 h-24 resize-none"
                />
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 text-slate-500 bg-white border border-slate-200 rounded-xl text-xs hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs hover:bg-sky-500 shadow-sm">Save Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editingBatch ? "Edit Batch" : "Add Batch"}</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveBatch} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Batch ID</label>
                <input
                  type="text"
                  disabled={!!editingBatch}
                  value={batchId}
                  onChange={e => setBatchId(e.target.value)}
                  placeholder={editingBatch ? "Batch ID cannot be changed" : "e.g. DEVOPS-2026-A (Optional)"}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500 transition-all ${
                    editingBatch 
                      ? "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed" 
                      : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Batch Name</label>
                <input
                  type="text"
                  required
                  value={batchName}
                  onChange={e => setBatchName(e.target.value)}
                  placeholder="e.g. DEVOPS-2026-A"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Link Course</label>
                <select
                  required
                  value={batchCourseId}
                  onChange={e => setBatchCourseId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500 transition-all"
                >
                  {coursesList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                  <input
                    type="date"
                    value={batchStartDate}
                    onChange={e => setBatchStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                  <input
                    type="date"
                    value={batchEndDate}
                    onChange={e => setBatchEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setShowBatchModal(false)} className="px-4 py-2 text-slate-500 bg-white border border-slate-200 rounded-xl text-xs hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs hover:bg-sky-500 shadow-sm transition-all">Save Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Students Modal */}
      {showManageStudentsModal && selectedManageStudentsBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Manage Students</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Batch: {selectedManageStudentsBatch.name}</p>
              </div>
              <button onClick={() => setShowManageStudentsModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSaveBatchStudents} className="p-6 flex flex-col gap-5">
              {manageStudentsError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {manageStudentsError}
                </div>
              )}

              {/* Add Student Row */}
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col gap-3">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Add Student to Batch</label>
                <div className="flex gap-2">
                  <select
                    value={studentToAddId}
                    onChange={e => setStudentToAddId(e.target.value)}
                    className="flex-grow px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Select Student to Add --</option>
                    {usersList
                      .filter(u => u.role === "student" && !assignedStudentsList.some(s => s.id === u.id))
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddStudentToBatch}
                    disabled={!studentToAddId}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Assigned Students list */}
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Assigned Students ({assignedStudentsList.length})
                </label>
                
                <div className="border border-slate-200 rounded-xl max-h-[220px] overflow-y-auto divide-y divide-slate-100 bg-white">
                  {assignedStudentsList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-medium">
                      No students assigned to this batch. Use the section above to add students.
                    </div>
                  ) : (
                    assignedStudentsList.map(student => (
                      <div key={student.id} className="px-4 py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-800">{student.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{student.email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStudentFromBatch(student.id)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold border border-red-200/50 rounded-lg transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowManageStudentsModal(false)}
                  className="px-4 py-2 text-slate-500 bg-white border border-slate-200 rounded-xl text-xs hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-500 shadow-sm transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editingSession ? "Edit Session" : "Add Session"}</h3>
              <button onClick={() => setShowSessionModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveSession} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Class Batch</label>
                <select
                  required
                  value={sessionBatchId}
                  onChange={e => setSessionBatchId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                >
                  {batchesList.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Lecturer Trainer</label>
                <select
                  required
                  value={sessionTrainerId}
                  onChange={e => setSessionTrainerId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                >
                  {usersList.filter(u => u.role === "trainer").map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              {!editingSession && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Schedule Type</label>
                  <select
                    value={sessionScheduleType}
                    onChange={e => setSessionScheduleType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                  >
                    <option value="single">Single Session</option>
                    <option value="recurring">Daily Recurring Sessions</option>
                  </select>
                </div>
              )}

              {sessionScheduleType === "single" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Lecture Date</label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={e => setSessionDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                  />
                </div>
              )}

              {sessionScheduleType === "recurring" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                      <input
                        type="date"
                        required
                        value={sessionStartDate}
                        onChange={e => setSessionStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                      <input
                        type="date"
                        required
                        value={sessionEndDate}
                        onChange={e => setSessionEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="excludeWeekends"
                      checked={sessionExcludeWeekends}
                      onChange={e => setSessionExcludeWeekends(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <label htmlFor="excludeWeekends" className="text-xs font-semibold text-slate-700 select-none">
                      Exclude Weekends (Sat & Sun)
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Start Time</label>
                  <input
                    type="time"
                    value={sessionStartTime}
                    onChange={e => setSessionStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">End Time</label>
                  <input
                    type="time"
                    value={sessionEndTime}
                    onChange={e => setSessionEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {editingSession && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Session Status</label>
                  <select
                    value={sessionStatus}
                    onChange={e => setSessionStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setShowSessionModal(false)} className="px-4 py-2 text-slate-500 bg-white border border-slate-200 rounded-xl text-xs hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs hover:bg-sky-555 shadow-sm">Save Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editingUser ? "Edit User Details" : "Register User"}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="john@cynexai.in"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={userPassword}
                    onChange={e => setUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Portal Role</label>
                <select
                  value={userRole}
                  onChange={e => setUserRole(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                >
                  <option value="student">Student</option>
                  <option value="trainer">Trainer</option>
                  <option value="clerk">Clerk</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {userRole === "student" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assign Batch</label>
                  <select
                    value={userBatchId}
                    onChange={e => setUserBatchId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                  >
                    <option value="">-- No Batch Assigned --</option>
                    {batchesList.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-slate-500 bg-white border border-slate-200 rounded-xl text-xs hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs hover:bg-sky-555 shadow-sm">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Delete {deleteTarget.type}?</h3>
              <p className="text-xs text-slate-500 mb-6">Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteTarget.name}</span>? This action is irreversible.</p>
              <div className="flex items-center justify-end gap-2.5">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-slate-500 bg-white border border-slate-205 rounded-xl text-xs hover:bg-slate-50">Cancel</button>
                <button onClick={handleDelete} className="px-5 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-600 shadow-sm">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Presentation Dialog */}
      {qrSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900">Lecture QR Code</h3>
              <button onClick={() => { setQrSession(null); setQrCodeUrl(""); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold bg-sky-50 border border-sky-200 text-sky-600 px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                {qrSession.batch_name} QR Payload
              </span>
              
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-md">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Attendance Session QR" className="w-56 h-56" />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 animate-pulse">
                    <span className="text-xs text-slate-400">Drawing...</span>
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs font-medium text-slate-500">
                <p>Date: {qrSession.session_date}</p>
                <p className="mt-2 text-[10px] text-slate-400 font-mono select-all truncate max-w-[280px]">
                  Token: {qrSession.qr_token}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

    </div>
  );
}
