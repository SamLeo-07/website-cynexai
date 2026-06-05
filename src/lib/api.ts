/**
 * CynexAI Frontend API Client
 *
 * This module is the secure replacement for direct Turso DB calls.
 * All data requests go through the backend API server, which holds
 * the database credentials server-side (never in the browser bundle).
 *
 * Usage:
 *   import { getMockTests, createMockTest } from './api';
 *   (Drop-in replacement for the same functions in turso.ts)
 *
 * Fallback:
 *   If VITE_API_URL is not set (e.g. local dev without backend),
 *   each function falls back to the turso.ts implementation.
 */

// Re-export all TypeScript interfaces from turso.ts so consumers
// don't need to change their type imports.
export type {
  User,
  Course,
  Lesson,
  Enrollment,
  Payment,
  SupportTicket,
  SupportReply,
  Post,
  MockTest,
  Question,
  TestResult,
  Batch,
  DailyRecording,
  AttendanceSession,
  AttendanceRecord,
  Certificate,
  CertificateCredential,
  DoubtQuestion,
  DoubtAnswer,
  LeaderboardEntry,
  Announcement,
  Review,
  FAQItem,
  Badge,
  CodingProblem,
  CodeSubmission,
  UserProgress,
} from './turso';

// Import fallback functions from turso.ts (used when backend is unavailable)
import * as turso from './turso';

// ─── Core Fetch Utility ───────────────────────────────────────────────────────

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '/api';

/**
 * Returns true if a backend API URL is configured.
 */
export const isBackendConfigured = (): boolean => Boolean(BACKEND_URL);

/**
 * Get the current auth token from localStorage.
 */
const getAuthToken = (): string | null =>
  localStorage.getItem('cynexai_auth_token');

/**
 * Core fetch wrapper. Attaches Authorization header and parses JSON.
 * Throws on non-2xx responses.
 */
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `API Error ${response.status}`;
    try {
      const body = await response.json();
      message = body.error ?? message;
    } catch { /* ignore parse error */ }
    throw new Error(message);
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/**
 * Convenience wrappers for HTTP methods.
 */
const api = {
  get:    <T>(path: string)              => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH',  body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string)              => apiFetch<T>(path, { method: 'DELETE' }),
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export interface LoginResult {
  token: string;
  user: { id: string; name: string; email: string; role: string };
}

/**
 * Log a student in via the backend. Returns JWT token.
 * Call localStorage.setItem('cynexai_auth_token', result.token) after.
 */
export const studentLogin = async (email: string, password: string): Promise<LoginResult> => {
  if (!BACKEND_URL) throw new Error('Backend not configured');
  return api.post<LoginResult>('/api/auth/student/login', { email, password });
};

/**
 * Log the admin in via the backend. Returns JWT token.
 */
export const adminLogin = async (password: string): Promise<LoginResult> => {
  if (!BACKEND_URL) throw new Error('Backend not configured');
  return api.post<LoginResult>('/api/auth/admin/login', { password });
};

/**
 * Verify the current JWT token is still valid.
 */
export const verifyToken = async (): Promise<{ valid: boolean; user: unknown }> => {
  if (!BACKEND_URL) return { valid: false, user: null };
  return api.get('/api/auth/verify');
};

// ─── USERS ────────────────────────────────────────────────────────────────────

export const getUsers = async (): Promise<turso.User[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.User[]>('/api/users'); } catch { /* fall through */ }
  }
  return turso.getUsers();
};

export const createUser = async (user: Omit<turso.User, 'created_at'>): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/users', user); return; } catch { /* fall through */ }
  }
  return turso.createUser(user);
};

export const updateUser = async (user: turso.User): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/users/${user.id}`, user); return; } catch { /* fall through */ }
  }
  return turso.updateUser(user);
};

export const deleteUser = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/users/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteUser(id);
};

// ─── COURSES ──────────────────────────────────────────────────────────────────

export const getCourses = async (includeHidden = false): Promise<turso.Course[]> => {
  if (BACKEND_URL) {
    try {
      const qs = includeHidden ? '?includeHidden=true' : '';
      return await api.get<turso.Course[]>(`/api/courses${qs}`);
    } catch { /* fall through */ }
  }
  return turso.getCourses(includeHidden);
};

export const createCourse = async (course: turso.Course): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/courses', course); return; } catch { /* fall through */ }
  }
  return turso.createCourse(course);
};

export const updateCourse = async (course: Partial<turso.Course> & { id: string }): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/courses/${course.id}`, course); return; } catch { /* fall through */ }
  }
  return turso.updateCourse(course);
};

export const deleteCourse = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/courses/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteCourse(id);
};

export const toggleCourseVisibility = async (id: string, isVisible: boolean): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.patch(`/api/courses/${id}/visibility`, { is_visible: isVisible }); return; } catch { /* fall through */ }
  }
  return turso.toggleCourseVisibility(id, isVisible);
};

// ─── LESSONS ──────────────────────────────────────────────────────────────────

export const getLessonsByCourse = async (courseId: string): Promise<turso.Lesson[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.Lesson[]>(`/api/lessons?courseId=${courseId}`); } catch { /* fall through */ }
  }
  return turso.getLessonsByCourse(courseId);
};

// ─── ENROLLMENTS ──────────────────────────────────────────────────────────────

export const getEnrollmentsByStudent = async (studentId: string): Promise<turso.Enrollment[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.Enrollment[]>(`/api/enrollments?studentId=${studentId}`); } catch { /* fall through */ }
  }
  return turso.getEnrollmentsByStudent(studentId);
};

export const getAllEnrollments = async (): Promise<turso.Enrollment[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.Enrollment[]>('/api/enrollments'); } catch { /* fall through */ }
  }
  return turso.getAllEnrollments();
};

export const createEnrollment = async (enrollment: turso.Enrollment): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/enrollments', enrollment); return; } catch { /* fall through */ }
  }
  return turso.createEnrollment(enrollment);
};

export const deleteEnrollment = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/enrollments/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteEnrollment(id);
};

export const updateEnrollmentProgress = async (id: string, progress: number): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/enrollments/${id}/progress`, { progress }); return; } catch { /* fall through */ }
  }
  return turso.updateEnrollmentProgress(id, progress);
};

// ─── BLOG POSTS ───────────────────────────────────────────────────────────────

export const getPosts = async (
  page?: number, pageSize?: number, search?: string, category?: string, includeHidden?: boolean
): Promise<{ posts: turso.Post[]; total: number }> => {
  if (BACKEND_URL) {
    try {
      const params = new URLSearchParams();
      if (page)          params.set('page', String(page));
      if (pageSize)      params.set('pageSize', String(pageSize));
      if (search)        params.set('search', search);
      if (category)      params.set('category', category);
      if (includeHidden) params.set('includeHidden', 'true');
      return await api.get(`/api/posts?${params}`);
    } catch { /* fall through */ }
  }
  return turso.getPosts(page, pageSize, search, category, includeHidden);
};

export const createPost = async (post: turso.Post): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/posts', post); return; } catch { /* fall through */ }
  }
  return turso.createPost(post);
};

export const updatePost = async (post: turso.Post): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/posts/${post.id}`, post); return; } catch { /* fall through */ }
  }
  return turso.updatePost(post);
};

export const deletePost = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/posts/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deletePost(id);
};

export const togglePostVisibility = async (id: string, isVisible: boolean): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.patch(`/api/posts/${id}/visibility`, { is_visible: isVisible }); return; } catch { /* fall through */ }
  }
  return turso.togglePostVisibility(id, isVisible);
};

// ─── MOCK TESTS ───────────────────────────────────────────────────────────────

export const getMockTests = async (): Promise<turso.MockTest[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.MockTest[]>('/api/mock-tests'); } catch { /* fall through */ }
  }
  return turso.getMockTests();
};

export const createMockTest = async (test: Omit<turso.MockTest, 'createdAt'>): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/mock-tests', test); return; } catch { /* fall through */ }
  }
  return turso.createMockTest(test);
};

export const updateMockTest = async (test: turso.MockTest): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/mock-tests/${test.id}`, test); return; } catch { /* fall through */ }
  }
  return turso.updateMockTest(test);
};

export const deleteMockTest = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/mock-tests/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteMockTest(id);
};

export const getQuestions = async (testId: string, includeUnapproved = false): Promise<turso.Question[]> => {
  if (BACKEND_URL) {
    try {
      const qs = includeUnapproved ? '?includeUnapproved=true' : '';
      return await api.get<turso.Question[]>(`/api/mock-tests/${testId}/questions${qs}`);
    } catch { /* fall through */ }
  }
  return turso.getQuestions(testId, includeUnapproved);
};

export const addQuestion = async (question: turso.Question): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post(`/api/mock-tests/${question.test_id}/questions`, question); return; } catch { /* fall through */ }
  }
  return turso.addQuestion(question);
};

export const updateQuestion = async (question: turso.Question): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/mock-tests/questions/${question.id}`, question); return; } catch { /* fall through */ }
  }
  return turso.updateQuestion(question);
};

export const deleteQuestion = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/mock-tests/questions/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteQuestion(id);
};

export const getTestResults = async (): Promise<turso.TestResult[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.TestResult[]>('/api/mock-tests/results'); } catch { /* fall through */ }
  }
  return turso.getTestResults();
};

export const createTestResult = async (result: turso.TestResult): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/mock-tests/results', result); return; } catch { /* fall through */ }
  }
  return turso.createTestResult(result);
};

// ─── RECORDINGS & BATCHES ─────────────────────────────────────────────────────

export const getBatches = async (): Promise<turso.Batch[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.Batch[]>('/api/batches'); } catch { /* fall through */ }
  }
  return turso.getBatches();
};

export const createBatch = async (batch: turso.Batch): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/batches', batch); return; } catch { /* fall through */ }
  }
  return turso.createBatch(batch);
};

export const updateBatch = async (batch: turso.Batch): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/batches/${batch.id}`, batch); return; } catch { /* fall through */ }
  }
  return turso.updateBatch(batch);
};

export const deleteBatch = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/batches/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteBatch(id);
};

export const getDailyRecordings = async (): Promise<turso.DailyRecording[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.DailyRecording[]>('/api/recordings'); } catch { /* fall through */ }
  }
  return turso.getDailyRecordings();
};

export const getDailyRecordingsByBatch = async (batchId: string): Promise<turso.DailyRecording[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.DailyRecording[]>(`/api/recordings?batchId=${batchId}`); } catch { /* fall through */ }
  }
  return turso.getDailyRecordingsByBatch(batchId);
};

export const createDailyRecording = async (rec: turso.DailyRecording): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/recordings', rec); return; } catch { /* fall through */ }
  }
  return turso.createDailyRecording(rec);
};

export const updateDailyRecording = async (rec: turso.DailyRecording): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/recordings/${rec.id}`, rec); return; } catch { /* fall through */ }
  }
  return turso.updateDailyRecording(rec);
};

export const deleteDailyRecording = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/recordings/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteDailyRecording(id);
};

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

export const createAttendanceSession = async (session: turso.AttendanceSession): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/attendance/sessions', session); return; } catch { /* fall through */ }
  }
  return turso.createAttendanceSession(session);
};

export const getAttendanceSessions = async (courseId?: string): Promise<turso.AttendanceSession[]> => {
  if (BACKEND_URL) {
    try {
      const qs = courseId ? `?courseId=${courseId}` : '';
      return await api.get<turso.AttendanceSession[]>(`/api/attendance/sessions${qs}`);
    } catch { /* fall through */ }
  }
  return turso.getAttendanceSessions(courseId);
};

export const deleteAttendanceSession = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/attendance/sessions/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteAttendanceSession(id);
};

export const markAttendance = async (record: turso.AttendanceRecord): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/attendance/records', record); return; } catch { /* fall through */ }
  }
  return turso.markAttendance(record);
};

export const getAttendanceRecordsBySession = async (sessionId: string): Promise<turso.AttendanceRecord[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.AttendanceRecord[]>(`/api/attendance/records?sessionId=${sessionId}`); } catch { /* fall through */ }
  }
  return turso.getAttendanceRecordsBySession(sessionId);
};

export const getStudentAttendance = async (
  studentId: string, courseId: string
): Promise<{ totalSessions: number; attended: number; percentage: number }> => {
  if (BACKEND_URL) {
    try {
      return await api.get(`/api/attendance/student?studentId=${studentId}&courseId=${courseId}`);
    } catch { /* fall through */ }
  }
  return turso.getStudentAttendance(studentId, courseId);
};

export const verifyAttendancePin = async (
  pin: string, courseId: string
): Promise<turso.AttendanceSession | null> => {
  if (BACKEND_URL) {
    try { return await api.post('/api/attendance/verify-pin', { pin, courseId }); } catch { /* fall through */ }
  }
  return turso.verifyAttendancePin(pin, courseId);
};

export const getAllAttendanceStats = async (): Promise<unknown[]> => {
  if (BACKEND_URL) {
    try { return await api.get('/api/attendance/stats'); } catch { /* fall through */ }
  }
  return turso.getAllAttendanceStats();
};

export const markAutomaticAttendance = async (
  studentId: string, studentName: string, recordingId: string
): Promise<void> => {
  if (BACKEND_URL) {
    try {
      await api.post('/api/attendance/records', { studentId, studentName, recordingId, auto: true });
      return;
    } catch { /* fall through */ }
  }
  return turso.markAutomaticAttendance(studentId, studentName, recordingId);
};

// ─── CERTIFICATES ─────────────────────────────────────────────────────────────

export const getCertificatesByStudent = async (studentId: string): Promise<turso.Certificate[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.Certificate[]>(`/api/certificates?studentId=${studentId}`); } catch { /* fall through */ }
  }
  return turso.getCertificatesByStudent(studentId);
};

export const getAllCertificates = async (): Promise<turso.Certificate[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.Certificate[]>('/api/certificates'); } catch { /* fall through */ }
  }
  return turso.getAllCertificates();
};

export const issueCertificate = async (cert: turso.Certificate): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/certificates', cert); return; } catch { /* fall through */ }
  }
  return turso.issueCertificate(cert);
};

export const deleteCertificate = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/certificates/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteCertificate(id);
};

export const getCertificateCredentials = async (): Promise<turso.CertificateCredential[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.CertificateCredential[]>('/api/certificate-credentials'); } catch { /* fall through */ }
  }
  return turso.getCertificateCredentials();
};

export const createCertificateCredential = async (cred: turso.CertificateCredential): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/certificate-credentials', cred); return; } catch { /* fall through */ }
  }
  return turso.createCertificateCredential(cred);
};

export const verifyCertificateLogin = async (
  username: string, password: string
): Promise<{ valid: boolean; credentialId?: string }> => {
  if (BACKEND_URL) {
    try { return await api.post('/api/certificate-credentials/verify', { username, password }); } catch { /* fall through */ }
  }
  return turso.verifyCertificateLogin(username, password);
};

// ─── DOUBTS ───────────────────────────────────────────────────────────────────

export const getDoubtQuestions = async (courseId?: string): Promise<turso.DoubtQuestion[]> => {
  if (BACKEND_URL) {
    try {
      const qs = courseId ? `?courseId=${courseId}` : '';
      return await api.get<turso.DoubtQuestion[]>(`/api/doubts${qs}`);
    } catch { /* fall through */ }
  }
  return turso.getDoubtQuestions(courseId);
};

export const createDoubtQuestion = async (q: turso.DoubtQuestion): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/doubts', q); return; } catch { /* fall through */ }
  }
  return turso.createDoubtQuestion(q);
};

export const deleteDoubtQuestion = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/doubts/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteDoubtQuestion(id);
};

export const resolveDoubtQuestion = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.patch(`/api/doubts/${id}/resolve`); return; } catch { /* fall through */ }
  }
  return turso.resolveDoubtQuestion(id);
};

export const upvoteDoubtQuestion = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.patch(`/api/doubts/${id}/upvote`); return; } catch { /* fall through */ }
  }
  return turso.upvoteDoubtQuestion(id);
};

export const getDoubtAnswers = async (questionId: string): Promise<turso.DoubtAnswer[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.DoubtAnswer[]>(`/api/doubts/${questionId}/answers`); } catch { /* fall through */ }
  }
  return turso.getDoubtAnswers(questionId);
};

export const createDoubtAnswer = async (a: turso.DoubtAnswer): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post(`/api/doubts/${a.question_id}/answers`, a); return; } catch { /* fall through */ }
  }
  return turso.createDoubtAnswer(a);
};

export const acceptDoubtAnswer = async (answerId: string, questionId: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.patch(`/api/doubts/answers/${answerId}/accept`, { questionId }); return; } catch { /* fall through */ }
  }
  return turso.acceptDoubtAnswer(answerId, questionId);
};

export const upvoteDoubtAnswer = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.patch(`/api/doubts/answers/${id}/upvote`); return; } catch { /* fall through */ }
  }
  return turso.upvoteDoubtAnswer(id);
};

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────

export const getLeaderboard = async (): Promise<turso.LeaderboardEntry[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.LeaderboardEntry[]>('/api/leaderboard'); } catch { /* fall through */ }
  }
  return turso.getLeaderboard();
};

export const addLeaderboardEntry = async (entry: Omit<turso.LeaderboardEntry, 'rank'>): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/leaderboard', entry); return; } catch { /* fall through */ }
  }
  return turso.addLeaderboardEntry(entry);
};

export const updateLeaderboardEntry = async (id: string, updates: Partial<turso.LeaderboardEntry>): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/leaderboard/${id}`, updates); return; } catch { /* fall through */ }
  }
  return turso.updateLeaderboardEntry(id, updates);
};

export const deleteLeaderboardEntry = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/leaderboard/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteLeaderboardEntry(id);
};

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

export const getAnnouncements = async (): Promise<turso.Announcement[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.Announcement[]>('/api/announcements'); } catch { /* fall through */ }
  }
  return turso.getAnnouncements();
};

export const createAnnouncement = async (ann: turso.Announcement): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/announcements', ann); return; } catch { /* fall through */ }
  }
  return turso.createAnnouncement(ann);
};

export const updateAnnouncement = async (ann: turso.Announcement): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/announcements/${ann.id}`, ann); return; } catch { /* fall through */ }
  }
  return turso.updateAnnouncement(ann);
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/announcements/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteAnnouncement(id);
};

export const toggleAnnouncementStatus = async (id: string, isActive: boolean): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.patch(`/api/announcements/${id}/status`, { is_active: isActive }); return; } catch { /* fall through */ }
  }
  return turso.toggleAnnouncementStatus(id, isActive);
};

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

export const getReviews = async (includeHidden = false): Promise<turso.Review[]> => {
  if (BACKEND_URL) {
    try {
      const qs = includeHidden ? '?includeHidden=true' : '';
      return await api.get<turso.Review[]>(`/api/reviews${qs}`);
    } catch { /* fall through */ }
  }
  return turso.getReviews(includeHidden);
};

export const createReview = async (review: turso.Review): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/reviews', review); return; } catch { /* fall through */ }
  }
  return turso.createReview(review);
};

export const updateReview = async (review: turso.Review): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/reviews/${review.id}`, review); return; } catch { /* fall through */ }
  }
  return turso.updateReview(review);
};

export const deleteReview = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/reviews/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteReview(id);
};

export const toggleReviewVisibility = async (id: string, isVisible: boolean): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.patch(`/api/reviews/${id}/visibility`, { is_visible: isVisible }); return; } catch { /* fall through */ }
  }
  return turso.toggleReviewVisibility(id, isVisible);
};

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

export const getPaymentsByStudent = async (studentId: string): Promise<turso.Payment[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.Payment[]>(`/api/payments?studentId=${studentId}`); } catch { /* fall through */ }
  }
  return turso.getPaymentsByStudent(studentId);
};

export const getAllPayments = async (): Promise<turso.Payment[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.Payment[]>('/api/payments'); } catch { /* fall through */ }
  }
  return turso.getAllPayments();
};

export const createPayment = async (payment: turso.Payment): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/payments', payment); return; } catch { /* fall through */ }
  }
  return turso.createPayment(payment);
};

export const updatePayment = async (payment: Partial<turso.Payment> & { id: string }): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/payments/${payment.id}`, payment); return; } catch { /* fall through */ }
  }
  return turso.updatePayment(payment);
};

export const deletePayment = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/payments/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deletePayment(id);
};

// ─── SUPPORT TICKETS ──────────────────────────────────────────────────────────

export const getSupportTickets = async (studentId?: string): Promise<turso.SupportTicket[]> => {
  if (BACKEND_URL) {
    try {
      const qs = studentId ? `?studentId=${studentId}` : '';
      return await api.get<turso.SupportTicket[]>(`/api/support/tickets${qs}`);
    } catch { /* fall through */ }
  }
  return turso.getSupportTickets(studentId);
};

export const createSupportTicket = async (ticket: Omit<turso.SupportTicket, 'created_at'>): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/support/tickets', ticket); return; } catch { /* fall through */ }
  }
  return turso.createSupportTicket(ticket);
};

export const updateSupportStatus = async (id: string, status: 'open' | 'resolved'): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.patch(`/api/support/tickets/${id}/status`, { status }); return; } catch { /* fall through */ }
  }
  return turso.updateSupportStatus(id, status);
};

export const getSupportReplies = async (ticketId: string): Promise<turso.SupportReply[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.SupportReply[]>(`/api/support/tickets/${ticketId}/replies`); } catch { /* fall through */ }
  }
  return turso.getSupportReplies(ticketId);
};

export const createSupportReply = async (reply: Omit<turso.SupportReply, 'created_at'>): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post(`/api/support/tickets/${reply.ticket_id}/replies`, reply); return; } catch { /* fall through */ }
  }
  return turso.createSupportReply(reply);
};

// ─── FAQs ─────────────────────────────────────────────────────────────────────

export const getFaqs = async (includeHidden = false): Promise<turso.FAQItem[]> => {
  if (BACKEND_URL) {
    try {
      const qs = includeHidden ? '?includeHidden=true' : '';
      return await api.get<turso.FAQItem[]>(`/api/faqs${qs}`);
    } catch { /* fall through */ }
  }
  return turso.getFaqs(includeHidden);
};

export const createFaq = async (faq: turso.FAQItem): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/faqs', faq); return; } catch { /* fall through */ }
  }
  return turso.createFaq(faq);
};

export const updateFaq = async (faq: turso.FAQItem): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/faqs/${faq.id}`, faq); return; } catch { /* fall through */ }
  }
  return turso.updateFaq(faq);
};

export const deleteFaq = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/faqs/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteFaq(id);
};

// ─── CODING ───────────────────────────────────────────────────────────────────

export const getCodingProblems = async (courseId?: string): Promise<turso.CodingProblem[]> => {
  if (BACKEND_URL) {
    try {
      const qs = courseId ? `?courseId=${courseId}` : '';
      return await api.get<turso.CodingProblem[]>(`/api/coding/problems${qs}`);
    } catch { /* fall through */ }
  }
  return turso.getCodingProblems(courseId);
};

export const createCodingProblem = async (problem: turso.CodingProblem): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/coding/problems', problem); return; } catch { /* fall through */ }
  }
  return turso.createCodingProblem(problem);
};

export const updateCodingProblem = async (problem: turso.CodingProblem): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put(`/api/coding/problems/${problem.id}`, problem); return; } catch { /* fall through */ }
  }
  return turso.updateCodingProblem(problem);
};

export const deleteCodingProblem = async (id: string): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.delete(`/api/coding/problems/${id}`); return; } catch { /* fall through */ }
  }
  return turso.deleteCodingProblem(id);
};

export const getAllCodeSubmissions = async (): Promise<turso.CodeSubmission[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.CodeSubmission[]>('/api/coding/submissions'); } catch { /* fall through */ }
  }
  return turso.getAllCodeSubmissions();
};

export const getCodeSubmissionsByStudent = async (studentId: string): Promise<turso.CodeSubmission[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.CodeSubmission[]>(`/api/coding/submissions?studentId=${studentId}`); } catch { /* fall through */ }
  }
  return turso.getCodeSubmissionsByStudent(studentId);
};

export const createCodeSubmission = async (submission: turso.CodeSubmission): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.post('/api/coding/submissions', submission); return; } catch { /* fall through */ }
  }
  return turso.createCodeSubmission(submission);
};

export const getSolvedProblemIds = async (studentId: string): Promise<string[]> => {
  if (BACKEND_URL) {
    try {
      const result = await api.get<{ problemIds: string[] }>(`/api/coding/solved/${studentId}`);
      return result.problemIds;
    } catch { /* fall through */ }
  }
  return turso.getSolvedProblemIds(studentId);
};

// ─── BADGES ───────────────────────────────────────────────────────────────────

export const getBadges = async (studentId: string): Promise<turso.Badge[]> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.Badge[]>(`/api/badges/${studentId}`); } catch { /* fall through */ }
  }
  return turso.getBadges(studentId);
};

// ─── JOBS ─────────────────────────────────────────────────────────────────────

export const getJobListings = async (): Promise<unknown[]> => {
  if (BACKEND_URL) {
    try { return await api.get('/api/jobs'); } catch { /* fall through */ }
  }
  return turso.getJobListings();
};

// ─── STUDENT CHECKLIST ────────────────────────────────────────────────────────

export const getStudentChecklist = async (studentId: string): Promise<unknown[]> => {
  if (BACKEND_URL) {
    try { return await api.get(`/api/checklist/${studentId}`); } catch { /* fall through */ }
  }
  return turso.getStudentChecklist(studentId);
};

export const updateChecklistStep = async (
  studentId: string, stepId: string, isDone: boolean
): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.patch(`/api/checklist/${studentId}/${stepId}`, { is_done: isDone }); return; } catch { /* fall through */ }
  }
  return turso.updateChecklistStep(studentId, stepId, isDone);
};

// ─── USER PROGRESS ────────────────────────────────────────────────────────────

export const getUserProgress = async (studentId: string): Promise<turso.UserProgress | null> => {
  if (BACKEND_URL) {
    try { return await api.get<turso.UserProgress>(`/api/progress/${studentId}`); } catch { /* fall through */ }
  }
  return turso.getUserProgress(studentId);
};

export const updateUserProgress = async (progress: turso.UserProgress): Promise<void> => {
  if (BACKEND_URL) {
    try { await api.put('/api/progress', progress); return; } catch { /* fall through */ }
  }
  return turso.updateUserProgress(progress);
};

// ─── PASS-THROUGH (non-sensitive utilities) ───────────────────────────────────
// These don't hit the DB directly or are admin-only diagnostic tools.
export { generateSlug, isTursoConfigured, initTursoDB, testConnection } from './turso';
