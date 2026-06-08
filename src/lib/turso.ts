/// <reference types="vite/client" />
import { createClient } from '@libsql/client';
import { codingQuestionBank, mockTestBank, mockTestQuestionsBank } from './questionBank';
import { advancedAiPosts } from '../data/aiPosts';

// Turso Database Configuration
const url = import.meta.env.VITE_TURSO_DATABASE_URL;
const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

// Diagnostic Logging — only in development
if (import.meta.env.DEV) {
  console.log("Deepmind: Turso Configuration Init", {
    urlExists: !!url,
    tokenExists: !!authToken,
  });
}

// Cache Invalidator for Local Storage - Ensure new videos are loaded
if (typeof window !== 'undefined') {
  const CURRENT_CACHE_VERSION = 'v6';
  const storedVersion = localStorage.getItem('cynexai_cache_version');
  
  if (storedVersion !== CURRENT_CACHE_VERSION) {
    console.warn(`Deepmind: Upgrading cache from ${storedVersion} to ${CURRENT_CACHE_VERSION}. Clearing old local data.`);
    localStorage.removeItem('cynexai_local_lessons');
    localStorage.removeItem('cynexai_courses_data');
    localStorage.removeItem('cynexai_local_mock_tests');
    localStorage.removeItem('cynexai_local_questions');
    localStorage.removeItem('cynexai_local_recordings');
    localStorage.removeItem('cynexai_project_submissions');
    localStorage.removeItem('cynexai_local_notifications');
    localStorage.setItem('cynexai_cache_version', CURRENT_CACHE_VERSION);
  }
}

// Initialize the Turso client only if credentials are provided
export const isTursoConfigured = Boolean(
  url &&
  url.trim() !== '' &&
  url !== 'your_database_url' &&
  authToken &&
  authToken.trim() !== '' &&
  authToken !== 'your_auth_token'
);

if (import.meta.env.DEV) {
  if (isTursoConfigured) {
    console.log("Deepmind: Turso Cloud is ACTIVE");
  } else {
    console.warn("Deepmind: Turso Cloud is NOT configured. Using LocalStorage fallback.");
  }
}

export const rawClient = isTursoConfigured
  ? createClient({ url: url!, authToken: authToken! })
  : null;

// Circuit Breaker: If connection fails, stop trying to use Turso for this session
let dbConnectionFailed = false;

// Wrapped client proxy with 3-second timeout and circuit breaker
export const client = rawClient ? {
  ...rawClient,
  execute: async (sqlOrConfig: any, timeoutMs = 3000): Promise<any> => {
    if (dbConnectionFailed) {
      throw new Error("Turso circuit breaker is active");
    }
    let timeoutId: any;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        console.warn(`Deepmind: Turso query timed out after ${timeoutMs}ms. Activating circuit breaker.`);
        dbConnectionFailed = true;
        reject(new Error(`Database query timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([
        rawClient.execute(sqlOrConfig),
        timeoutPromise
      ]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && (
        error.message.includes('timeout') ||
        error.message.includes('fetch') ||
        error.message.includes('connect') ||
        error.message.includes('auth')
      )) {
        console.error("Deepmind: Activating Turso circuit breaker due to database failure:", error);
        dbConnectionFailed = true;
      }
      throw error;
    }
  }
} as any : null;
let isInitializing = false;
let isInitialized = false;


export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  phone?: string;
  role: 'student' | 'admin';
  created_at?: string;
  batch_id?: string;
  photo_url?: string;
}

export interface Batch {
  id: string;
  name: string;
  course_id: string;
  created_at?: string;
}

export interface DailyRecording {
  id: string;
  batch_id: string;
  subject: string;
  title: string;
  description?: string;
  video_url: string;
  duration?: string;
  recording_date: string;
  chapters?: string;
  created_at?: string;
}


export interface Post {
  id: string;
  title: string;
  content: string;
  image: string;
  video?: string;
  category: string;
  isVisible: boolean;
  date: string;
}

export interface CourseDay {
  dayNumber: number;
  date?: string;
  concept: string;
  material: string;
  assignment: string;
}

export interface CourseCurriculum {
  days: CourseDay[];
  weeklyTests: string[];
  tips: string[];
  tools: string[];
  subConcepts: string[];
}

export interface Course {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  image: string;
  duration: string;
  placement?: string;
  students: string;
  rating: number;
  level: string;
  skills: string;       // JSON string: string[]
  modules?: string;     // JSON string: string[]
  outcomes?: string;    // JSON string: string[]
  prerequisites?: string; // JSON string: string[]
  career?: string;      // JSON string: string[]
  curriculum?: string;  // JSON string: CourseCurriculum
  isVisible: boolean;
}

export interface Review {
  id: string;
  name: string;
  role: string;
  course: string;
  rating: number;
  text: string;
  image: string;
  isVisible: boolean;
  created_at?: string;
}


// --- USER OPERATIONS ---

const USERS_LOCAL_KEY = 'cynexai_local_users';
const ENROLLMENTS_LOCAL_KEY = 'cynexai_local_enrollments';

export const getUsers = async (): Promise<User[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute("SELECT * FROM users ORDER BY created_at DESC");
      return result.rows as unknown as User[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch users", e);
    }
  }
  try {
    const local = localStorage.getItem(USERS_LOCAL_KEY);
    const users: User[] = local ? JSON.parse(local) : [];
    if (users.length === 0) {
      // Seed default demo student
      const demoStudent: User = {
        id: 'demo-student-id',
        name: 'Demo Student',
        email: 'student@cynexai.com',
        role: 'student',
        batch_id: 'batch_demo'
      };
      users.push(demoStudent);
      localStorage.setItem(USERS_LOCAL_KEY, JSON.stringify(users));
      
      // Also seed a default batch for this student if batches is empty
      const localBatches = localStorage.getItem('cynexai_local_batches');
      const bList = localBatches ? JSON.parse(localBatches) : [];
      if (bList.length === 0) {
        bList.push({
          id: 'batch_demo',
          name: 'Data Science - Section A',
          course_id: 'data-science-machine-learning',
          created_at: new Date().toISOString()
        });
        localStorage.setItem('cynexai_local_batches', JSON.stringify(bList));
      }
    }
    return users;
  } catch {
    return [];
  }
};

export const createUser = async (user: Omit<User, 'created_at'>) => {
  const newUser = { ...user, created_at: new Date().toISOString() };
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO users (id, name, email, password_hash, phone, role, created_at, batch_id, photo_url)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [newUser.id, newUser.name, newUser.email, newUser.password_hash || '', newUser.phone || '', newUser.role || 'student', newUser.created_at, newUser.batch_id || null, newUser.photo_url || null]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create user in Turso, falling back", e);
    }
  }
  const users = await getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index !== -1) {
    users[index] = { ...users[index], ...newUser };
  } else {
    users.push(newUser as User);
  }
  localStorage.setItem(USERS_LOCAL_KEY, JSON.stringify(users));
};

export const updateUser = async (user: User) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `UPDATE users SET name = ?, email = ?, phone = ?, role = ?, batch_id = ? WHERE id = ?`,
        args: [user.name, user.email, user.phone || '', user.role || 'student', user.batch_id || null, user.id]
      });
      if (user.password_hash) {
        await client.execute({
          sql: `UPDATE users SET password_hash = ? WHERE id = ?`,
          args: [user.password_hash, user.id]
        });
      }
      return;
    } catch (e) {
      console.error("Deepmind: Failed to update user in Turso, falling back", e);
    }
  }
  const users = await getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index !== -1) {
    users[index] = { ...users[index], ...user };
    localStorage.setItem(USERS_LOCAL_KEY, JSON.stringify(users));
  }
};

export const deleteUser = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "DELETE FROM users WHERE id = ?",
        args: [id]
      });
      await client.execute({ sql: "DELETE FROM enrollments WHERE student_id = ?", args: [id] });
      await client.execute({ sql: "DELETE FROM payments WHERE student_id = ?", args: [id] });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to delete user in Turso, falling back", e);
    }
  }
  let users = await getUsers();
  users = users.filter(u => u.id !== id);
  localStorage.setItem(USERS_LOCAL_KEY, JSON.stringify(users));

  let enrollments = await getAllEnrollments();
  enrollments = enrollments.filter(e => e.student_id !== id);
  localStorage.setItem(ENROLLMENTS_LOCAL_KEY, JSON.stringify(enrollments));
};

// --- ENROLLMENTS & LMS OPERATIONS ---

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  progress_percentage: number;
  status: 'active' | 'completed' | 'suspended';
}

export const getEnrollmentsByStudent = async (studentId: string): Promise<Enrollment[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM enrollments WHERE student_id = ?",
        args: [studentId]
      });
      return result.rows as unknown as Enrollment[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch enrollments", e);
    }
  }
  try {
    const local = localStorage.getItem(ENROLLMENTS_LOCAL_KEY);
    const enrollments: Enrollment[] = local ? JSON.parse(local) : [];
    if (enrollments.length === 0 && studentId === 'demo-student-id') {
      const demoEnrollment: Enrollment = {
        id: 'enr_demo',
        student_id: 'demo-student-id',
        course_id: 'data-science-machine-learning',
        progress_percentage: 45,
        status: 'active'
      };
      enrollments.push(demoEnrollment);
      localStorage.setItem(ENROLLMENTS_LOCAL_KEY, JSON.stringify(enrollments));
    }
    return enrollments.filter(e => e.student_id === studentId);
  } catch {
    return [];
  }
};

export const getAllEnrollments = async (): Promise<Enrollment[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute("SELECT * FROM enrollments");
      return result.rows as unknown as Enrollment[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch all enrollments", e);
    }
  }
  try {
    const local = localStorage.getItem(ENROLLMENTS_LOCAL_KEY);
    const enrollments: Enrollment[] = local ? JSON.parse(local) : [];
    if (enrollments.length === 0) {
      const demoEnrollment: Enrollment = {
        id: 'enr_demo',
        student_id: 'demo-student-id',
        course_id: 'data-science-machine-learning',
        progress_percentage: 45,
        status: 'active'
      };
      enrollments.push(demoEnrollment);
      localStorage.setItem(ENROLLMENTS_LOCAL_KEY, JSON.stringify(enrollments));
    }
    return enrollments;
  } catch {
    return [];
  }
};

export const deleteEnrollment = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "DELETE FROM enrollments WHERE id = ?",
        args: [id]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to delete enrollment in Turso, falling back", e);
    }
  }
  let enrollments = await getAllEnrollments();
  enrollments = enrollments.filter(e => e.id !== id);
  localStorage.setItem(ENROLLMENTS_LOCAL_KEY, JSON.stringify(enrollments));
};

export const createEnrollment = async (enrollment: Enrollment) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO enrollments (id, student_id, course_id, progress_percentage, status)
              VALUES (?, ?, ?, ?, ?)`,
        args: [enrollment.id, enrollment.student_id, enrollment.course_id, enrollment.progress_percentage || 0, enrollment.status || 'active']
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create enrollment in Turso, falling back", e);
    }
  }
  const enrollments = await getAllEnrollments();
  const index = enrollments.findIndex(e => e.id === enrollment.id);
  if (index !== -1) {
    enrollments[index] = { ...enrollments[index], ...enrollment };
  } else {
    enrollments.push(enrollment);
  }
  localStorage.setItem(ENROLLMENTS_LOCAL_KEY, JSON.stringify(enrollments));
};

export interface Lesson {
  id: string;
  course_id: string;
  module_name: string;
  lesson_title: string;
  video_url: string;
  order_index: number;
  module_id?: string;
  description?: string;
  duration?: number;
  prerequisite_lesson_id?: string;
  is_published?: number; // 0 or 1
  created_at?: string;
  updated_at?: string;
}

export interface LessonResource {
  id: string;
  lesson_id: string;
  resource_type: 'slides' | 'github' | 'pdf' | 'zip' | 'figma' | 'notion' | 'sandbox' | 'external_link';
  title: string;
  resource_url: string;
  created_at?: string;
}

export interface LessonAttendanceSession {
  id: string;
  lesson_id: string;
  batch_id?: string;
  attendance_pin: string;
  is_active: number; // 0 or 1
  started_at: string;
  ended_at?: string;
  created_by?: string;
}

export interface StudentAttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  check_in_time: string;
  status: string; // 'present', etc.
}

export interface StudentLessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  watch_percentage: number;
  quiz_score: number;
  completed: number; // 0 or 1
  last_watched_timestamp: number;
  updated_at?: string;
}

export interface AnalyticsEvent {
  id: string;
  student_id: string;
  event_type: string;
  lesson_id?: string;
  metadata?: string;
  created_at?: string;
}

export interface StudentNote {
  id: string;
  student_id: string;
  lesson_id: string;
  timestamp: number;
  note_text: string;
  created_at: string;
}

export interface AILessonContent {
  id: string;
  lesson_id: string;
  summary: string;
  chapters: string; // JSON string of chapters
  created_at: string;
}

export const getLessonsByCourse = async (courseId: string): Promise<Lesson[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC",
        args: [courseId]
      });
      return result.rows as unknown as Lesson[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch lessons", e);
    }
  }
  // Fallback: use localStorage cache (same data source as getAllLessons)
  try {
    const LESSON_CACHE_VERSION = 'v4';
    const storedVersion = localStorage.getItem('cynexai_lesson_cache_version');
    // Bust cache if version mismatch (e.g. seed data was updated)
    if (storedVersion !== LESSON_CACHE_VERSION) {
      localStorage.removeItem('cynexai_local_lessons');
      localStorage.setItem('cynexai_lesson_cache_version', LESSON_CACHE_VERSION);
    }
    const local = localStorage.getItem('cynexai_local_lessons');
    if (local) {
      const all: Lesson[] = JSON.parse(local);
      return all.filter(l => l.course_id === courseId).sort((a, b) => a.order_index - b.order_index);
    }
    // If no cache, trigger getAllLessons which will seed and cache
    const all = await getAllLessons();
    return all.filter(l => l.course_id === courseId).sort((a, b) => a.order_index - b.order_index);
  } catch {
    return [];
  }
};


export interface OnboardingStep {
  student_id: string;
  step_id: string;
  is_done: boolean;
}

export const getStudentChecklist = async (studentId: string): Promise<OnboardingStep[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM onboarding_steps WHERE student_id = ?",
        args: [studentId]
      });
      return result.rows.map((row: any) => ({
        ...row,
        is_done: row.is_done === 1
      })) as unknown as OnboardingStep[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch checklist", e);
    }
  }
  return [];
};

export const updateChecklistStep = async (studentId: string, stepId: string, isDone: boolean) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "INSERT OR REPLACE INTO onboarding_steps (student_id, step_id, is_done) VALUES (?, ?, ?)",
        args: [studentId, stepId, isDone ? 1 : 0]
      });
    } catch (e) {
      console.error("Deepmind: Failed to update checklist", e);
      throw e;
    }
  }
};

export const updateEnrollmentProgress = async (id: string, progress: number) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "UPDATE enrollments SET progress_percentage = ? WHERE id = ?",
        args: [progress, id]
      });
    } catch (e) {
      console.error("Deepmind: Failed to update progress", e);
      throw e;
    }
  }
};

export interface Payment {
  id: string;
  student_id: string;
  total_amount: number;
  amount_paid: number;
  due_date: string;
  status: 'pending' | 'paid';
  isVisible?: boolean;
}

export const getPaymentsByStudent = async (studentId: string): Promise<Payment[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM payments WHERE student_id = ? AND (isVisible = 1 OR isVisible IS NULL)",
        args: [studentId]
      });
      return result.rows.map((row: any) => ({
        ...row,
        isVisible: (row as any).isVisible === undefined ? true : (row as any).isVisible === 1
      })) as unknown as Payment[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch payments", e);
    }
  }
  const allPayments = await getAllPayments();
  return allPayments.filter(p => p.student_id === studentId && p.isVisible !== false);
};

export const getAllPayments = async (): Promise<Payment[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute("SELECT * FROM payments");
      return result.rows.map((row: any) => ({
        ...row,
        isVisible: (row as any).isVisible === 1 || (row as any).isVisible === undefined || (row as any).isVisible === null
      })) as unknown as Payment[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch all payments", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_payments');
    if (local) {
      const parsed = JSON.parse(local) as Payment[];
      return parsed.map(p => ({
        ...p,
        isVisible: p.isVisible !== false
      }));
    }
    // Seed default payments
    const samplePayments: Payment[] = [
      {
        id: 'pay_ref_demo_1',
        student_id: 'demo-student-id',
        total_amount: 49999,
        amount_paid: 15000,
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        isVisible: true
      },
      {
        id: 'pay_ref_demo_2',
        student_id: 'demo-student-id',
        total_amount: 49999,
        amount_paid: 34999,
        due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'paid',
        isVisible: true
      }
    ];
    localStorage.setItem('cynexai_local_payments', JSON.stringify(samplePayments));
    return samplePayments;
  } catch {
    return [];
  }
};

export const createPayment = async (payment: Payment) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO payments (id, student_id, total_amount, amount_paid, due_date, status, isVisible)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          payment.id,
          payment.student_id,
          payment.total_amount,
          payment.amount_paid,
          payment.due_date,
          payment.status,
          payment.isVisible !== false ? 1 : 0
        ]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create payment", e);
      throw e;
    }
  }
  try {
    const all = await getAllPayments();
    const index = all.findIndex(p => p.id === payment.id);
    if (index !== -1) {
      all[index] = payment;
    } else {
      all.push(payment);
    }
    localStorage.setItem('cynexai_local_payments', JSON.stringify(all));
  } catch (e) {
    console.error("Deepmind: Failed to save payment to localStorage", e);
  }
};

export const updatePayment = async (payment: Partial<Payment> & { id: string }) => {
  if (isTursoConfigured && client) {
    try {
      const sets: string[] = [];
      const args: (string | number | boolean | null)[] = [];

      Object.entries(payment).forEach(([key, value]) => {
        if (key !== 'id') {
          sets.push(`${key} = ?`);
          args.push(key === 'isVisible' ? (value ? 1 : 0) : value as string | number | null);
        }
      });

      args.push(payment.id);
      await client.execute({
        sql: `UPDATE payments SET ${sets.join(', ')} WHERE id = ?`,
        args
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to update payment in Turso:", e);
      throw e;
    }
  }
  try {
    const all = await getAllPayments();
    const index = all.findIndex(p => p.id === payment.id);
    if (index !== -1) {
      all[index] = { ...all[index], ...payment };
      localStorage.setItem('cynexai_local_payments', JSON.stringify(all));
    }
  } catch (e) {
    console.error("Deepmind: Failed to update payment in localStorage", e);
  }
};

export const deletePayment = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "DELETE FROM payments WHERE id = ?",
        args: [id]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to delete payment in Turso:", e);
      throw e;
    }
  }
  try {
    const all = await getAllPayments();
    const filtered = all.filter(p => p.id !== id);
    localStorage.setItem('cynexai_local_payments', JSON.stringify(filtered));
  } catch (e) {
    console.error("Deepmind: Failed to delete payment in localStorage", e);
  }
};

export const togglePaymentVisibility = async (id: string, isVisible: boolean) => {
  return updatePayment({ id, isVisible });
};

export interface SupportTicket {
  id: string;
  student_id: string;
  category: string;
  description: string;
  status: 'open' | 'resolved';
  created_at: string;
}

export const getSupportTickets = async (studentId?: string): Promise<SupportTicket[]> => {
  if (isTursoConfigured && client) {
    try {
      const sql = studentId ? "SELECT * FROM support_tickets WHERE student_id = ? ORDER BY created_at DESC" : "SELECT * FROM support_tickets ORDER BY created_at DESC";
      const args = studentId ? [studentId] : [];
      const result = await client.execute({ sql, args });
      return result.rows as unknown as SupportTicket[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch tickets", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_support_tickets');
    if (local) {
      const tickets = JSON.parse(local) as SupportTicket[];
      const sorted = tickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return studentId ? sorted.filter(t => t.student_id === studentId) : sorted;
    }
    // Seed default tickets
    const sampleTickets: SupportTicket[] = [
      {
        id: 'ticket_demo_1',
        student_id: 'demo-student-id',
        category: 'Course Content',
        description: 'Unable to access the deep learning module videos. They show a permission error.',
        status: 'open',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'ticket_demo_2',
        student_id: 'demo-student-id',
        category: 'Payments',
        description: 'My UPI transaction went through but the portal status shows pending.',
        status: 'resolved',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    localStorage.setItem('cynexai_local_support_tickets', JSON.stringify(sampleTickets));
    return studentId ? sampleTickets.filter(t => t.student_id === studentId) : sampleTickets;
  } catch {
    return [];
  }
};

export const createSupportTicket = async (ticket: Omit<SupportTicket, 'created_at'>) => {
  const newTicket = { ...ticket, created_at: new Date().toISOString() };
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO support_tickets (id, student_id, category, description, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [newTicket.id, newTicket.student_id, newTicket.category, newTicket.description, newTicket.status || 'open', newTicket.created_at]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create ticket", e);
      throw e;
    }
  }
  try {
    const all = await getSupportTickets();
    all.push(newTicket);
    localStorage.setItem('cynexai_local_support_tickets', JSON.stringify(all));
  } catch (e) {
    console.error("Deepmind: Failed to save ticket to localStorage", e);
  }
};

export const updateSupportStatus = async (id: string, status: 'open' | 'resolved') => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "UPDATE support_tickets SET status = ? WHERE id = ?",
        args: [status, id]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to update ticket status", e);
      throw e;
    }
  }
  try {
    const all = await getSupportTickets();
    const index = all.findIndex(t => t.id === id);
    if (index !== -1) {
      all[index].status = status;
      localStorage.setItem('cynexai_local_support_tickets', JSON.stringify(all));
    }
  } catch (e) {
    console.error("Deepmind: Failed to update ticket status in localStorage", e);
  }
};

export interface SupportReply {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'student' | 'admin';
  message: string;
  created_at: string;
}

export const getSupportReplies = async (ticketId: string): Promise<SupportReply[]> => {
  if (isTursoConfigured && client) {
    try {
      const sql = "SELECT * FROM support_replies WHERE ticket_id = ? ORDER BY created_at ASC";
      const result = await client.execute({ sql, args: [ticketId] });
      return result.rows as unknown as SupportReply[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch support replies", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_support_replies');
    if (local) {
      const replies = JSON.parse(local) as SupportReply[];
      return replies.filter(r => r.ticket_id === ticketId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    // Seed default replies for ticket_demo_2 (resolved ticket)
    const sampleReplies: SupportReply[] = [
      {
        id: 'reply_demo_1',
        ticket_id: 'ticket_demo_2',
        sender_id: 'demo-student-id',
        sender_name: 'Demo Student',
        sender_role: 'student',
        message: 'My UPI transaction went through but the portal status shows pending.',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 1000).toISOString()
      },
      {
        id: 'reply_demo_2',
        ticket_id: 'ticket_demo_2',
        sender_id: 'admin',
        sender_name: 'CynexAI Support',
        sender_role: 'admin',
        message: 'Hi! We have verified your transaction ref and updated your billing portal. Let us know if you face any issues.',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 60000).toISOString()
      }
    ];
    localStorage.setItem('cynexai_local_support_replies', JSON.stringify(sampleReplies));
    return sampleReplies.filter(r => r.ticket_id === ticketId);
  } catch {
    return [];
  }
};

export const createSupportReply = async (reply: Omit<SupportReply, 'created_at'>) => {
  const newReply = { ...reply, created_at: new Date().toISOString() };
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT INTO support_replies (id, ticket_id, sender_id, sender_name, sender_role, message, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [newReply.id, newReply.ticket_id, newReply.sender_id, newReply.sender_name, newReply.sender_role, newReply.message, newReply.created_at]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create support reply", e);
      throw e;
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_support_replies');
    const all = local ? JSON.parse(local) as SupportReply[] : [];
    all.push(newReply);
    localStorage.setItem('cynexai_local_support_replies', JSON.stringify(all));
  } catch (e) {
    console.error("Deepmind: Failed to save reply to localStorage", e);
  }
};



export interface Webinar {
  id: string;
  title: string;
  instructor: string;
  date: string;
  time: string;
  duration: string;
  participants: number;
  maxParticipants: number;
  description: string;
  status: 'upcoming' | 'live' | 'past';
}

export interface Application {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
}

export interface TestOutcome {
  id: string;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
}

export interface Question {
  id: string;
  testId: string;
  text: string;
  options?: string[]; // Optional for coding questions
  correctAnswer?: number; // Optional for coding questions (index)
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'mcq' | 'coding' | 'short-answer' | 'true-false';
  sampleInput?: string;
  sampleOutput?: string;
  explanation?: string;
  isApproved: boolean; // For admin review layer
  aiMetadata?: {
    clarityScore: number;
    similarityScore: number;
    tags: string[];
  };
  testCases?: string; // JSON string for coding test cases
  boilerplate?: string; // JSON string for language-specific boilerplate
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  correctAnswerText?: string; // For short answer type
}

export interface AiSettings {
  id: string;
  isAiGenerationEnabled: boolean;
  maxDailyQuestions: number;
  currentDailyCount: number;
  lastResetDate: string;
}

export interface StudentPerformance {
  userId: string;
  category: string;
  strength: number; // 0 to 1
  weakTopics: string[];
  lastResult: number;
}

export interface MockTest {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  category: string;
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  course_id?: string;
  batch_id?: string;
  language?: string;
}

export interface UserProgress {
  userId: string;
  studentName: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  solvedProblems: string[]; // Array of question IDs
  lastUpdated: string;
  currentStreak: number;
  longestStreak: number;
  xpPoints: number;
}

export interface LeaderboardEntry {
  id: string;
  studentName: string;
  avatar: string;
  problemsSolved: number;
  points: number;
  rank: number;
  badges: number;
}

export interface Project {
  id: string;
  course_id: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
}

export interface ProjectSubmission {
  id: string;
  project_id: string;
  student_id: string;
  studentName?: string;
  custom_title?: string;
  custom_description?: string;
  submission_url?: string;
  submission_file?: string;
  status: 'pending' | 'approved' | 'needs_work';
  score?: number;
  feedback?: string;
  submitted_at: string;
}

export interface Notification {
  id: string;
  student_id: string;
  title: string;
  message: string;
  type: string; // 'success' | 'warning' | 'info' | 'error'
  is_read: number; // 0 or 1
  created_at: string;
}

export interface Badge {
  id: string;
  student_id: string;
  title: string;
  icon: string;
  color: string;
  description?: string;
  unlocked_at: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  type: 'full-time' | 'part-time' | 'internship';
  category: string;
  created_at: string;
}

export interface MentorshipSession {
  id: string;
  student_id: string;
  mentor_name: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  meeting_link?: string;
}

export interface Discussion {
  id: string;
  course_id: string;
  student_id: string;
  student_name: string;
  message: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  target_audience: 'all' | 'course';
  course_id?: string;
  created_by: string;
  created_at: string;
  isActive: boolean;
}

const STORAGE_KEY = 'cynexai_blog_posts';


export const getAllPostsLocal = (): Post[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Seed default posts
    const samplePosts: Post[] = [
      {
        id: "welcome-to-cynexai",
        title: "Welcome to CynexAI Blog",
        content: "We are thrilled to welcome you to the CynexAI official learning portal and blog! Here, we share insights on Artificial Intelligence, Machine Learning, DevOps, Java enterprise development, and the future of tech. Stay tuned for expert articles, tutorials, and success stories.",
        category: "News",
        isVisible: true,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800"
      },
      ...advancedAiPosts.map(post => ({
        ...post,
        id: generateSlug(post.title),
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      }))
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(samplePosts));
    return samplePosts;
  } catch (error) {
    console.error("Failed to parse blog posts from localStorage:", error);
    return [];
  }
};

export const savePostsLocal = (posts: Post[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    console.error("Failed to save blog posts to localStorage:", error);
  }
};

const safelyParseJSON = (json: string | null, fallback: unknown = []) => {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return fallback;
  }
};


const seedLocalMockTests = () => {
  try {
    const mockTests = [
      {
        id: 'ds_foundation_test',
        title: 'Foundation Assessment',
        description: 'Test your understanding of basic Python, statistical analysis, and machine learning foundation concepts.',
        duration: 45,
        category: 'Beginner',
        totalQuestions: 5,
        isActive: true,
        createdAt: new Date().toISOString(),
        course_id: 'data-science-machine-learning',
        batch_id: 'batch_demo'
      },
      {
        id: 'ds_midterm_test',
        title: 'Mid-term Technical Evaluation',
        description: 'Intermediate evaluation covering supervised learning algorithms, pandas data structures, and feature engineering.',
        duration: 90,
        category: 'Intermediate',
        totalQuestions: 5,
        isActive: true,
        createdAt: new Date().toISOString(),
        course_id: 'data-science-machine-learning',
        batch_id: 'batch_demo'
      },
      {
        id: 'ds_certification_test',
        title: 'Final Certification Mock',
        description: 'Advanced assessment evaluating your readiness for placements. Covers deep learning models, natural language processing, and evaluation metrics.',
        duration: 120,
        category: 'Advanced',
        totalQuestions: 5,
        isActive: true,
        createdAt: new Date().toISOString(),
        course_id: 'data-science-machine-learning',
        batch_id: 'batch_demo'
      }
    ];
    
    const mockQuestions = [
      // ds_foundation_test (Foundation Assessment)
      {
        id: 'q_ds_f1',
        testId: 'ds_foundation_test',
        text: 'Which of the following is used to manage packages in Python?',
        options: ['pip', 'npm', 'gradle', 'maven'],
        correctAnswer: 0,
        difficulty: 'easy',
        type: 'mcq',
        explanation: 'pip is the package installer for Python. You can use pip to install packages from the Python Package Index and other indexes.',
        isApproved: true
      },
      {
        id: 'q_ds_f2',
        testId: 'ds_foundation_test',
        text: 'What is the correct way to import pandas under the alias pd?',
        options: ['import pandas as pd', 'import pd from pandas', 'library(pandas) as pd', 'import pandas pd'],
        correctAnswer: 0,
        difficulty: 'easy',
        type: 'mcq',
        explanation: 'The standard alias for pandas is pd: import pandas as pd.',
        isApproved: true
      },
      {
        id: 'q_ds_f3',
        testId: 'ds_foundation_test',
        text: 'Which statistical metric represents the middle value in a sorted data set?',
        options: ['Mean', 'Median', 'Mode', 'Variance'],
        correctAnswer: 1,
        difficulty: 'easy',
        type: 'mcq',
        explanation: 'Median is the middle value when the data set is ordered from least to greatest.',
        isApproved: true
      },
      {
        id: 'q_ds_f4',
        testId: 'ds_foundation_test',
        text: 'In Supervised Machine Learning, what do we need to train the model?',
        options: ['Only input data', 'Only output labels', 'Both input data and corresponding output labels', 'No data at all'],
        correctAnswer: 2,
        difficulty: 'easy',
        type: 'mcq',
        explanation: 'Supervised learning requires labeled training data consisting of both input features and target labels.',
        isApproved: true
      },
      {
        id: 'q_ds_f5',
        testId: 'ds_foundation_test',
        text: 'Which library is primarily used for statistical data visualization in Python?',
        options: ['numpy', 'scikit-learn', 'seaborn', 'tensorflow'],
        correctAnswer: 2,
        difficulty: 'easy',
        type: 'mcq',
        explanation: 'Seaborn is a Python data visualization library based on matplotlib. It provides a high-level interface for drawing attractive and informative statistical graphics.',
        isApproved: true
      },
      
      // ds_midterm_test (Mid-term Technical Evaluation)
      {
        id: 'q_ds_m1',
        testId: 'ds_midterm_test',
        text: 'What does bias-variance tradeoff refer to in machine learning?',
        options: [
          'Finding a balance between underfitting (high bias) and overfitting (high variance)',
          'Speed vs accuracy tradeoff of a model',
          'Storage vs computation tradeoff of a model',
          'Selecting the right number of features'
        ],
        correctAnswer: 0,
        difficulty: 'medium',
        type: 'mcq',
        explanation: 'The bias-variance tradeoff is the property of a model that the variance in the parameter estimates across samples of the same size can be traded off against the bias in the parameter estimates.',
        isApproved: true
      },
      {
        id: 'q_ds_m2',
        testId: 'ds_midterm_test',
        text: 'Which of the following is a classification algorithm?',
        options: ['Linear Regression', 'Logistic Regression', 'K-Means Clustering', 'Principal Component Analysis'],
        correctAnswer: 1,
        difficulty: 'medium',
        type: 'mcq',
        explanation: 'Despite its name, Logistic Regression is a classification algorithm used to predict binary outcomes.',
        isApproved: true
      },
      {
        id: 'q_ds_m3',
        testId: 'ds_midterm_test',
        text: 'What is the purpose of train_test_split from scikit-learn?',
        options: [
          'To split dataset into training set and testing set',
          'To clean missing data',
          'To normalize the feature values',
          'To evaluate model metrics'
        ],
        correctAnswer: 0,
        difficulty: 'easy',
        type: 'mcq',
        explanation: 'train_test_split is used to partition the data into training and validation/testing portions.',
        isApproved: true
      },
      {
        id: 'q_ds_m4',
        testId: 'ds_midterm_test',
        text: 'Which metric is calculated as: True Positives / (True Positives + False Positives)?',
        options: ['Recall', 'Precision', 'F1-Score', 'Accuracy'],
        correctAnswer: 1,
        difficulty: 'medium',
        type: 'mcq',
        explanation: 'Precision is the ratio of correctly predicted positive observations to the total predicted positives.',
        isApproved: true
      },
      {
        id: 'q_ds_m5',
        testId: 'ds_midterm_test',
        text: 'In a Decision Tree, what is the top-most node called?',
        options: ['Leaf Node', 'Branch Node', 'Root Node', 'Child Node'],
        correctAnswer: 2,
        difficulty: 'easy',
        type: 'mcq',
        explanation: 'The starting/top-most node of a decision tree is the Root Node.',
        isApproved: true
      },

      // ds_certification_test (Final Certification Mock)
      {
        id: 'q_ds_c1',
        testId: 'ds_certification_test',
        text: 'What is the vanishing gradient problem in Deep Neural Networks?',
        options: [
          'Gradients become too large, leading to numerical overflow',
          'Gradients become extremely small, preventing weight updates in early layers',
          'Weights are initialized to zero',
          'Activation functions return negative values only'
        ],
        correctAnswer: 1,
        difficulty: 'hard',
        type: 'mcq',
        explanation: 'Vanishing gradient occurs when backpropagated gradients shrink exponentially as they go back, causing early layers to train very slowly.',
        isApproved: true
      },
      {
        id: 'q_ds_c2',
        testId: 'ds_certification_test',
        text: 'Which neural network architecture is best suited for sequence modeling (e.g. text/time series)?',
        options: [
          'Convolutional Neural Network (CNN)',
          'Recurrent Neural Network (RNN)',
          'Feedforward Neural Network',
          'Generative Adversarial Network (GAN)'
        ],
        correctAnswer: 1,
        difficulty: 'medium',
        type: 'mcq',
        explanation: 'RNNs are specifically designed to handle sequential data by maintaining internal memory states.',
        isApproved: true
      },
      {
        id: 'q_ds_c3',
        testId: 'ds_certification_test',
        text: 'In NLP, what is the purpose of TF-IDF representation?',
        options: [
          'To translate text to another language',
          'To evaluate word importance relative to a document and a corpus',
          'To correct spelling errors',
          'To tag parts of speech'
        ],
        correctAnswer: 1,
        difficulty: 'medium',
        type: 'mcq',
        explanation: 'TF-IDF (Term Frequency-Inverse Document Frequency) measures how important a word is to a document in a collection.',
        isApproved: true
      },
      {
        id: 'q_ds_c4',
        testId: 'ds_certification_test',
        text: 'What does the term ROC AUC score represent?',
        options: [
          'The area under the receiver operating characteristic curve, indicating classification quality',
          'The rate of convergence of a model',
          'The accuracy of regression predictions',
          'The clustering separation index'
        ],
        correctAnswer: 0,
        difficulty: 'hard',
        type: 'mcq',
        explanation: 'ROC AUC represents classification performance across all classification thresholds, measuring the model\'s ability to distinguish classes.',
        isApproved: true
      },
      {
        id: 'q_ds_c5',
        testId: 'ds_certification_test',
        text: 'What technique is used to prevent overfitting by randomly setting activation units to 0 during training?',
        options: [
          'Batch Normalization',
          'Gradient Descent',
          'Dropout',
          'L1 Regularization'
        ],
        correctAnswer: 2,
        difficulty: 'medium',
        type: 'mcq',
        explanation: 'Dropout is a regularization technique where randomly selected neurons are ignored during training, reducing co-dependency.',
        isApproved: true
      }
    ];

    localStorage.setItem('cynexai_local_mock_tests', JSON.stringify(mockTests));
    localStorage.setItem('cynexai_local_questions', JSON.stringify(mockQuestions));
    console.log("Deepmind: Seeded local mock tests and questions.");
  } catch (err) {
    console.error("Deepmind: Failed to seed local mock tests:", err);
  }
};

export const getMockTests = async (): Promise<MockTest[]> => {
  if (isTursoConfigured && client) {
    try {
      await initTursoDB();
      const result = await client.execute("SELECT * FROM mock_tests ORDER BY createdAt DESC");
      return result.rows.map((row: any) => ({
        id: row.id as string,
        title: row.title as string,
        description: row.description as string,
        duration: Number(row.duration),
        category: row.category as string,
        totalQuestions: Number(row.totalQuestions),
        isActive: row.isActive === 1,
        createdAt: row.createdAt as string,
        course_id: row.course_id as string || undefined,
        batch_id: row.batch_id as string || undefined,
        language: row.language as string || 'English'
      }));
    } catch (e) {
      console.error("Failed to get mock tests from Turso:", e);
    }
  }

  // LocalStorage Fallback
  try {
    const data = localStorage.getItem('cynexai_local_mock_tests');
    if (!data) {
      seedLocalMockTests();
      const seeded = localStorage.getItem('cynexai_local_mock_tests');
      return seeded ? JSON.parse(seeded) : [];
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to get mock tests from localStorage:", error);
    return [];
  }
};

export const getQuestions = async (testId: string, includeUnapproved: boolean = false): Promise<Question[]> => {
  if (isTursoConfigured && client) {
    try {
      await initTursoDB();
      let sql = "SELECT * FROM questions WHERE testId = ?";
      const args: (string | number)[] = [testId];

      if (!includeUnapproved) {
        sql += " AND isApproved = 1";
      }

      const result = await client.execute({ sql, args });
      return result.rows.map((row: any) => ({
        id: row.id as string,
        testId: row.testId as string,
        text: row.text as string,
        options: row.options ? safelyParseJSON(row.options as string) : undefined,
        correctAnswer: row.correctAnswer !== null ? Number(row.correctAnswer) : undefined,
        difficulty: (row.difficulty as string || 'easy') as 'easy' | 'medium' | 'hard',
        type: (row.type as string || 'mcq') as 'mcq' | 'coding',
        sampleInput: row.sampleInput as string | undefined,
        sampleOutput: row.sampleOutput as string | undefined,
        explanation: row.explanation as string | undefined,
        isApproved: row.isApproved === 1,
        aiMetadata: row.aiMetadata ? safelyParseJSON(row.aiMetadata as string) : undefined,
        testCases: row.testCases as string | undefined,
        boilerplate: row.boilerplate as string | undefined,
        inputFormat: row.inputFormat as string | undefined,
        outputFormat: row.outputFormat as string | undefined,
        constraints: row.constraints as string | undefined
      }));
    } catch (e) {
      console.error("Failed to get questions from Turso:", e);
      return [];
    }
  }

  // LocalStorage Fallback
  try {
    let data = localStorage.getItem('cynexai_local_questions');
    if (!data) {
      seedLocalMockTests();
      data = localStorage.getItem('cynexai_local_questions');
    }
    const allQuestions: Question[] = data ? JSON.parse(data) : [];
    return allQuestions.filter(q => q.testId === testId && (includeUnapproved || q.isApproved));
  } catch (error) {
    console.error("Failed to get questions from localStorage:", error);
    return [];
  }
};

export const createMockTest = async (test: Omit<MockTest, 'createdAt'>) => {
  const newTest = { ...test, createdAt: new Date().toISOString() };
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: "INSERT INTO mock_tests (id, title, description, duration, category, totalQuestions, isActive, createdAt, course_id, batch_id, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          newTest.id,
          newTest.title,
          newTest.description,
          newTest.duration,
          newTest.category,
          newTest.totalQuestions,
          newTest.isActive ? 1 : 0,
          newTest.createdAt,
          newTest.course_id || null,
          newTest.batch_id || null,
          newTest.language || 'English'
        ]
      });
      // Sync it to localStorage for local consistency
      try {
        const data = localStorage.getItem('cynexai_local_mock_tests');
        const list = data ? JSON.parse(data) : [];
        if (!list.some((t: any) => t.id === newTest.id)) {
          list.push(newTest);
          localStorage.setItem('cynexai_local_mock_tests', JSON.stringify(list));
        }
      } catch {}
      return;
    } catch (e) {
      console.error("Failed to create mock test in Turso:", e);
      throw e;
    }
  }
  try {
    const data = localStorage.getItem('cynexai_local_mock_tests');
    const list = data ? JSON.parse(data) : [];
    list.push(newTest);
    localStorage.setItem('cynexai_local_mock_tests', JSON.stringify(list));
  } catch (error) {
    console.error("Failed to save mock test to localStorage:", error);
  }
};

export const updateMockTest = async (test: MockTest) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `UPDATE mock_tests 
              SET title = ?, description = ?, duration = ?, category = ?, totalQuestions = ?, isActive = ?, course_id = ?, batch_id = ?, language = ? 
              WHERE id = ?`,
        args: [
          test.title,
          test.description || null,
          test.duration,
          test.category || null,
          test.totalQuestions,
          test.isActive ? 1 : 0,
          test.course_id || null,
          test.batch_id || null,
          test.language || 'English',
          test.id
        ]
      });
      // Sync to localStorage
      try {
        const data = localStorage.getItem('cynexai_local_mock_tests');
        if (data) {
          const list = JSON.parse(data);
          const index = list.findIndex((t: any) => t.id === test.id);
          if (index !== -1) {
            list[index] = test;
            localStorage.setItem('cynexai_local_mock_tests', JSON.stringify(list));
          }
        }
      } catch {}
      return;
    } catch (e) {
      console.error("Failed to update mock test in Turso:", e);
      throw e;
    }
  }
  try {
    const data = localStorage.getItem('cynexai_local_mock_tests');
    if (data) {
      const list = JSON.parse(data);
      const index = list.findIndex((t: any) => t.id === test.id);
      if (index !== -1) {
        list[index] = test;
        localStorage.setItem('cynexai_local_mock_tests', JSON.stringify(list));
      }
    }
  } catch (error) {
    console.error("Failed to update mock test in localStorage:", error);
  }
};

export const addQuestion = async (question: Question) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT INTO questions (
          id, testId, text, options, correctAnswer, difficulty, type, 
          sampleInput, sampleOutput, explanation, isApproved, aiMetadata, testCases, boilerplate,
          inputFormat, outputFormat, constraints
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          question.id,
          question.testId,
          question.text,
          question.options ? JSON.stringify(question.options) : null,
          question.correctAnswer ?? null,
          question.difficulty,
          question.type,
          question.sampleInput || null,
          question.sampleOutput || null,
          question.explanation || null,
          question.isApproved ? 1 : 0,
          question.aiMetadata ? JSON.stringify(question.aiMetadata) : null,
          question.testCases || null,
          question.boilerplate || null,
          question.inputFormat || null,
          question.outputFormat || null,
          question.constraints || null
        ]
      });
      // Sync to localStorage
      try {
        const data = localStorage.getItem('cynexai_local_questions');
        const list = data ? JSON.parse(data) : [];
        if (!list.some((q: any) => q.id === question.id)) {
          list.push(question);
          localStorage.setItem('cynexai_local_questions', JSON.stringify(list));
        }
      } catch {}
      return;
    } catch (e) {
      console.error("Failed to add question in Turso:", e);
      throw e;
    }
  }

  // LocalStorage Fallback
  try {
    const data = localStorage.getItem('cynexai_local_questions');
    const list = data ? JSON.parse(data) : [];
    list.push(question);
    localStorage.setItem('cynexai_local_questions', JSON.stringify(list));
  } catch (error) {
    console.error("Failed to save question to localStorage:", error);
  }
};

export const deleteQuestion = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "DELETE FROM questions WHERE id = ?",
        args: [id]
      });
    } catch (e) {
      console.error("Failed to delete question in Turso:", e);
    }
  }

  // LocalStorage Fallback
  try {
    const data = localStorage.getItem('cynexai_local_questions');
    if (data) {
      const list = JSON.parse(data);
      const filtered = list.filter((q: any) => q.id !== id);
      localStorage.setItem('cynexai_local_questions', JSON.stringify(filtered));
    }
  } catch (error) {
    console.error("Failed to delete question from localStorage:", error);
  }
};

export const updateQuestion = async (question: Question) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `UPDATE questions SET 
          text = ?, options = ?, correctAnswer = ?, difficulty = ?, type = ?,
          sampleInput = ?, sampleOutput = ?, explanation = ?, isApproved = ?, aiMetadata = ?, testCases = ?, boilerplate = ?,
          inputFormat = ?, outputFormat = ?, constraints = ?
          WHERE id = ?`,
        args: [
          question.text,
          question.options ? JSON.stringify(question.options) : null,
          question.correctAnswer ?? null,
          question.difficulty,
          question.type,
          question.sampleInput || null,
          question.sampleOutput || null,
          question.explanation || null,
          question.isApproved ? 1 : 0,
          question.aiMetadata ? JSON.stringify(question.aiMetadata) : null,
          question.testCases || null,
          question.boilerplate || null,
          question.inputFormat || null,
          question.outputFormat || null,
          question.constraints || null,
          question.id
        ]
      });
      // Sync to localStorage
      try {
        const data = localStorage.getItem('cynexai_local_questions');
        if (data) {
          const list = JSON.parse(data);
          const index = list.findIndex((q: any) => q.id === question.id);
          if (index !== -1) {
            list[index] = question;
            localStorage.setItem('cynexai_local_questions', JSON.stringify(list));
          }
        }
      } catch {}
      return;
    } catch (e) {
      console.error("Failed to update question in Turso:", e);
      throw e;
    }
  }

  // LocalStorage Fallback
  try {
    const data = localStorage.getItem('cynexai_local_questions');
    if (data) {
      const list = JSON.parse(data);
      const index = list.findIndex((q: any) => q.id === question.id);
      if (index !== -1) {
        list[index] = question;
        localStorage.setItem('cynexai_local_questions', JSON.stringify(list));
      }
    }
  } catch (error) {
    console.error("Failed to update question in localStorage:", error);
  }
};


export interface TestResult {
  id: string;
  studentId?: string;
  studentName: string;
  testId: string;
  testTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  date: string;
  warnings?: number;
  timeTaken?: number;
  status?: 'completed' | 'terminated_cheating' | 'timeout';
  proctoringLogs?: string;
  confidenceRatings?: string;
  studentAnswers?: string;
}

const TEST_RESULTS_KEY = 'cynexai_test_results';

export const deleteMockTest = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "DELETE FROM mock_tests WHERE id = ?",
        args: [id]
      });
    } catch (e) {
      console.error("Failed to delete mock test in Turso:", e);
    }
  }

  // LocalStorage Fallback
  try {
    const data = localStorage.getItem('cynexai_local_mock_tests');
    if (data) {
      const list = JSON.parse(data);
      const filtered = list.filter((t: any) => t.id !== id);
      localStorage.setItem('cynexai_local_mock_tests', JSON.stringify(filtered));
    }
    
    // Also delete associated questions
    const qData = localStorage.getItem('cynexai_local_questions');
    if (qData) {
      const qList = JSON.parse(qData);
      const qFiltered = qList.filter((q: any) => q.testId !== id);
      localStorage.setItem('cynexai_local_questions', JSON.stringify(qFiltered));
    }
  } catch (error) {
    console.error("Failed to delete mock test from localStorage:", error);
  }
};

export const createTestResult = async (result: TestResult) => {
  if (isTursoConfigured && client) {
    try {
      await initTursoDB();
      await client.execute({
        sql: `INSERT INTO test_results (
          id, studentName, testId, testTitle, score, totalQuestions, percentage, date, studentId, warnings, timeTaken, status, proctoringLogs, confidenceRatings, studentAnswers
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          result.id,
          result.studentName,
          result.testId,
          result.testTitle,
          result.score,
          result.totalQuestions,
          result.percentage,
          result.date,
          result.studentId || null,
          result.warnings ?? 0,
          result.timeTaken ?? 0,
          result.status || 'completed',
          result.proctoringLogs || null,
          result.confidenceRatings || null,
          result.studentAnswers || null
        ]
      });
      return;
    } catch (e) {
      console.error("Failed to save test result in Turso:", e);
    }
  }
  const results = JSON.parse(localStorage.getItem(TEST_RESULTS_KEY) || '[]');
  results.push(result);
  localStorage.setItem(TEST_RESULTS_KEY, JSON.stringify(results));
};

export const getTestResults = async (): Promise<TestResult[]> => {
  if (isTursoConfigured && client) {
    try {
      await initTursoDB();
      const result = await client.execute("SELECT * FROM test_results ORDER BY date DESC");
      return result.rows.map((row: any) => ({
        id: row.id as string,
        studentName: row.studentName as string,
        testId: row.testId as string,
        testTitle: row.testTitle as string,
        score: Number(row.score),
        totalQuestions: Number(row.totalQuestions),
        percentage: Number(row.percentage),
        date: row.date as string,
        studentId: row.studentId as string || undefined,
        warnings: row.warnings !== null ? Number(row.warnings) : 0,
        timeTaken: row.timeTaken !== null ? Number(row.timeTaken) : 0,
        status: row.status as any || 'completed',
        proctoringLogs: row.proctoringLogs as string || undefined,
        confidenceRatings: row.confidenceRatings as string || undefined,
        studentAnswers: row.studentAnswers as string || undefined
      }));
    } catch (e) {
      console.error("Failed to get test results from Turso:", e);
      return [];
    }
  }
  return JSON.parse(localStorage.getItem(TEST_RESULTS_KEY) || '[]');
};

// --- USER PROGRESS OPERATIONS ---

const LEADERBOARD_KEY = 'cynexai_leaderboard';

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  if (isTursoConfigured && client) {
    // TODO: Implement database query when schema is ready
  }

  const stored = localStorage.getItem(LEADERBOARD_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  // Return realistic mock data if nothing is saved
  const initialData = [
    { id: '1', studentName: 'Alex Johnson', avatar: 'https://i.pravatar.cc/150?u=alex', problemsSolved: 142, points: 15400, rank: 1, badges: 12 },
    { id: '2', studentName: 'Samantha Lee', avatar: 'https://i.pravatar.cc/150?u=sam', problemsSolved: 128, points: 14200, rank: 2, badges: 9 },
    { id: '3', studentName: 'Michael Chen', avatar: 'https://i.pravatar.cc/150?u=mike', problemsSolved: 115, points: 12800, rank: 3, badges: 7 },
    { id: '4', studentName: 'Priya Sharma', avatar: 'https://i.pravatar.cc/150?u=priya', problemsSolved: 95, points: 10500, rank: 4, badges: 6 },
    { id: 'demo-student-id', studentName: 'Demo Student', avatar: 'https://i.pravatar.cc/150?u=demo', problemsSolved: 42, points: 4200, rank: 5, badges: 3 },
  ];
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(initialData));
  return initialData;
};

export const addLeaderboardEntry = async (entry: Omit<LeaderboardEntry, 'rank'>): Promise<void> => {
  const current = await getLeaderboard();
  current.push({ ...entry, rank: 0 }); // Rank will be recalculated
  current.sort((a, b) => b.points - a.points);
  current.forEach((item, index) => { item.rank = index + 1; });
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(current));
};

export const updateLeaderboardEntry = async (id: string, updates: Partial<LeaderboardEntry>): Promise<void> => {
  const current = await getLeaderboard();
  const index = current.findIndex(e => e.id === id);
  if (index !== -1) {
    current[index] = { ...current[index], ...updates };
    current.sort((a, b) => b.points - a.points);
    current.forEach((item, idx) => { item.rank = idx + 1; });
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(current));
  }
};

export const deleteLeaderboardEntry = async (id: string): Promise<void> => {
  const current = await getLeaderboard();
  const filtered = current.filter(e => e.id !== id);
  filtered.sort((a, b) => b.points - a.points);
  filtered.forEach((item, idx) => { item.rank = idx + 1; });
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(filtered));
};

// Universal project templates for any course
const PROJECT_TEMPLATES = [
  {
    titleTemplate: 'Capstone Project 1: {course} Data Analysis',
    description: 'Perform a comprehensive exploratory data analysis on a real-world dataset related to your course. Create visualizations, identify trends, and present your findings in a structured report.',
    daysUntilDue: 7,
    maxScore: 100
  },
  {
    titleTemplate: 'Capstone Project 2: {course} Portfolio Application',
    description: 'Build a fully functional portfolio application demonstrating the key concepts from this course. Include a README, working demo, and a 5-minute video walkthrough of your solution.',
    daysUntilDue: 14,
    maxScore: 150
  },
  {
    titleTemplate: 'Final Capstone: {course} Industry Problem',
    description: 'Solve an industry-relevant problem using the techniques learned in this course. Present a complete solution with documentation, unit tests, and a live deployment link.',
    daysUntilDue: 21,
    maxScore: 200
  }
];

export const getProjects = async (courseId?: string): Promise<Project[]> => {
  if (!courseId) {
    // Return default sample projects
    return [
      {
        id: 'proj_default_1',
        course_id: '',
        title: 'Capstone Project 1: Data Analysis',
        description: 'Perform a comprehensive exploratory data analysis on a real-world dataset. Create visualizations, identify trends, and present your findings.',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxScore: 100
      }
    ];
  }

  // Generate projects dynamically for any course
  return PROJECT_TEMPLATES.map((template, i) => ({
    id: `proj_${courseId}_${i + 1}`,
    course_id: courseId,
    title: template.titleTemplate.replace('{course}', courseId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
    description: template.description,
    dueDate: new Date(Date.now() + template.daysUntilDue * 24 * 60 * 60 * 1000).toISOString(),
    maxScore: template.maxScore
  }));
};

export const getProjectSubmissionsForStudent = async (studentName: string): Promise<ProjectSubmission[]> => {
  const allSubmissions = await getProjectSubmissions();
  return allSubmissions.filter(s => s.studentName === studentName);
};

// ==========================================
// AUTOMATED PROVISIONING
// ==========================================
export const autoProvisionContent = async () => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const allProblems = await getCodingProblems();
    
    // 1. Auto Provision Daily Coding Problem
    const hasProblemToday = allProblems.some(p => p.created_at.startsWith(todayStr));
    
    if (!hasProblemToday) {
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      const questionIndex = dayOfYear % codingQuestionBank.length;
      const questionToAdd = codingQuestionBank[questionIndex];
      
      const newProblem: CodingProblem = {
        ...questionToAdd,
        id: `auto_daily_${todayStr}_${questionToAdd.id}`,
        course_id: 'data-science-machine-learning',
        created_at: new Date().toISOString()
      };
      
      await createCodingProblem(newProblem);
      console.log(`Auto-provisioned daily practice problem: ${newProblem.title}`);
    }

    // 2. Auto Provision Weekly Mock Test
    const currentWeek = Math.floor(new Date().getTime() / (7 * 24 * 60 * 60 * 1000));
    const mockTests = await getMockTests();
    const hasTestThisWeek = mockTests.some(t => t.id === `auto_mock_${currentWeek}`);
    
    if (!hasTestThisWeek) {
      const mockTestTemplate = mockTestBank[0];
      const newMockTest: MockTest = {
        ...mockTestTemplate,
        id: `auto_mock_${currentWeek}`,
        title: `Weekly Automated Mock Test (Week ${currentWeek % 52})`,
        isActive: Boolean(mockTestTemplate.isActive),
        createdAt: new Date().toISOString()
      };
      
      await createMockTest(newMockTest);
      
      for (const mq of mockTestQuestionsBank) {
        await addQuestion({
          ...mq,
          id: `auto_mq_${currentWeek}_${mq.id}`,
          testId: newMockTest.id,
          isApproved: true,
          difficulty: mq.difficulty as 'easy' | 'medium' | 'hard',
          type: mq.type as 'mcq' | 'coding' | 'short-answer' | 'true-false'
        });
      }
      console.log(`Auto-provisioned weekly mock test: ${newMockTest.title}`);
    }

    // 3. Auto-repair broken YouTube URLs in the database and localStorage cache
    const replacements: Record<string, string> = {
      "https://www.youtube.com/embed/ad79nYk2keg": "https://www.youtube.com/embed/2ePf9rue1Ao",
      "https://www.youtube.com/embed/8L11aMN5KY8": "https://www.youtube.com/embed/TpMIssRdhco",
      "https://www.youtube.com/embed/zxQyTK8quyY": "https://www.youtube.com/embed/eMlx5fFNoYc",
      "https://www.youtube.com/embed/dOxUroR57xs": "https://www.youtube.com/embed/jC4v5AS4YSg",
      "https://www.youtube.com/embed/7HNqPIAFgAI": "https://www.youtube.com/embed/aGwYtUzMQUk"
    };

    if (isTursoConfigured && client && !dbConnectionFailed) {
      for (const [oldUrl, newUrl] of Object.entries(replacements)) {
        try {
          await client.execute({
            sql: "UPDATE lessons SET video_url = ? WHERE video_url = ?",
            args: [newUrl, oldUrl]
          });
        } catch (dbErr) {
          console.warn("Could not execute lesson video repair in Turso DB:", dbErr);
        }
      }
    }

    const localLessons = localStorage.getItem('cynexai_local_lessons');
    if (localLessons) {
      try {
        const parsed = JSON.parse(localLessons) as any[];
        let updated = false;
        const newLessons = parsed.map(l => {
          if (replacements[l.video_url]) {
            l.video_url = replacements[l.video_url];
            updated = true;
          }
          return l;
        });
        if (updated) {
          localStorage.setItem('cynexai_local_lessons', JSON.stringify(newLessons));
          console.log("Deepmind: Auto-repaired broken lesson video URLs in localStorage cache");
        }
      } catch (e) {
        console.error("Failed to update local storage lessons", e);
      }
    }
  } catch (error) {
    console.error("Auto provision failed:", error);
  }
};

export const getProjectSubmissions = async (studentId?: string): Promise<ProjectSubmission[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      if (studentId) {
        const res = await client.execute({
          sql: "SELECT * FROM project_submissions WHERE student_id = ? ORDER BY submitted_at DESC",
          args: [studentId]
        });
        return res.rows as unknown as ProjectSubmission[];
      } else {
        const res = await client.execute("SELECT * FROM project_submissions ORDER BY submitted_at DESC");
        return res.rows as unknown as ProjectSubmission[];
      }
    } catch (e) {
      console.error("Deepmind: Failed to fetch project submissions from Turso", e);
    }
  }
  const local = localStorage.getItem('cynexai_project_submissions');
  const items = local ? JSON.parse(local) : [];
  return studentId ? items.filter((s: ProjectSubmission) => s.student_id === studentId) : items;
};

export const getAllProjectSubmissions = async (): Promise<ProjectSubmission[]> => {
  return getProjectSubmissions();
};

export const getPaginatedProjectSubmissions = async (
  page: number = 1,
  limit: number = 10,
  search: string = ''
): Promise<{ submissions: ProjectSubmission[]; total: number }> => {
  const offset = (page - 1) * limit;
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      let query = `SELECT * FROM project_submissions`;
      let countQuery = `SELECT COUNT(*) as count FROM project_submissions`;
      const args: (string | number)[] = [];
      const countArgs: (string | number)[] = [];

      if (search) {
        const searchPattern = `%${search}%`;
        const filterStr = ` WHERE (studentName LIKE ? OR custom_title LIKE ? OR project_id LIKE ?)`;
        query += filterStr;
        countQuery += filterStr;
        args.push(searchPattern, searchPattern, searchPattern);
        countArgs.push(searchPattern, searchPattern, searchPattern);
      }

      query += ` ORDER BY submitted_at DESC LIMIT ? OFFSET ?`;
      args.push(limit, offset);

      const [res, countRes] = await Promise.all([
        client.execute({ sql: query, args }),
        client.execute({ sql: countQuery, args: countArgs })
      ]);

      const total = Number(countRes.rows[0]?.count || 0);
      const submissions = res.rows as unknown as ProjectSubmission[];
      return { submissions, total };
    } catch (e) {
      console.error("Deepmind: Failed to fetch paginated project submissions from Turso", e);
    }
  }

  // Fallback to localStorage
  const local = localStorage.getItem('cynexai_project_submissions');
  let items: ProjectSubmission[] = local ? JSON.parse(local) : [];

  if (search) {
    const searchLower = search.toLowerCase();
    items = items.filter(s => 
      (s.studentName || '').toLowerCase().includes(searchLower) ||
      (s.custom_title || '').toLowerCase().includes(searchLower) ||
      (s.project_id || '').toLowerCase().includes(searchLower)
    );
  }

  const total = items.length;
  // Sort and slice
  items.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  const submissions = items.slice(offset, offset + limit);

  return { submissions, total };
};


export const createProjectSubmission = async (submission: ProjectSubmission) => {
  let finalStudentName = submission.studentName || '';
  if (!finalStudentName) {
    if (isTursoConfigured && client && !dbConnectionFailed) {
      try {
        const userRes = await client.execute({
          sql: "SELECT name FROM users WHERE id = ? LIMIT 1",
          args: [submission.student_id]
        });
        if (userRes.rows.length > 0) {
          finalStudentName = String(userRes.rows[0].name || '');
        }
      } catch (e) {
        console.warn("Failed to retrieve student name automatically", e);
      }
    }
    if (!finalStudentName) {
      const localUsers = localStorage.getItem('cynexai_local_users');
      const usersList = localUsers ? JSON.parse(localUsers) : [];
      const matchedUser = usersList.find((u: any) => u.id === submission.student_id);
      if (matchedUser) {
        finalStudentName = matchedUser.name;
      }
    }
  }

  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO project_submissions (
                id, project_id, student_id, studentName, custom_title, custom_description,
                submission_url, submission_file, status, score, feedback, submitted_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          submission.id,
          submission.project_id,
          submission.student_id,
          finalStudentName,
          submission.custom_title || null,
          submission.custom_description || null,
          submission.submission_url || null,
          submission.submission_file || null,
          submission.status || 'pending',
          submission.score !== undefined ? submission.score : null,
          submission.feedback || null,
          submission.submitted_at || new Date().toISOString()
        ]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create project submission in Turso", e);
    }
  }
  const local = localStorage.getItem('cynexai_project_submissions');
  const submissions: ProjectSubmission[] = local ? JSON.parse(local) : [];
  submissions.push({ ...submission, studentName: finalStudentName });
  localStorage.setItem('cynexai_project_submissions', JSON.stringify(submissions));
};

export const updateProjectSubmission = async (submission: ProjectSubmission) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `UPDATE project_submissions SET
                project_id = ?, student_id = ?, studentName = ?, custom_title = ?, custom_description = ?,
                submission_url = ?, submission_file = ?, status = ?, score = ?, feedback = ?, submitted_at = ?
              WHERE id = ?`,
        args: [
          submission.project_id,
          submission.student_id,
          submission.studentName || '',
          submission.custom_title || null,
          submission.custom_description || null,
          submission.submission_url || null,
          submission.submission_file || null,
          submission.status,
          submission.score !== undefined ? submission.score : null,
          submission.feedback || null,
          submission.submitted_at,
          submission.id
        ]
      });

      // Automatically trigger notification for the student when graded
      if (submission.status === 'approved' || submission.status === 'needs_work') {
        const statusText = submission.status === 'approved' ? 'approved' : 'needs improvement';
        const xpText = submission.score ? ` and earned ${submission.score} XP` : '';
        await createNotification({
          id: `notif_${Date.now()}`,
          student_id: submission.student_id,
          title: `Project ${submission.status === 'approved' ? 'Approved! 🎉' : 'Needs Review ⚠️'}`,
          message: `Your submission for "${submission.custom_title || submission.project_id}" has been reviewed. Status: ${statusText}${xpText}.`,
          type: submission.status === 'approved' ? 'success' : 'warning',
          is_read: 0,
          created_at: new Date().toISOString()
        });
      }

      return;
    } catch (e) {
      console.error("Deepmind: Failed to update project submission in Turso", e);
    }
  }
  const local = localStorage.getItem('cynexai_project_submissions');
  let submissions: ProjectSubmission[] = local ? JSON.parse(local) : [];
  const index = submissions.findIndex(s => s.id === submission.id);
  if (index !== -1) {
    submissions[index] = submission;
    localStorage.setItem('cynexai_project_submissions', JSON.stringify(submissions));
  }
};

export const getUserProgress = async (studentId: string): Promise<UserProgress> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const res = await client.execute({
        sql: "SELECT * FROM user_progress WHERE userId = ? LIMIT 1",
        args: [studentId]
      });
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          userId: row.userId as string,
          studentName: row.studentName as string,
          totalSolved: Number(row.totalSolved || 0),
          easySolved: Number(row.easySolved || 0),
          mediumSolved: Number(row.mediumSolved || 0),
          hardSolved: Number(row.hardSolved || 0),
          solvedProblems: row.solvedProblems ? JSON.parse(row.solvedProblems as string) : [],
          lastUpdated: row.lastUpdated as string,
          currentStreak: Number(row.currentStreak || 0),
          longestStreak: Number(row.longestStreak || 0),
          xpPoints: Number(row.xpPoints || 0)
        };
      }
    } catch (e) {
      console.error("Deepmind: Failed to get user progress from Turso", e);
    }
  }
  const local = localStorage.getItem('cynexai_user_progress_' + studentId);
  if (local) return JSON.parse(local);
  return {
    userId: studentId,
    studentName: 'Student',
    totalSolved: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    solvedProblems: [],
    lastUpdated: new Date().toISOString(),
    currentStreak: 0,
    longestStreak: 0,
    xpPoints: 0
  };
};

export const updateUserProgress = async (progress: UserProgress) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO user_progress (
                userId, studentName, totalSolved, easySolved, mediumSolved, hardSolved,
                solvedProblems, lastUpdated, currentStreak, longestStreak, xpPoints
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          progress.userId,
          progress.studentName,
          progress.totalSolved,
          progress.easySolved,
          progress.mediumSolved,
          progress.hardSolved,
          JSON.stringify(progress.solvedProblems),
          progress.lastUpdated,
          progress.currentStreak,
          progress.longestStreak,
          progress.xpPoints
        ]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to update user progress in Turso", e);
    }
  }
  localStorage.setItem('cynexai_user_progress_' + progress.userId, JSON.stringify(progress));
};

export const getNotifications = async (studentId: string): Promise<Notification[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const res = await client.execute({
        sql: "SELECT * FROM notifications WHERE student_id = ? ORDER BY created_at DESC",
        args: [studentId]
      });
      return res.rows as unknown as Notification[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch notifications from Turso", e);
    }
  }
  const local = localStorage.getItem('cynexai_local_notifications_' + studentId);
  return local ? JSON.parse(local) : [];
};

export const createNotification = async (notif: Omit<Notification, 'is_read'> & { is_read?: number }) => {
  const newNotif = { ...notif, is_read: notif.is_read || 0 };
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO notifications (id, student_id, title, message, type, is_read, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [newNotif.id, newNotif.student_id, newNotif.title, newNotif.message, newNotif.type || 'info', newNotif.is_read, newNotif.created_at || new Date().toISOString()]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create notification in Turso", e);
    }
  }
  const local = localStorage.getItem('cynexai_local_notifications_' + newNotif.student_id);
  const list: Notification[] = local ? JSON.parse(local) : [];
  list.unshift(newNotif as Notification);
  localStorage.setItem('cynexai_local_notifications_' + newNotif.student_id, JSON.stringify(list));
};

export const markNotificationAsRead = async (id: string, studentId: string) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: "UPDATE notifications SET is_read = 1 WHERE id = ?",
        args: [id]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to mark notification as read in Turso", e);
    }
  }
  const local = localStorage.getItem('cynexai_local_notifications_' + studentId);
  if (local) {
    const list: Notification[] = JSON.parse(local);
    const updated = list.map(n => n.id === id ? { ...n, is_read: 1 } : n);
    localStorage.setItem('cynexai_local_notifications_' + studentId, JSON.stringify(updated));
  }
};

// --- DATABASE OPERATIONS ---

const syncLocalStorageToTurso = async () => {
  if (!isTursoConfigured || !client) return;

  try {
    const localPosts = getAllPostsLocal();
    if (localPosts.length > 0) {
      console.log(`Deepmind: Syncing ${localPosts.length} local posts to Turso Cloud (REPLACE mode)...`);
      for (const post of localPosts) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO blog_posts (id, title, content, image, video, category, isVisible, date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [post.id, post.title, post.content, post.image, post.video || null, post.category, post.isVisible ? 1 : 0, post.date]
        });
      }
      console.log("Deepmind: Local storage data merged with Cloud.");
    }
  } catch (e) {
    console.error("Deepmind: Sync failure:", e);
  }
};

export const populateSampleData = async () => {
  if (!isTursoConfigured || !client) return;

  const samplePosts: Post[] = [
    {
      id: "welcome-to-cynexai-" + Date.now().toString().slice(-4),
      title: "Welcome to CynexAI Blog",
      content: "This is a sample post generated during database repair. If you see this, your Turso Cloud connection is working perfectly.",
      category: "News",
      isVisible: true,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800"
    }
  ];

  try {
    console.log("Deepmind: Injecting sample post...");
    await createPost(samplePosts[0]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e };
  }
};

export const syncSamplePosts = async () => {
  return { success: 0, failed: 0 };
};

// --- ANNOUNCEMENT OPERATIONS ---

export const getAnnouncements = async (): Promise<Announcement[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute("SELECT * FROM announcements ORDER BY created_at DESC");
      return result.rows.map((row: any) => ({
        ...row,
        isActive: (row as any).isActive === 1
      })) as unknown as Announcement[];
    } catch (e) {
      console.error("Failed to fetch announcements", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_announcements');
    if (local) {
      const items = JSON.parse(local) as Announcement[];
      return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    // Seed announcements
    const sampleAnnouncements: Announcement[] = [
      {
        id: 'ann_demo_1',
        title: 'Welcome to CynexAI LMS Portal!',
        message: 'Explore your customized dashboard, practice coding questions daily, check your batch recording videos, and reach out via support tickets for any queries.',
        target_audience: 'all',
        created_by: 'Admin',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true
      },
      {
        id: 'ann_demo_2',
        title: 'Weekly Mock Assessment Schedule',
        message: 'The assessment test for this week is now active under the Assessment tab. Please ensure to complete it before Sunday midnight.',
        target_audience: 'course',
        course_id: 'data-science-machine-learning',
        created_by: 'Admin',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true
      }
    ];
    localStorage.setItem('cynexai_local_announcements', JSON.stringify(sampleAnnouncements));
    return sampleAnnouncements;
  } catch {
    return [];
  }
};

export const createAnnouncement = async (announcement: Omit<Announcement, 'created_at'>) => {
  const newAnn = { ...announcement, created_at: new Date().toISOString() };
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT INTO announcements (id, title, message, target_audience, course_id, created_by, created_at, isActive)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [newAnn.id, newAnn.title, newAnn.message, newAnn.target_audience,
               newAnn.course_id || null, newAnn.created_by, newAnn.created_at, newAnn.isActive ? 1 : 0]
      });
      return;
    } catch (e) {
      console.error("Failed to create announcement", e);
      throw e;
    }
  }
  try {
    const all = await getAnnouncements();
    all.push(newAnn as Announcement);
    localStorage.setItem('cynexai_local_announcements', JSON.stringify(all));
  } catch (e) {
    console.error("Failed to create announcement in localStorage", e);
  }
};

export const updateAnnouncement = async (announcement: Announcement) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `UPDATE announcements SET title = ?, message = ?, target_audience = ?, course_id = ?, isActive = ? WHERE id = ?`,
        args: [announcement.title, announcement.message, announcement.target_audience,
               announcement.course_id || null, announcement.isActive ? 1 : 0, announcement.id]
      });
      return;
    } catch (e) {
      console.error("Failed to update announcement", e);
      throw e;
    }
  }
  try {
    const all = await getAnnouncements();
    const index = all.findIndex(a => a.id === announcement.id);
    if (index !== -1) {
      all[index] = announcement;
      localStorage.setItem('cynexai_local_announcements', JSON.stringify(all));
    }
  } catch (e) {
    console.error("Failed to update announcement in localStorage", e);
  }
};

export const deleteAnnouncement = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({ sql: "DELETE FROM announcements WHERE id = ?", args: [id] });
      return;
    } catch (e) {
      console.error("Failed to delete announcement", e);
    }
  }
  try {
    const all = await getAnnouncements();
    const filtered = all.filter(a => a.id !== id);
    localStorage.setItem('cynexai_local_announcements', JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to delete announcement in localStorage", e);
  }
};

export const toggleAnnouncementStatus = async (id: string, isActive: boolean) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({ sql: "UPDATE announcements SET isActive = ? WHERE id = ?", args: [isActive ? 1 : 0, id] });
      return;
    } catch (e) {
      console.error("Failed to toggle announcement", e);
    }
  }
  try {
    const all = await getAnnouncements();
    const index = all.findIndex(a => a.id === id);
    if (index !== -1) {
      all[index].isActive = isActive;
      localStorage.setItem('cynexai_local_announcements', JSON.stringify(all));
    }
  } catch (e) {
    console.error("Failed to toggle announcement status in localStorage", e);
  }
};

// --- ADMIN LESSON CRUD ---

export const createLesson = async (lesson: Lesson) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT INTO lessons (
          id, course_id, module_name, lesson_title, video_url, order_index,
          module_id, description, duration, prerequisite_lesson_id, is_published, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          lesson.id,
          lesson.course_id,
          lesson.module_name,
          lesson.lesson_title,
          lesson.video_url,
          lesson.order_index,
          lesson.module_id || null,
          lesson.description || null,
          lesson.duration || null,
          lesson.prerequisite_lesson_id || null,
          lesson.is_published !== undefined ? lesson.is_published : 1,
          lesson.created_at || new Date().toISOString(),
          lesson.updated_at || new Date().toISOString()
        ]
      });
      return;
    } catch (e) {
      console.error("Failed to create lesson", e);
      throw e;
    }
  }
  try {
    const all = await getAllLessons();
    const index = all.findIndex(l => l.id === lesson.id);
    const newLesson = {
      ...lesson,
      is_published: lesson.is_published !== undefined ? lesson.is_published : 1,
      created_at: lesson.created_at || new Date().toISOString(),
      updated_at: lesson.updated_at || new Date().toISOString()
    };
    if (index !== -1) {
      all[index] = newLesson;
    } else {
      all.push(newLesson);
    }
    localStorage.setItem('cynexai_local_lessons', JSON.stringify(all));
  } catch (e) {
    console.error("Failed to create lesson in localStorage", e);
  }
};

export const updateLesson = async (lesson: Lesson) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `UPDATE lessons SET 
          module_name=?, lesson_title=?, video_url=?, order_index=?,
          module_id=?, description=?, duration=?, prerequisite_lesson_id=?, is_published=?, updated_at=?
          WHERE id=?`,
        args: [
          lesson.module_name,
          lesson.lesson_title,
          lesson.video_url,
          lesson.order_index,
          lesson.module_id || null,
          lesson.description || null,
          lesson.duration || null,
          lesson.prerequisite_lesson_id || null,
          lesson.is_published !== undefined ? lesson.is_published : 1,
          new Date().toISOString(),
          lesson.id
        ]
      });
      return;
    } catch (e) {
      console.error("Failed to update lesson", e);
      throw e;
    }
  }
  try {
    const all = await getAllLessons();
    const index = all.findIndex(l => l.id === lesson.id);
    if (index !== -1) {
      all[index] = {
        ...all[index],
        ...lesson,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('cynexai_local_lessons', JSON.stringify(all));
    }
  } catch (e) {
    console.error("Failed to update lesson in localStorage", e);
  }
};

export const deleteLesson = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({ sql: "DELETE FROM lessons WHERE id = ?", args: [id] });
      return;
    } catch (e) {
      console.error("Failed to delete lesson", e);
    }
  }
  try {
    const all = await getAllLessons();
    const filtered = all.filter(l => l.id !== id);
    localStorage.setItem('cynexai_local_lessons', JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to delete lesson in localStorage", e);
  }
};

export const getAllLessons = async (): Promise<Lesson[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute("SELECT * FROM lessons ORDER BY course_id, order_index ASC");
      return result.rows as unknown as Lesson[];
    } catch (e) {
      console.error("Failed to fetch all lessons", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_lessons');
    if (local) {
      return JSON.parse(local) as Lesson[];
    }
    const sampleLessons: Lesson[] = [
      // Data Science & Machine Learning
      { id: 'ds_l1', course_id: 'data-science-machine-learning', module_name: 'Python Programming Fundamentals', lesson_title: 'Introduction to Data Science & Jupyter Notebooks', video_url: 'https://www.youtube.com/embed/ua-CiDNNj30', order_index: 1 },
      { id: 'ds_l2', course_id: 'data-science-machine-learning', module_name: 'Data Manipulation with Pandas & NumPy', lesson_title: 'Pandas & NumPy Deep Dive for Beginners', video_url: 'https://www.youtube.com/embed/rfscVS0vtbw', order_index: 2 },
      { id: 'ds_l3', course_id: 'data-science-machine-learning', module_name: 'Supervised Machine Learning Algorithms', lesson_title: 'Introduction to Supervised Machine Learning', video_url: 'https://www.youtube.com/embed/Gv9_4yMHFhI', order_index: 3 },
      { id: 'ds_l4', course_id: 'data-science-machine-learning', module_name: 'Deep Learning with TensorFlow & Keras', lesson_title: 'Deep Learning Foundations with TensorFlow', video_url: 'https://www.youtube.com/embed/aircAruvnKk', order_index: 4 },
      { id: 'ds_l5', course_id: 'data-science-machine-learning', module_name: 'Data Visualization & EDA', lesson_title: 'Exploratory Data Analysis with Python & Matplotlib', video_url: 'https://www.youtube.com/embed/r-uOLxNrNk8', order_index: 5 },
      { id: 'ds_l6', course_id: 'data-science-machine-learning', module_name: 'Model Evaluation & Deployment', lesson_title: 'Model Selection, Evaluation & Deployment Strategies', video_url: 'https://www.youtube.com/embed/fwY9Qv96DJY', order_index: 6 },

      // Artificial Intelligence & Generative AI
      { id: 'ai_l1', course_id: 'artificial-intelligence-generative-ai', module_name: 'Introduction to AI & Deep Learning', lesson_title: 'Introduction to Artificial Intelligence & Deep Learning', video_url: 'https://www.youtube.com/embed/2ePf9rue1Ao', order_index: 1 },
      { id: 'ai_l2', course_id: 'artificial-intelligence-generative-ai', module_name: 'Generative Adversarial Networks (GANs)', lesson_title: 'Generative Adversarial Networks (GANs) Explained', video_url: 'https://www.youtube.com/embed/TpMIssRdhco', order_index: 2 },
      { id: 'ai_l3', course_id: 'artificial-intelligence-generative-ai', module_name: 'Large Language Models (LLMs) & Transformers', lesson_title: 'Introduction to Transformers & Hugging Face', video_url: 'https://www.youtube.com/embed/eMlx5fFNoYc', order_index: 3 },
      { id: 'ai_l4', course_id: 'artificial-intelligence-generative-ai', module_name: 'Prompt Engineering & Fine-tuning LLMs', lesson_title: 'Prompt Engineering & LLM Orchestration', video_url: 'https://www.youtube.com/embed/jC4v5AS4YSg', order_index: 4 },
      { id: 'ai_l5', course_id: 'artificial-intelligence-generative-ai', module_name: 'Computer Vision with CNNs', lesson_title: 'Convolutional Neural Networks for Image Recognition', video_url: 'https://www.youtube.com/embed/YRhxdVk_sIs', order_index: 5 },
      { id: 'ai_l6', course_id: 'artificial-intelligence-generative-ai', module_name: 'AI Ethics & Responsible AI', lesson_title: 'AI Ethics, Bias & Responsible AI Development', video_url: 'https://www.youtube.com/embed/aGwYtUzMQUk', order_index: 6 },

      // Full Stack Java Development
      { id: 'java_l1', course_id: 'full-stack-java-development', module_name: 'Java Core & OOP', lesson_title: 'Java Programming Basics & OOP Foundations', video_url: 'https://www.youtube.com/embed/eIrMbAQSU34', order_index: 1 },
      { id: 'java_l2', course_id: 'full-stack-java-development', module_name: 'SQL & Database Management', lesson_title: 'Introduction to Relational Databases & SQL', video_url: 'https://www.youtube.com/embed/HXV3zeQKqGY', order_index: 2 },
      { id: 'java_l3', course_id: 'full-stack-java-development', module_name: 'Spring Boot & Microservices', lesson_title: 'Building REST APIs with Spring Boot', video_url: 'https://www.youtube.com/embed/9SGDpanrc8U', order_index: 3 },
      { id: 'java_l4', course_id: 'full-stack-java-development', module_name: 'Frontend Development', lesson_title: 'Connecting React Frontend to Spring Boot Backend', video_url: 'https://www.youtube.com/embed/f2EqECiTBL8', order_index: 4 },
      { id: 'java_l5', course_id: 'full-stack-java-development', module_name: 'Microservices Architecture', lesson_title: 'Microservices with Spring Boot & Spring Cloud', video_url: 'https://www.youtube.com/embed/BnknNTN8icw', order_index: 5 },
      { id: 'java_l6', course_id: 'full-stack-java-development', module_name: 'Security & Authentication', lesson_title: 'Spring Security, JWT & OAuth2 Implementation', video_url: 'https://www.youtube.com/embed/b9O9NI-RJ3o', order_index: 6 },

      // DevOps & Cloud Technologies
      { id: 'devops_l1', course_id: 'devops-cloud-technologies', module_name: 'DevOps & Cloud Technologies', lesson_title: 'Introduction to DevOps Principles & AWS Cloud', video_url: 'https://www.youtube.com/embed/j5Zsa_eOXeY', order_index: 1 },
      { id: 'devops_l2', course_id: 'devops-cloud-technologies', module_name: 'CI/CD Pipelines', lesson_title: 'Continuous Integration & Deployment (CI/CD) Pipelines', video_url: 'https://www.youtube.com/embed/scEDHsr3APg', order_index: 2 },
      { id: 'devops_l3', course_id: 'devops-cloud-technologies', module_name: 'Docker & Containerization', lesson_title: 'Docker Containers for Software Engineers', video_url: 'https://www.youtube.com/embed/3c-iFnDcCD0', order_index: 3 },
      { id: 'devops_l4', course_id: 'devops-cloud-technologies', module_name: 'Kubernetes', lesson_title: 'Kubernetes Orchestration from Scratch', video_url: 'https://www.youtube.com/embed/X48VuDVv0do', order_index: 4 },
      { id: 'devops_l5', course_id: 'devops-cloud-technologies', module_name: 'Infrastructure as Code', lesson_title: 'Terraform & Infrastructure as Code (IaC) Fundamentals', video_url: 'https://www.youtube.com/embed/l5k1ai_GBDE', order_index: 5 },
      { id: 'devops_l6', course_id: 'devops-cloud-technologies', module_name: 'Monitoring & Observability', lesson_title: 'Prometheus, Grafana & Cloud Monitoring in Production', video_url: 'https://www.youtube.com/embed/h4Sl21AKiDg', order_index: 6 },
      
      // Python Programming
      { id: 'py_l1', course_id: 'python-programming', module_name: 'Python Basics & Syntax', lesson_title: 'Introduction to Python', video_url: 'https://www.youtube.com/embed/kqtD5dpn9C8', order_index: 1 },
      { id: 'py_l2', course_id: 'python-programming', module_name: 'Data Types & Data Structures', lesson_title: 'Lists, Tuples, Dictionaries', video_url: 'https://www.youtube.com/embed/kqtD5dpn9C8', order_index: 2 },

      // Software Testing
      { id: 'st_l1', course_id: 'software-testing-manual-automation', module_name: 'Manual Testing Fundamentals', lesson_title: 'Intro to Manual Testing', video_url: 'https://www.youtube.com/embed/kw0Uis88y3Q', order_index: 1 },

      // SAP
      { id: 'sap_l1', course_id: 'sap-data-processing', module_name: 'Introduction to SAP & ERP Concepts', lesson_title: 'SAP Overview', video_url: 'https://www.youtube.com/embed/Z0p9v_4-pM0', order_index: 1 }
    ];
    localStorage.setItem('cynexai_local_lessons', JSON.stringify(sampleLessons));
    return sampleLessons;
  } catch {
    return [];
  }
};

// --- ADMIN BADGE CRUD ---

export const getAllBadges = async (): Promise<Badge[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute("SELECT * FROM badges ORDER BY unlocked_at DESC");
      return result.rows as unknown as Badge[];
    } catch (e) {
      console.error("Failed to fetch all badges", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_badges');
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
};

export const createBadge = async (badge: Badge) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT INTO badges (id, student_id, title, icon, color, unlocked_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [badge.id, badge.student_id, badge.title, badge.icon, badge.color, badge.unlocked_at || new Date().toISOString()]
      });
      return;
    } catch (e) {
      console.error("Failed to create badge", e);
      throw e;
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_badges');
    const all = local ? JSON.parse(local) as Badge[] : [];
    all.push(badge);
    localStorage.setItem('cynexai_local_badges', JSON.stringify(all));
  } catch (e) {
    console.error("Failed to create badge in localStorage", e);
  }
};

export const deleteBadge = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({ sql: "DELETE FROM badges WHERE id = ?", args: [id] });
      return;
    } catch (e) {
      console.error("Failed to delete badge", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_badges');
    if (local) {
      const all = JSON.parse(local) as Badge[];
      const filtered = all.filter(b => b.id !== id);
      localStorage.setItem('cynexai_local_badges', JSON.stringify(filtered));
    }
  } catch (e) {
    console.error("Failed to delete badge in localStorage", e);
  }
};

// --- ADMIN JOB CRUD ---

export const createJobListing = async (job: JobListing) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT INTO job_listings (id, title, company, location, salary, description, type, category, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [job.id, job.title, job.company, job.location, job.salary, job.description, job.type, job.category, job.created_at || new Date().toISOString()]
      });
    } catch (e) {
      console.error("Failed to create job listing", e);
      throw e;
    }
  }
};

export const updateJobListing = async (job: JobListing) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `UPDATE job_listings SET title=?, company=?, location=?, salary=?, description=?, type=?, category=? WHERE id=?`,
        args: [job.title, job.company, job.location, job.salary, job.description, job.type, job.category, job.id]
      });
    } catch (e) {
      console.error("Failed to update job listing", e);
      throw e;
    }
  }
};

export const deleteJobListing = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({ sql: "DELETE FROM job_listings WHERE id = ?", args: [id] });
    } catch (e) {
      console.error("Failed to delete job listing", e);
    }
  }
};

// --- ADMIN ANALYTICS QUERIES ---

export interface AdminStats {
  totalStudents: number;
  totalCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  totalRevenue: number;
  totalPayments: number;
  openTickets: number;
  totalJobs: number;
  totalWebinars: number;
}

export const getAdminStats = async (): Promise<AdminStats> => {
  const defaults: AdminStats = {
    totalStudents: 0, totalCourses: 0, totalEnrollments: 0,
    activeEnrollments: 0, completedEnrollments: 0,
    totalRevenue: 0, totalPayments: 0, openTickets: 0,
    totalJobs: 0, totalWebinars: 0
  };
  if (isTursoConfigured && client) {
    try {
      const [students, courses, enrollments, activeEnr, completedEnr, revenue, payments, tickets, jobs, webinars] = await Promise.all([
        client.execute("SELECT COUNT(*) as c FROM users WHERE role='student'"),
        client.execute("SELECT COUNT(*) as c FROM courses"),
        client.execute("SELECT COUNT(*) as c FROM enrollments"),
        client.execute("SELECT COUNT(*) as c FROM enrollments WHERE status='active'"),
        client.execute("SELECT COUNT(*) as c FROM enrollments WHERE status='completed'"),
        client.execute("SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments"),
        client.execute("SELECT COUNT(*) as c FROM payments"),
        client.execute("SELECT COUNT(*) as c FROM support_tickets WHERE status='open'"),
        client.execute("SELECT COUNT(*) as c FROM job_listings"),
        client.execute("SELECT COUNT(*) as c FROM webinars")
      ]);
      return {
        totalStudents: Number(students.rows[0].c),
        totalCourses: Number(courses.rows[0].c),
        totalEnrollments: Number(enrollments.rows[0].c),
        activeEnrollments: Number(activeEnr.rows[0].c),
        completedEnrollments: Number(completedEnr.rows[0].c),
        totalRevenue: Number(revenue.rows[0].total),
        totalPayments: Number(payments.rows[0].c),
        openTickets: Number(tickets.rows[0].c),
        totalJobs: Number(jobs.rows[0].c),
        totalWebinars: Number(webinars.rows[0].c)
      };
    } catch (e) {
      console.error("Failed to get admin stats", e);
    }
  }
  return defaults;
};

export const getEnrollmentStatsByCourse = async (): Promise<{ course_id: string; course_title: string; count: number }[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute(`
        SELECT e.course_id, c.title as course_title, COUNT(*) as count
        FROM enrollments e
        LEFT JOIN courses c ON e.course_id = c.id
        GROUP BY e.course_id
        ORDER BY count DESC
      `);
      return result.rows.map((r: any) => ({
        course_id: r.course_id as string,
        course_title: (r.course_title as string) || r.course_id as string,
        count: Number(r.count)
      }));
    } catch (e) {
      console.error("Failed to get enrollment stats", e);
    }
  }
  return [];
};

export const getRevenueOverTime = async (): Promise<{ month: string; revenue: number }[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute(`
        SELECT strftime('%Y-%m', due_date) as month, SUM(amount_paid) as revenue
        FROM payments WHERE status='paid'
        GROUP BY month ORDER BY month ASC
      `);
      return result.rows.map((r: any) => ({
        month: r.month as string,
        revenue: Number(r.revenue)
      }));
    } catch (e) {
      console.error("Failed to get revenue data", e);
    }
  }
  return [];
};

export const initTursoDB = async () => {
  if (isInitialized) return true;
  if (isInitializing) return true; // Already in progress
  
  if (isTursoConfigured && client && !dbConnectionFailed) {
    isInitializing = true;
    try {
      // Create tables if they don't exist
      await client.execute(`
        CREATE TABLE IF NOT EXISTS blog_posts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          image TEXT,
          video TEXT,
          category TEXT,
          isVisible INTEGER DEFAULT 1,
          date TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS mock_tests (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          duration INTEGER,
          category TEXT,
          totalQuestions INTEGER,
          isActive INTEGER DEFAULT 1,
          createdAt TEXT,
          language TEXT DEFAULT 'English'
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS questions (
          id TEXT PRIMARY KEY,
          testId TEXT,
          text TEXT NOT NULL,
          options TEXT,
          correctAnswer INTEGER,
          difficulty TEXT DEFAULT 'easy',
          type TEXT DEFAULT 'mcq',
          sampleInput TEXT,
          sampleOutput TEXT,
          explanation TEXT,
          isApproved INTEGER DEFAULT 0,
          aiMetadata TEXT,
          testCases TEXT,
          boilerplate TEXT,
          inputFormat TEXT,
          outputFormat TEXT,
          constraints TEXT,
          FOREIGN KEY (testId) REFERENCES mock_tests(id) ON DELETE CASCADE
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS ai_settings (
          id TEXT PRIMARY KEY,
          isAiGenerationEnabled INTEGER DEFAULT 1,
          maxDailyQuestions INTEGER DEFAULT 100,
          currentDailyCount INTEGER DEFAULT 0,
          lastResetDate TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS student_performance (
          userId TEXT,
          category TEXT,
          strength REAL DEFAULT 0.5,
          weakTopics TEXT,
          lastResult REAL,
          PRIMARY KEY (userId, category)
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS webinars (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          instructor TEXT,
          date TEXT,
          time TEXT,
          duration TEXT,
          participants INTEGER,
          maxParticipants INTEGER,
          description TEXT,
          status TEXT
        )
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS applications (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          course TEXT,
          type TEXT,
          status TEXT,
          appliedAt TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS test_results (
          id TEXT PRIMARY KEY,
          studentName TEXT NOT NULL,
          testId TEXT,
          testTitle TEXT,
          score INTEGER,
          totalQuestions INTEGER,
          percentage REAL,
          date TEXT,
          studentAnswers TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS courses (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          subtitle TEXT,
          description TEXT,
          image TEXT,
          duration TEXT,
          placement TEXT,
          students TEXT,
          rating REAL,
          level TEXT,
          skills TEXT,
          modules TEXT,
          outcomes TEXT,
          prerequisites TEXT,
          career TEXT,
          curriculum TEXT,
          isVisible INTEGER DEFAULT 1
        )
      `);

      // LMS / Student Portal Tables
      await client.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          phone TEXT,
          role TEXT DEFAULT 'student',
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS enrollments (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          course_id TEXT NOT NULL,
          progress_percentage REAL DEFAULT 0,
          status TEXT DEFAULT 'active'
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS lessons (
          id TEXT PRIMARY KEY,
          course_id TEXT NOT NULL,
          module_name TEXT,
          lesson_title TEXT,
          video_url TEXT,
          order_index INTEGER DEFAULT 0
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          total_amount REAL,
          amount_paid REAL DEFAULT 0,
          due_date TEXT,
          status TEXT DEFAULT 'pending',
          isVisible INTEGER DEFAULT 1
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS support_tickets (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          category TEXT,
          description TEXT,
          status TEXT DEFAULT 'open',
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS support_replies (
          id TEXT PRIMARY KEY,
          ticket_id TEXT NOT NULL,
          sender_id TEXT NOT NULL,
          sender_name TEXT NOT NULL,
          sender_role TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS badges (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          title TEXT,
          icon TEXT,
          color TEXT,
          unlocked_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS onboarding_steps (
          student_id TEXT,
          step_id TEXT,
          is_done INTEGER DEFAULT 0,
          PRIMARY KEY (student_id, step_id)
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS job_listings (
          id TEXT PRIMARY KEY,
          title TEXT,
          company TEXT,
          location TEXT,
          salary TEXT,
          description TEXT,
          type TEXT,
          category TEXT,
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS announcements (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          target_audience TEXT DEFAULT 'all',
          course_id TEXT,
          created_by TEXT,
          created_at TEXT,
          isActive INTEGER DEFAULT 1
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS mentorship_sessions (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          mentor_name TEXT,
          date TEXT,
          time TEXT,
          status TEXT,
          meeting_link TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS course_discussions (
          id TEXT PRIMARY KEY,
          course_id TEXT NOT NULL,
          student_id TEXT NOT NULL,
          student_name TEXT,
          message TEXT,
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS testimonials (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT,
          course TEXT,
          rating INTEGER DEFAULT 5,
          text TEXT NOT NULL,
          image TEXT,
          isVisible INTEGER DEFAULT 1,
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS attendance_sessions (
          id TEXT PRIMARY KEY,
          course_id TEXT NOT NULL,
          session_date TEXT,
          topic TEXT,
          pin_code TEXT,
          created_by TEXT,
          created_at TEXT,
          batch_name TEXT,
          session_time TEXT,
          meeting_link TEXT
        )
      `);
      
      // Try to add missing columns if they don't exist
      try { await client.execute(`ALTER TABLE attendance_sessions ADD COLUMN batch_name TEXT`); } catch {}
      try { await client.execute(`ALTER TABLE attendance_sessions ADD COLUMN session_time TEXT`); } catch {}
      try { await client.execute(`ALTER TABLE attendance_sessions ADD COLUMN meeting_link TEXT`); } catch {}

      await client.execute(`
        CREATE TABLE IF NOT EXISTS attendance_records (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          student_id TEXT NOT NULL,
          student_name TEXT,
          marked_at TEXT,
          method TEXT DEFAULT 'pin'
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS certificates (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          student_name TEXT,
          course_id TEXT NOT NULL,
          course_title TEXT,
          issued_at TEXT,
          certificate_number TEXT UNIQUE,
          credential_id TEXT,
          file_data TEXT,
          file_type TEXT
        )
      `);
      
      // Migrations for certificates
      try { await client.execute(`ALTER TABLE certificates ADD COLUMN credential_id TEXT`); } catch(e) {}
      try { await client.execute(`ALTER TABLE certificates ADD COLUMN file_data TEXT`); } catch(e) {}
      try { await client.execute(`ALTER TABLE certificates ADD COLUMN file_type TEXT`); } catch(e) {}

      await client.execute(`
        CREATE TABLE IF NOT EXISTS certificate_credentials (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          student_name TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS doubt_questions (
          id TEXT PRIMARY KEY,
          course_id TEXT,
          student_id TEXT NOT NULL,
          student_name TEXT,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          tags TEXT DEFAULT '[]',
          upvotes INTEGER DEFAULT 0,
          is_resolved INTEGER DEFAULT 0,
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS doubt_answers (
          id TEXT PRIMARY KEY,
          question_id TEXT NOT NULL,
          author_id TEXT NOT NULL,
          author_name TEXT,
          author_role TEXT DEFAULT 'student',
          body TEXT NOT NULL,
          upvotes INTEGER DEFAULT 0,
          is_accepted INTEGER DEFAULT 0,
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS coding_problems (
          id TEXT PRIMARY KEY,
          course_id TEXT,
          title TEXT NOT NULL,
          description TEXT,
          difficulty TEXT DEFAULT 'easy',
          boilerplate TEXT DEFAULT '{}',
          test_cases TEXT DEFAULT '[]',
          constraints TEXT,
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS code_submissions (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          problem_id TEXT NOT NULL,
          code TEXT,
          language TEXT,
          status TEXT DEFAULT 'pending',
          runtime_ms INTEGER DEFAULT 0,
          submitted_at TEXT
        )
      `);

      // Migrate: add new columns to courses table if they don't exist yet
      const colChecks = ['subtitle', 'placement', 'modules', 'outcomes', 'prerequisites', 'career'];
      for (const col of colChecks) {
        try {
          await client.execute(`ALTER TABLE courses ADD COLUMN ${col} TEXT`);
        } catch {
          // Column already exists — ignore
        }
      }

      // Migrate: add isVisible column to payments table if it doesn't exist yet
      try {
        await client.execute(`ALTER TABLE payments ADD COLUMN isVisible INTEGER DEFAULT 1`);
      } catch {
        // Column already exists — ignore
      }

      // Create batches table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS batches (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          course_id TEXT NOT NULL,
          created_at TEXT
        )
      `);

      // Create daily_recordings table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS daily_recordings (
          id TEXT PRIMARY KEY,
          batch_id TEXT NOT NULL,
          subject TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          video_url TEXT NOT NULL,
          duration TEXT,
          recording_date TEXT NOT NULL,
          chapters TEXT,
          created_at TEXT
        )
      `);

      // Migrate: add batch_id to users table
      try {
        await client.execute(`ALTER TABLE users ADD COLUMN batch_id TEXT`);
      } catch {
        // Already exists
      }

      // Migrate: add course_id and batch_id to mock_tests table
      try {
        await client.execute(`ALTER TABLE mock_tests ADD COLUMN course_id TEXT`);
      } catch {}
      try {
        await client.execute(`ALTER TABLE mock_tests ADD COLUMN batch_id TEXT`);
      } catch {}
      try {
        await client.execute(`ALTER TABLE mock_tests ADD COLUMN language TEXT DEFAULT 'English'`);
      } catch {}

      // Migrate: add proctoring columns and studentId to test_results table
      try {
        await client.execute(`ALTER TABLE test_results ADD COLUMN studentId TEXT`);
      } catch {}
      try {
        await client.execute(`ALTER TABLE test_results ADD COLUMN warnings INTEGER DEFAULT 0`);
      } catch {}
      try {
        await client.execute(`ALTER TABLE test_results ADD COLUMN timeTaken INTEGER DEFAULT 0`);
      } catch {}
      try {
        await client.execute(`ALTER TABLE test_results ADD COLUMN status TEXT DEFAULT 'completed'`);
      } catch {}
      try {
        await client.execute(`ALTER TABLE test_results ADD COLUMN proctoringLogs TEXT`);
      } catch {}
      try {
        await client.execute(`ALTER TABLE test_results ADD COLUMN confidenceRatings TEXT`);
      } catch {}
      try {
        await client.execute(`ALTER TABLE test_results ADD COLUMN studentAnswers TEXT`);
      } catch {}

      // Migrate: add missing columns to questions table
      try {
        await client.execute(`ALTER TABLE questions ADD COLUMN boilerplate TEXT`);
      } catch {}
      try {
        await client.execute(`ALTER TABLE questions ADD COLUMN inputFormat TEXT`);
      } catch {}
      try {
        await client.execute(`ALTER TABLE questions ADD COLUMN outputFormat TEXT`);
      } catch {}
      try {
        await client.execute(`ALTER TABLE questions ADD COLUMN constraints TEXT`);
      } catch {}

      await client.execute(`
        CREATE TABLE IF NOT EXISTS faqs (
          id TEXT PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          isVisible INTEGER DEFAULT 1,
          order_index INTEGER DEFAULT 0,
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS project_submissions (
          id TEXT PRIMARY KEY,
          project_id TEXT,
          student_id TEXT,
          studentName TEXT,
          custom_title TEXT,
          custom_description TEXT,
          submission_url TEXT,
          submission_file TEXT,
          status TEXT DEFAULT 'pending',
          score REAL,
          feedback TEXT,
          submitted_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS user_progress (
          userId TEXT PRIMARY KEY,
          studentName TEXT,
          totalSolved INTEGER DEFAULT 0,
          easySolved INTEGER DEFAULT 0,
          mediumSolved INTEGER DEFAULT 0,
          hardSolved INTEGER DEFAULT 0,
          solvedProblems TEXT,
          lastUpdated TEXT,
          currentStreak INTEGER DEFAULT 0,
          longestStreak INTEGER DEFAULT 0,
          xpPoints INTEGER DEFAULT 0
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          is_read INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        )
      `);

      // Create new LMS tables
      await client.execute(`
        CREATE TABLE IF NOT EXISTS lesson_resources (
          id TEXT PRIMARY KEY,
          lesson_id TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          title TEXT NOT NULL,
          resource_url TEXT NOT NULL,
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS lesson_attendance_sessions (
          id TEXT PRIMARY KEY,
          lesson_id TEXT NOT NULL,
          batch_id TEXT,
          attendance_pin TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          started_at TEXT,
          ended_at TEXT,
          created_by TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS student_attendance (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          check_in_time TEXT NOT NULL,
          status TEXT DEFAULT 'present'
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS student_lesson_progress (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL,
          watch_percentage REAL DEFAULT 0,
          quiz_score INTEGER DEFAULT 0,
          completed INTEGER DEFAULT 0,
          last_watched_timestamp REAL DEFAULT 0,
          updated_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          lesson_id TEXT,
          metadata TEXT,
          created_at TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS student_notes (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL,
          timestamp REAL NOT NULL,
          note_text TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS ai_lesson_content (
          id TEXT PRIMARY KEY,
          lesson_id TEXT NOT NULL,
          summary TEXT NOT NULL,
          chapters TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);

      // Migrate: add missing columns to lessons table
      const lessonCols = [
        { name: 'module_id', type: 'TEXT' },
        { name: 'description', type: 'TEXT' },
        { name: 'duration', type: 'INTEGER' },
        { name: 'prerequisite_lesson_id', type: 'TEXT' },
        { name: 'is_published', type: 'INTEGER DEFAULT 1' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' }
      ];

      for (const col of lessonCols) {
        try {
          await client.execute(`ALTER TABLE lessons ADD COLUMN ${col.name} ${col.type}`);
        } catch {}
      }

      // Sync user created content from LocalStorage
      await syncLocalStorageToTurso();

      // Sync sample posts securely and robustly
      await syncSamplePosts();

      // Sync sample courses
      await syncSampleCourses();

      // Sync sample LMS data (jobs, badges, etc.)
      await syncSampleLMSData();

      // Sync sample testimonials
      await syncSampleTestimonials();

      // Sync sample FAQs
      await syncSampleFaqs();

      // Sync sample mock tests
      await syncSampleMockTests();

      console.log("Turso Cloud Database Connected and Initialized");
      isInitialized = true;
      try { await autoProvisionContent(); } catch(e) {}
      return true;
    } catch (e) {
      console.error("Turso Cloud Initialization Failed (Using Local Fallback):", e);
      dbConnectionFailed = true;
      return false;
    } finally {
      isInitializing = false;
    }
  } else {
    console.log("Using LocalStorage fallback for blog posts and mock tests");
    isInitialized = true;
    try { await autoProvisionContent(); } catch(e) {}
    return true;
  }
};

export interface GetPostsOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  includeHidden?: boolean;
  offset?: number;
}

export const getPosts = async (options: GetPostsOptions = {}) => {
  const { page = 1, limit = 9, search = '', category = '', includeHidden = false, offset } = options;

  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      // Ensure tables exist
      await initTursoDB();

      let query = `SELECT * FROM blog_posts WHERE 1=1`;
      const args: (string | number)[] = [];

      // We'll fetch ALL potentially relevant posts from Turso first (ignoring limit/offset for a moment to merge correctly)
      // Actually, fetching ALL might be heavy if there are thousands. 
      // Compromise: Fetch detailed list from Turso with filters, then merge local.
      // BUT if we paginate Turso, we might miss the local one that should be on page 1.
      // Better strategy: Fetch from Turso (limit + buffer), fetch all local, merge, sort, then slice.

      if (!includeHidden) {
        query += ` AND isVisible = 1`;
      }

      if (category) {
        query += ` AND category = ?`;
        args.push(category);
      }

      if (search) {
        query += ` AND (title LIKE ? OR content LIKE ? OR category LIKE ?)`;
        args.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ` ORDER BY date DESC`;

      // Execute query without LIMIT first to get the full candidate set from Cloud
      // Note: In a production app with thousands of posts, this needs a better strategy (e.g. cursor-based or complex merging)
      // For this scale, fetching all headers is fine.
      const result = await client.execute({ sql: query, args });
      const tursoPosts = result.rows.map((row: any) => ({
        ...row,
        isVisible: row.isVisible === 1
      })) as unknown as Post[];

      console.log("Deepmind: Turso returned", tursoPosts.length, "posts");

      // Merge with Local Storage (Optimistic UI)
      const localPosts = getAllPostsLocal();
      console.log("Deepmind: Local storage has", localPosts.length, "posts");

      // Create a map to merge by ID, preferring Local (assuming it might have unsynced edits) or Cloud?
      // Actually, if Cloud has it, it's usually the source of truth. 
      // BUT if the user just edited it locally and sync failed, Local is newer.
      // Let's assume Local overrides Cloud if IDs match, to prevent "reverting" to old state.
      const runMap = new Map<string, Post>();

      // 1. Add Turso posts
      tursoPosts.forEach(p => runMap.set(p.id, p));

      // 2. Add/Override with Local posts (only if they match filters)
      localPosts.forEach(p => {
        // Apply same filters to local posts
        if (!includeHidden && !p.isVisible) return;
        if (category && p.category !== category) return;
        if (search &&
          !p.title.toLowerCase().includes(search.toLowerCase()) &&
          !p.content.toLowerCase().includes(search.toLowerCase()) &&
          !p.category.toLowerCase().includes(search.toLowerCase())) return;

        // If it exists in Turso, we might want to keep the Turso one unless we track "lastUpdated".
        // Without "lastUpdated", commonly Cloud is authority. 
        // HOWEVER, the user issue is "added post not showing". This means it's in Local but NOT in Turso.
        // So adding it to the map is safe.
        // If ID collision: logic is tricky. Let's keep existing (Turso) if present, unless we implement versioning.
        // The safest fix for "missing posts" is: if NOT in map, add it.
        if (!runMap.has(p.id)) {
          runMap.set(p.id, p);
        }
      });

      const mergedPosts = Array.from(runMap.values());

      // Sort
      mergedPosts.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

      // Pagination
      const total = mergedPosts.length;
      const start = offset !== undefined ? offset : (page - 1) * limit;
      const slicedPosts = mergedPosts.slice(start, start + limit);

      return { posts: slicedPosts, total };

    } catch (error: unknown) {
      console.error("Deepmind: Error fetching posts from Turso Cloud:", error);
      if (error instanceof Error && error.message?.includes('no such table')) {
        console.warn("Deepmind: Table missing, will trigger init on next action");
      }
      // Fall through to LocalStorage fallback below
    }
  }

  // Fallback to LocalStorage (Complete offline mode)
  const allPosts = getAllPostsLocal();
  const filtered = allPosts.filter(post => {
    if (!includeHidden && !post.isVisible) return false;
    if (search &&
      !post.title.toLowerCase().includes(search.toLowerCase()) &&
      !post.content.toLowerCase().includes(search.toLowerCase()) &&
      !post.category.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && post.category !== category) return false;
    return true;
  });

  filtered.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  const start = offset !== undefined ? offset : (page - 1) * limit;
  return {
    posts: filtered.slice(start, start + limit),
    total: filtered.length
  };
};

export const createPost = async (post: Post) => {
  console.log("Deepmind: Attempting to create post", post.id);

  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      // Safety check: ensure tables exist before first write
      await initTursoDB();

      await client.execute({
        sql: `INSERT OR REPLACE INTO blog_posts (id, title, content, image, video, category, isVisible, date) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [post.id, post.title, post.content, post.image, post.video || null, post.category, post.isVisible ? 1 : 0, post.date]
      });
      console.log("Deepmind: Post successfully saved to Turso Cloud");
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create post in Turso Cloud:", e);
      // If table missing or connection error, we'll try local fallback
      // but only set dbConnectionFailed if it looks like a permanent connection issue
      if (e instanceof Error && (e.message.includes('connect') || e.message.includes('auth') || e.message.includes('fetch'))) {
        dbConnectionFailed = true;
      }
    }
  }

  console.log("Deepmind: Falling back to LocalStorage for post:", post.id);
  try {
    const allPosts = getAllPostsLocal();
    const index = allPosts.findIndex(p => p.id === post.id);
    if (index !== -1) {
      allPosts[index] = post;
    } else {
      allPosts.unshift(post);
    }

    const data = JSON.stringify(allPosts);
    localStorage.setItem(STORAGE_KEY, data);
    console.log("Deepmind: Post saved to LocalStorage (Size:", (data.length / 1024).toFixed(2), "KB)");
  } catch (error: unknown) {
    console.error("Deepmind: CRITICAL - Failed to save to LocalStorage (likely quota exceeded):", error);
    if (error instanceof Error && (error.name === 'QuotaExceededError' || error.message?.includes('quota'))) {
      throw new Error("Local Storage Full. The image is too large even after compression. Please verify Turso connection or clear some space.");
    }
    throw new Error("Failed to save post. " + (error instanceof Error ? error.message : "Unknown storage error"));
  }
};


export const updatePost = async (updatedPost: Partial<Post> & { id: string }) => {
  console.log("Updating post", updatedPost);

  // ALWAYS update local storage to keep sync
  const allPosts = getAllPostsLocal();
  const index = allPosts.findIndex(p => p.id === updatedPost.id);
  if (index !== -1) {
    allPosts[index] = { ...allPosts[index], ...updatedPost } as Post;
    savePostsLocal(allPosts);
  }

  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const sets: string[] = [];
      const args: (string | number | boolean | null)[] = [];

      Object.entries(updatedPost).forEach(([key, value]) => {
        if (key !== 'id') {
          sets.push(`${key} = ?`);
          args.push(key === 'isVisible' ? (value ? 1 : 0) : value);
        }
      });

      args.push(updatedPost.id);
      await client.execute({
        sql: `UPDATE blog_posts SET ${sets.join(', ')} WHERE id = ?`,
        args
      });
      return;
    } catch (e) {
      console.error("Failed to update post in Turso:", e);
      dbConnectionFailed = true;
    }
  }
};

export const deletePost = async (id: string) => {
  console.log("Deleting post", id);

  // ALWAYS delete from local storage to prevent it resurfacing
  const allPosts = getAllPostsLocal();
  savePostsLocal(allPosts.filter(p => p.id !== id));

  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `DELETE FROM blog_posts WHERE id = ?`,
        args: [id]
      });
      return;
    } catch (e) {
      console.error("Failed to delete post in Turso:", e);
      dbConnectionFailed = true;
    }
  }
};

export const togglePostVisibility = async (id: string, isVisible: boolean) => {
  console.log("Toggling post visibility", id, isVisible);

  // ALWAYS update local storage to keep sync
  const allPosts = getAllPostsLocal();
  const index = allPosts.findIndex(p => p.id === id);
  if (index !== -1) {
    allPosts[index].isVisible = isVisible;
    savePostsLocal(allPosts);
  }

  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `UPDATE blog_posts SET isVisible = ? WHERE id = ?`,
        args: [isVisible ? 1 : 0, id]
      });
      return;
    } catch (e) {
      console.error("Failed to toggle visibility in Turso:", e);
      dbConnectionFailed = true;
    }
  }
};

export const getCategories = async () => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute("SELECT DISTINCT category FROM blog_posts WHERE isVisible = 1");
      const tursoCategories = new Set(result.rows.map((row: any) => row.category as string).filter(Boolean));

      // Merge with local categories
      const localPosts = getAllPostsLocal();
      localPosts.forEach(p => {
        if (p.isVisible && p.category) {
          tursoCategories.add(p.category);
        }
      });

      return Array.from(tursoCategories).sort();
    } catch (e) {
      console.error("Failed to get categories from Turso:", e);
      // Fallback to local only if Turso completely fails
    }
  }

  const allPosts = getAllPostsLocal();
  const categories = new Set(allPosts.map(p => p.category).filter(Boolean));
  return Array.from(categories) as string[];
};

export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/-+/g, '-')      // Replace multiple - with single -
    .trim() + '-' + Date.now().toString().slice(-6); // Add unique suffix
};

export const getPostById = async (id: string) => {
  // 1. Try Turso if configured
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM blog_posts WHERE id = ?",
        args: [id]
      });
      if (result.rows.length > 0) {
        const post = result.rows[0];
        return {
          ...post,
          isVisible: post.isVisible === 1
        } as unknown as Post;
      }
    } catch (e) {
      console.error("Failed to get post by ID from Turso:", e);
    }
  }

  // 2. Try LocalStorage
  const localPost = getAllPostsLocal().find(p => p.id === id);
  if (localPost) return localPost;

  return null;
};

export const getAdjacentPosts = async (currentPostId: string): Promise<{ prev: Post | null, next: Post | null }> => {
  // Fetch all posts to determine order
  // In a real large-scale app, we would use a specific SQL query with LIMIT 1 and WHERE date < current_date etc.
  // For now, fetching all headers is efficient enough.
  const { posts } = await getPosts({ limit: 1000 }); // Assuming < 1000 posts for now

  const currentIndex = posts.findIndex(p => p.id === currentPostId);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  // List is sorted DESC (Newest first)
  // Next post (newer) is at index - 1
  // Prev post (older) is at index + 1
  const nextPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const prevPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;

  return { prev: prevPost, next: nextPost };
};

// --- WEBINAR OPERATIONS ---

export const getWebinars = async () => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute("SELECT * FROM webinars ORDER BY date DESC");
      return result.rows as unknown as Webinar[];
    } catch (e) {
      console.error("Failed to get webinars from Turso:", e);
      return [];
    }
  }

  // Local fallback (mock data removed)
  return [] as Webinar[];
};

export const createWebinar = async (webinar: Webinar) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT INTO webinars (id, title, instructor, date, time, duration, participants, maxParticipants, description, status) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          webinar.id, webinar.title, webinar.instructor, webinar.date,
          webinar.time, webinar.duration, webinar.participants,
          webinar.maxParticipants, webinar.description, webinar.status
        ]
      });
    } catch (e) {
      console.error("Failed to create webinar in Turso:", e);
    }
  } else {
    // Local fallback
    const webinars = await getWebinars();
    webinars.push(webinar);
    // In a real local app, we'd need to save this somewhere to persist reload
    // But since getWebinars returns a static array for local, we can't easily persist without a KEY
    // Let's add the KEY back near the bottom if needed or assume in-memory for this session
    // Actually, we should use localStorage if we want persistence
    // But getWebinars logic for local was just "return [...]"
    // So we need to update getWebinars too if we want persistence.
    // For now, let's just log or no-op given the existing code structure limitation
    console.log("Webinar created (local fallback):", webinar);
  }
};

export const updateWebinar = async (updated: Webinar) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      // Add update logic
      await client.execute({
        sql: `UPDATE webinars SET title=?, instructor=?, date=?, time=?, duration=?, participants=?, maxParticipants=?, description=?, status=? WHERE id=?`,
        args: [updated.title, updated.instructor, updated.date, updated.time, updated.duration, updated.participants, updated.maxParticipants, updated.description, updated.status, updated.id]
      });
    } catch (e) {
      console.error("Failed to update webinar in Turso:", e);
    }
  }
};

export const deleteWebinar = async (id: string) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `DELETE FROM webinars WHERE id = ?`,
        args: [id]
      });
    } catch (e) {
      console.error("Failed to delete webinar in Turso:", e);
    }
  }
};

// --- APPLICATION OPERATIONS ---

export const getApplications = async () => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute("SELECT * FROM applications ORDER BY appliedAt DESC");
      return result.rows as unknown as Application[];
    } catch (e) {
      console.error("Failed to get applications from Turso:", e);
      return [];
    }
  }
  return [] as Application[]; // Default to empty for local
};

export const createApplication = async (app: Omit<Application, 'id' | 'appliedAt' | 'status'>) => {
  const newApp: Application = {
    ...app,
    id: Date.now().toString(),
    appliedAt: new Date().toISOString(),
    status: 'pending'
  };

  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT INTO applications (id, name, email, phone, course, type, status, appliedAt) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [newApp.id, newApp.name, newApp.email, newApp.phone, newApp.course, newApp.type, newApp.status, newApp.appliedAt]
      });
    } catch (e) {
      console.error("Failed to create application in Turso:", e);
    }
  }
  return newApp;
};

export const updateApplicationStatus = async (id: string, status: 'approved' | 'rejected') => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: "UPDATE applications SET status = ? WHERE id = ?",
        args: [status, id]
      });
    } catch (e) {
      console.error("Failed to update application status in Turso:", e);
    }
  }
};

export const testConnection = async () => {
  console.log("Deepmind: Starting Connection Diagnostic...");
  if (!isTursoConfigured) return { success: false, message: "VITE environment variables missing or invalid." };
  if (!client) return { success: false, message: "LibSQL client failed to initialize." };

  try {
    const start = Date.now();
    await client.execute("SELECT 1");
    const latency = Date.now() - start;

    // Check tables
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.rows.map((r: any) => String(r.name));

    const diagnostics: { success: boolean; latency: string; tables: string[]; counts: Record<string, number> } = {
      success: true,
      latency: `${latency}ms`,
      tables: tableNames,
      counts: {}
    };

    // Safely get row counts for key tables
    if (tableNames.includes('blog_posts')) {
      const res = await client.execute("SELECT COUNT(*) as count FROM blog_posts");
      diagnostics.counts.blog_posts = Number(res.rows[0].count);
    }

    if (tableNames.includes('mock_tests')) {
      const res = await client.execute("SELECT COUNT(*) as count FROM mock_tests");
      diagnostics.counts.mock_tests = Number(res.rows[0].count);
    }

    return {
      ...diagnostics,
      message: "Successfully connected to Turso Cloud!"
    };
  } catch (e: unknown) {
    console.error("Deepmind: Diagnostic Failed:", e);
    return { success: false, message: e instanceof Error ? e.message : "Connection failed. Check network and tokens." };
  }
};

export const clearLocalFallback = () => {
  localStorage.removeItem(STORAGE_KEY);
  console.log("Deepmind: Local fallback storage cleared.");
};

export const syncSampleCourses = async () => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      // Check if courses table is empty
      const countRes = await client.execute("SELECT COUNT(*) as count FROM courses");
      const count = Number(countRes.rows[0].count);
      if (count > 0) {
        // Force-update standard courses to visible
        await client.execute("UPDATE courses SET isVisible = 1 WHERE id IN ('data-science-machine-learning', 'artificial-intelligence-generative-ai', 'full-stack-java-development', 'devops-cloud-technologies')");
        return;
      }

      console.log("Deepmind: Syncing sample courses with full detail data...");
      const sampleCourses: any[] = [
        {
          id: 'data-science-machine-learning',
          title: 'Data Science & Machine Learning',
          subtitle: 'Unlock Insights from Data & Build Predictive Models',
          description: 'Master data analysis, machine learning algorithms, and AI implementation with our comprehensive Data Science course in Hyderabad. This program is designed for aspiring data scientists looking for the best AI training institute in KPHB.',
          image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=800',
          duration: '6 months',
          placement: '95%',
          students: '150+',
          rating: 4.9,
          level: 'Intermediate',
          skills: JSON.stringify(['Python', 'TensorFlow', 'Pandas', 'Scikit-learn', 'NumPy', 'Matplotlib', 'Jupyter', 'SQL', 'Git']),
          modules: JSON.stringify(['Python Programming Fundamentals', 'Statistics and Probability for Data Science', 'Data Manipulation with Pandas & NumPy', 'Data Visualization with Matplotlib, Seaborn & Plotly', 'Supervised Machine Learning Algorithms', 'Unsupervised Learning and Clustering', 'Deep Learning with TensorFlow & Keras', 'Natural Language Processing (NLP) Basics', 'Model Evaluation, Optimization & Deployment', 'Capstone Project: Real-world Data Science Application']),
          outcomes: JSON.stringify(['Build end-to-end machine learning pipelines', 'Implement deep learning models for various applications', 'Create interactive data visualizations and dashboards', 'Deploy ML models to production environments', 'Apply AI solutions to complex business problems', 'Interpret and communicate data-driven insights effectively']),
          prerequisites: JSON.stringify(['Basic programming knowledge (Python preferred)', 'High school level mathematics (algebra, basic calculus)', 'Familiarity with basic statistics concepts']),
          career: JSON.stringify(['Data Scientist', 'Machine Learning Engineer', 'AI/ML Engineer', 'Data Analyst', 'Business Intelligence Developer']),
          isVisible: true
        },
        {
          id: 'artificial-intelligence-generative-ai',
          title: 'Artificial Intelligence & Generative AI',
          subtitle: 'Innovate with AI-Powered Content and Intelligent Systems',
          description: 'Deep dive into advanced AI concepts with our Generative AI course in India. This online and classroom training in Hyderabad covers neural networks and cutting-edge generative models to build intelligent systems.',
          image: 'https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg?auto=compress&cs=tinysrgb&w=800',
          duration: '6 months',
          placement: '98%',
          students: '200+',
          rating: 4.8,
          level: 'Advanced',
          skills: JSON.stringify(['Python', 'PyTorch', 'TensorFlow', 'Keras', 'Hugging Face', 'GANs', 'VAEs', 'Diffusion Models', 'NLP']),
          modules: JSON.stringify(['Introduction to AI & Deep Learning', 'Advanced Neural Network Architectures', 'Generative Adversarial Networks (GANs)', 'Variational Autoencoders (VAEs)', 'Diffusion Models for Image & Video Generation', 'Large Language Models (LLMs) & Transformers', 'Prompt Engineering & Fine-tuning LLMs', 'Ethical AI & Bias in Generative Models', 'Deployment of Generative AI Solutions', 'Final Project: Building a Generative AI Application']),
          outcomes: JSON.stringify(['Design and implement state-of-the-art AI systems', 'Generate high-quality images, text, and other creative content', 'Master prompt engineering for optimal AI performance', 'Understand and mitigate ethical biases in AI models', 'Deploy advanced AI models to production environments', 'Contribute to innovative AI research and development']),
          prerequisites: JSON.stringify(['Strong Python programming skills', 'Familiarity with basic machine learning concepts', 'Understanding of linear algebra and calculus']),
          career: JSON.stringify(['AI Engineer', 'Generative AI Specialist', 'Machine Learning Researcher', 'Prompt Engineer', 'Computer Vision Engineer (Generative)']),
          isVisible: true
        },
        {
          id: 'full-stack-java-development',
          title: 'Full Stack Java Development',
          subtitle: 'Become a Versatile Java Developer for Web & Enterprise',
          description: 'Enroll in our Full Stack Developer course in India to build robust web applications from frontend to backend. This program in Hyderabad covers Java, Spring Boot, and modern frontend technologies to make you a job-ready developer.',
          image: '/java.png',
          duration: '6 months',
          placement: '92%',
          students: '120+',
          rating: 4.7,
          level: 'Intermediate',
          skills: JSON.stringify(['Java', 'Spring Boot', 'Spring MVC', 'Hibernate', 'SQL', 'React/Angular', 'JavaScript', 'REST APIs', 'Git', 'Maven/Gradle']),
          modules: JSON.stringify(['Java Core & OOP', 'Data Structures & Algorithms in Java', 'SQL & Database Management (MySQL/PostgreSQL)', 'Spring Framework (Core, MVC, Security)', 'Spring Boot & Microservices', 'RESTful API Development', 'Frontend Development (HTML, CSS, JavaScript, React/Angular)', 'Version Control with Git', 'Deployment to Cloud (e.g., AWS EC2/Elastic Beanstalk)', 'Full Stack Capstone Project']),
          outcomes: JSON.stringify(['Develop scalable backend services with Spring Boot', 'Build dynamic and responsive frontend user interfaces', 'Design and manage relational databases', 'Implement secure and robust authentication/authorization', 'Deploy full-stack applications to cloud platforms', 'Work effectively in Agile development environments']),
          prerequisites: JSON.stringify(['Basic programming knowledge (any language)', 'Understanding of web concepts (HTTP, client-server)', 'Eagerness to learn both frontend and backend']),
          career: JSON.stringify(['Full Stack Java Developer', 'Backend Java Developer', 'Software Engineer (Java)', 'Spring Boot Developer', 'Enterprise Application Developer']),
          isVisible: true
        },
        {
          id: 'devops-cloud-technologies',
          title: 'DevOps & Cloud Technologies',
          subtitle: 'Streamline Software Delivery with Cloud & Automation',
          description: 'Our DevOps & Cloud training helps you master cloud infrastructure, CI/CD pipelines, and deployment strategies. Learn how to become a DevOps engineer with hands-on training on AWS, Azure, and other cloud computing certification tools in Hyderabad.',
          image: '/Devops.png',
          duration: '6 months',
          placement: '96%',
          students: '180+',
          rating: 4.8,
          level: 'Intermediate',
          skills: JSON.stringify(['AWS', 'Azure/GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform', 'Ansible', 'Git', 'Linux', 'Shell Scripting']),
          modules: JSON.stringify(['Linux Fundamentals & Shell Scripting', 'Introduction to Cloud Computing (AWS Focus)', 'Infrastructure as Code (IaC) with Terraform', 'Containerization with Docker', 'Container Orchestration with Kubernetes', 'CI/CD Pipelines with Jenkins/GitLab CI/GitHub Actions', 'Monitoring and Logging (Prometheus, Grafana, ELK Stack)', 'Networking in Cloud', 'Security in DevOps', 'Project: Deploying a Scalable Application']),
          outcomes: JSON.stringify(['Automate software build, test, and deployment processes', 'Manage and scale cloud infrastructure efficiently', 'Implement robust CI/CD pipelines', 'Containerize and orchestrate applications', 'Monitor and troubleshoot cloud-native applications', 'Apply security best practices in a DevOps workflow']),
          prerequisites: JSON.stringify(['Basic understanding of IT operations', 'Familiarity with command line interfaces', 'Some programming experience is beneficial']),
          career: JSON.stringify(['DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer (SRE)', 'Cloud Architect', 'Automation Engineer']),
          isVisible: true
        },
        {
          id: 'python-programming',
          title: 'Python Programming',
          subtitle: 'Master the Versatile Language for Data, Web & Automation',
          description: 'Master Python fundamentals with our dedicated Python for AI course. This program is perfect for beginners and professionals in Hyderabad looking to build a strong foundation for data analysis, web development, and automation.',
          image: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=800',
          duration: '6 months',
          placement: '90%',
          students: '250+',
          rating: 4.7,
          level: 'Beginner',
          skills: JSON.stringify(['Python', 'OOP', 'Data Structures', 'Flask/Django (basics)', 'Pandas (basics)', 'API usage', 'Git']),
          modules: JSON.stringify(['Python Basics & Syntax', 'Data Types & Data Structures', 'Control Flow & Functions', 'Object-Oriented Programming (OOP) in Python', 'File Handling & Error Handling', 'Modules, Packages & Pip', 'Introduction to Web Development with Flask/Django', 'Data Manipulation with Pandas (Intro)', 'Automation & Scripting', 'Final Mini-Projects']),
          outcomes: JSON.stringify(['Write clean, efficient, and well-structured Python code', 'Automate repetitive tasks with Python scripts', 'Develop basic web applications', 'Perform data manipulation and analysis', 'Solve algorithmic problems using Python', 'Build a strong foundation for advanced Python careers']),
          prerequisites: JSON.stringify(['No prior programming experience required', 'Basic computer literacy']),
          career: JSON.stringify(['Python Developer', 'Automation Engineer', 'Junior Data Analyst', 'Web Developer (Python)', 'Software Engineer (Entry-Level)']),
          isVisible: true
        },
        {
          id: 'software-testing-manual-automation',
          title: 'Software Testing (Manual + Automation)',
          subtitle: 'Ensure Quality & Reliability in Software Products',
          description: 'Master software testing with our comprehensive course covering manual and automation frameworks. This training in KPHB, Hyderabad, prepares you for a successful career in quality assurance with hands-on experience.',
          image: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=800',
          duration: '6 months',
          placement: '91%',
          students: '140+',
          rating: 4.5,
          level: 'Intermediate',
          skills: JSON.stringify(['Manual Testing', 'Test Case Design', 'Selenium', 'Jira', 'Agile', 'API Testing', 'Java/Python (for automation)', 'SQL']),
          modules: JSON.stringify(['Software Development Life Cycle (SDLC) & STLC', 'Manual Testing Fundamentals (Types, Techniques)', 'Test Case Design & Execution', 'Defect Reporting & Management (Jira)', 'Agile Testing Principles', 'Introduction to Automation Testing', 'Selenium WebDriver with Java/Python', 'TestNG/Pytest Frameworks', 'API Testing with Postman/Rest Assured', 'Performance Testing Basics (JMeter)']),
          outcomes: JSON.stringify(['Design comprehensive test plans and strategies', 'Execute manual tests and report defects effectively', 'Automate web and API test cases using industry tools', 'Participate in Agile development cycles as a QA', 'Ensure high-quality software releases', 'Understand different types of software testing']),
          prerequisites: JSON.stringify(['Basic computer knowledge and analytical skills', 'Familiarity with web applications is a plus', 'No prior coding experience required for manual section']),
          career: JSON.stringify(['QA Engineer', 'Manual Tester', 'Automation Test Engineer', 'Software Test Lead', 'Performance Tester']),
          isVisible: true
        },
        {
          id: 'sap-data-processing',
          title: 'SAP (Systems, Applications, and Products in Data Processing)',
          subtitle: 'Master Enterprise Resource Planning with SAP Solutions',
          description: 'Learn enterprise resource planning with our expert-led SAP training in Hyderabad. This course covers key SAP modules, business process optimization, and implementation strategies for various industries.',
          image: 'https://images.pexels.com/photos/1181316/pexels-photo-1181316.jpeg?auto=compress&cs=tinysrgb&w=800',
          duration: '6 months',
          placement: '94%',
          students: '90+',
          rating: 4.6,
          level: 'Professional',
          skills: JSON.stringify(['SAP HANA', 'ABAP', 'Fiori', 'S/4HANA', 'ERP Concepts', 'SAP Modules (FI, CO, MM, SD)', 'Business Process Optimization']),
          modules: JSON.stringify(['Introduction to SAP & ERP Concepts', 'SAP ABAP Programming (Fundamentals)', 'SAP Financial Accounting (FI)', 'SAP Controlling (CO)', 'SAP Materials Management (MM)', 'SAP Sales and Distribution (SD)', 'SAP HANA Overview', 'SAP Fiori & UI5 Basics', 'SAP Implementation Methodologies (ASAP/Activate)', 'Case Study & Project']),
          outcomes: JSON.stringify(['Navigate and operate within the SAP system', 'Understand key SAP modules and their integration', 'Develop custom reports and programs using ABAP', 'Participate in SAP implementation and support projects', 'Optimize business processes using SAP functionalities', 'Gain expertise in a high-demand enterprise technology']),
          prerequisites: JSON.stringify(['Basic understanding of business processes', 'Familiarity with IT systems is beneficial', 'No prior SAP experience required']),
          career: JSON.stringify(['SAP Consultant (Functional/Technical)', 'SAP Analyst', 'ERP Specialist', 'SAP Business Process Analyst', 'SAP Basis Administrator (Entry-Level)']),
          isVisible: true
        }
      ];

      for (const course of sampleCourses) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO courses 
                (id, title, subtitle, description, image, duration, placement, students, rating, level, skills, modules, outcomes, prerequisites, career, curriculum, isVisible) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            course.id, course.title, course.subtitle, course.description,
            course.image, course.duration, course.placement, course.students,
            course.rating, course.level, course.skills, course.modules,
            course.outcomes, course.prerequisites, course.career, course.curriculum || null,
            course.isVisible ? 1 : 0
          ]
        });
      }
      console.log("Deepmind: Sample courses synced successfully with full detail data");
    } catch (e) {
      console.error("Deepmind: Failed to sync sample courses:", e);
    }
  }
};

export const initBlogDB = initTursoDB; // Alias for backward compatibility

// --- COURSE OPERATIONS ---

export const getCourses = async (includeHidden: boolean = false): Promise<Course[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await initTursoDB();
      const query = includeHidden 
        ? "SELECT * FROM courses ORDER BY title ASC" 
        : "SELECT * FROM courses WHERE isVisible = 1 ORDER BY title ASC";
      
      const result = await client.execute(query);
      return result.rows.map((row: any) => ({
        id: row.id as string,
        title: row.title as string,
        subtitle: (row.subtitle as string) || '',
        description: row.description as string,
        image: row.image as string,
        duration: row.duration as string,
        placement: (row.placement as string) || '',
        students: row.students as string,
        rating: Number(row.rating),
        level: row.level as string,
        skills: row.skills as string,
        modules: (row.modules as string) || '[]',
        outcomes: (row.outcomes as string) || '[]',
        prerequisites: (row.prerequisites as string) || '[]',
        career: (row.career as string) || '[]',
        curriculum: row.curriculum as string | undefined,
        isVisible: row.isVisible === 1
      })) as unknown as Course[];
    } catch (e) {
      console.error("Deepmind: Failed to get courses from Turso:", e);
    }
  }
  
  try {
    const local = localStorage.getItem('cynexai_local_courses');
    if (local) {
      const parsed = JSON.parse(local) as Course[];
      return includeHidden ? parsed : parsed.filter(c => c.isVisible);
    }
    const sampleCourses = [
      {
        id: 'data-science-machine-learning',
        title: 'Data Science & Machine Learning',
        subtitle: 'Unlock Insights from Data & Build Predictive Models',
        description: 'Master data analysis, machine learning algorithms, and AI implementation with our comprehensive Data Science course in Hyderabad. This program is designed for aspiring data scientists looking for the best AI training institute in KPHB.',
        image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=800',
        duration: '6 months',
        placement: '95%',
        students: '150+',
        rating: 4.9,
        level: 'Intermediate',
        skills: JSON.stringify(['Python', 'TensorFlow', 'Pandas', 'Scikit-learn', 'NumPy', 'Matplotlib', 'Jupyter', 'SQL', 'Git']),
        modules: JSON.stringify(['Python Programming Fundamentals', 'Statistics and Probability for Data Science', 'Data Manipulation with Pandas & NumPy', 'Data Visualization with Matplotlib, Seaborn & Plotly', 'Supervised Machine Learning Algorithms', 'Unsupervised Learning and Clustering', 'Deep Learning with TensorFlow & Keras', 'Natural Language Processing (NLP) Basics', 'Model Evaluation, Optimization & Deployment', 'Capstone Project: Real-world Data Science Application']),
        outcomes: JSON.stringify(['Build end-to-end machine learning pipelines', 'Implement deep learning models for various applications', 'Create interactive data visualizations and dashboards', 'Deploy ML models to production environments', 'Apply AI solutions to complex business problems', 'Interpret and communicate data-driven insights effectively']),
        prerequisites: JSON.stringify(['Basic programming knowledge (Python preferred)', 'High school level mathematics (algebra, basic calculus)', 'Familiarity with basic statistics concepts']),
        career: JSON.stringify(['Data Scientist', 'Machine Learning Engineer', 'AI/ML Engineer', 'Data Analyst', 'Business Intelligence Developer']),
        isVisible: true
      },
      {
        id: 'artificial-intelligence-generative-ai',
        title: 'Artificial Intelligence & Generative AI',
        subtitle: 'Innovate with AI-Powered Content and Intelligent Systems',
        description: 'Deep dive into advanced AI concepts with our Generative AI course in India. This online and classroom training in Hyderabad covers neural networks and cutting-edge generative models to build intelligent systems.',
        image: 'https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg?auto=compress&cs=tinysrgb&w=800',
        duration: '6 months',
        placement: '98%',
        students: '200+',
        rating: 4.8,
        level: 'Advanced',
        skills: JSON.stringify(['Python', 'PyTorch', 'TensorFlow', 'Keras', 'Hugging Face', 'GANs', 'VAEs', 'Diffusion Models', 'NLP']),
        modules: JSON.stringify(['Introduction to AI & Deep Learning', 'Advanced Neural Network Architectures', 'Generative Adversarial Networks (GANs)', 'Variational Autoencoders (VAEs)', 'Diffusion Models for Image & Video Generation', 'Large Language Models (LLMs) & Transformers', 'Prompt Engineering & Fine-tuning LLMs', 'Ethical AI & Bias in Generative Models', 'Deployment of Generative AI Solutions', 'Final Project: Building a Generative AI Application']),
        outcomes: JSON.stringify(['Design and implement state-of-the-art AI systems', 'Generate high-quality images, text, and other creative content', 'Master prompt engineering for optimal AI performance', 'Understand and mitigate ethical biases in AI models', 'Deploy advanced AI models to production environments', 'Contribute to innovative AI research and development']),
        prerequisites: JSON.stringify(['Strong Python programming skills', 'Familiarity with basic machine learning concepts', 'Understanding of linear algebra and calculus']),
        career: JSON.stringify(['AI Engineer', 'Generative AI Specialist', 'Machine Learning Researcher', 'Prompt Engineer', 'Computer Vision Engineer (Generative)']),
        isVisible: true
      },
      {
        id: 'full-stack-java-development',
        title: 'Full Stack Java Development',
        subtitle: 'Become a Versatile Java Developer for Web & Enterprise',
        description: 'Enroll in our Full Stack Developer course in India to build robust web applications from frontend to backend. This program in Hyderabad covers Java, Spring Boot, and modern frontend technologies to make you a job-ready developer.',
        image: '/java.png',
        duration: '6 months',
        placement: '92%',
        students: '120+',
        rating: 4.7,
        level: 'Intermediate',
        skills: JSON.stringify(['Java', 'Spring Boot', 'Spring MVC', 'Hibernate', 'SQL', 'React/Angular', 'JavaScript', 'REST APIs', 'Git', 'Maven/Gradle']),
        modules: JSON.stringify(['Java Core & OOP', 'Data Structures & Algorithms in Java', 'SQL & Database Management (MySQL/PostgreSQL)', 'Spring Framework (Core, MVC, Security)', 'Spring Boot & Microservices', 'RESTful API Development', 'Frontend Development (HTML, CSS, JavaScript, React/Angular)', 'Version Control with Git', 'Deployment to Cloud (e.g., AWS EC2/Elastic Beanstalk)', 'Full Stack Capstone Project']),
        outcomes: JSON.stringify(['Develop scalable backend services with Spring Boot', 'Build dynamic and responsive frontend user interfaces', 'Design and manage relational databases', 'Implement secure and robust authentication/authorization', 'Deploy full-stack applications to cloud platforms', 'Work effectively in Agile development environments']),
        prerequisites: JSON.stringify(['Basic programming knowledge (any language)', 'Understanding of web concepts (HTTP, client-server)', 'Eagerness to learn both frontend and backend']),
        career: JSON.stringify(['Full Stack Java Developer', 'Backend Java Developer', 'Software Engineer (Java)', 'Spring Boot Developer', 'Enterprise Application Developer']),
        isVisible: true
      },
      {
        id: 'devops-cloud-technologies',
        title: 'DevOps & Cloud Technologies',
        subtitle: 'Streamline Software Delivery with Cloud & Automation',
        description: 'Our DevOps & Cloud training helps you master cloud infrastructure, CI/CD pipelines, and deployment strategies. Learn how to become a DevOps engineer with hands-on training on AWS, Azure, and other cloud computing certification tools in Hyderabad.',
        image: '/Devops.png',
        duration: '6 months',
        placement: '96%',
        students: '180+',
        rating: 4.8,
        level: 'Intermediate',
        skills: JSON.stringify(['AWS', 'Azure/GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform', 'Ansible', 'Git', 'Linux', 'Shell Scripting']),
        modules: JSON.stringify(['Linux Fundamentals & Shell Scripting', 'Introduction to Cloud Computing (AWS Focus)', 'Infrastructure as Code (IaC) with Terraform', 'Containerization with Docker', 'Container Orchestration with Kubernetes', 'CI/CD Pipelines with Jenkins/GitLab CI/GitHub Actions', 'Monitoring and Logging (Prometheus, Grafana, ELK Stack)', 'Networking in Cloud', 'Security in DevOps', 'Project: Deploying a Scalable Application']),
        outcomes: JSON.stringify(['Automate software build, test, and deployment processes', 'Manage and scale cloud infrastructure efficiently', 'Implement robust CI/CD pipelines', 'Containerize and orchestrate applications', 'Monitor and troubleshoot cloud-native applications', 'Apply security best practices in a DevOps workflow']),
        prerequisites: JSON.stringify(['Basic understanding of IT operations', 'Familiarity with command line interfaces', 'Some programming experience is beneficial']),
        career: JSON.stringify(['DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer (SRE)', 'Cloud Architect', 'Automation Engineer']),
        isVisible: true
      },
      {
        id: 'python-programming',
        title: 'Python Programming',
        subtitle: 'Master the Versatile Language for Data, Web & Automation',
        description: 'Master Python fundamentals with our dedicated Python for AI course. This program is perfect for beginners and professionals in Hyderabad looking to build a strong foundation for data analysis, web development, and automation.',
        image: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=800',
        duration: '6 months',
        placement: '90%',
        students: '250+',
        rating: 4.7,
        level: 'Beginner',
        skills: JSON.stringify(['Python', 'OOP', 'Data Structures', 'Flask/Django (basics)', 'Pandas (basics)', 'API usage', 'Git']),
        modules: JSON.stringify(['Python Basics & Syntax', 'Data Types & Data Structures', 'Control Flow & Functions', 'Object-Oriented Programming (OOP) in Python', 'File Handling & Error Handling', 'Modules, Packages & Pip', 'Introduction to Web Development with Flask/Django', 'Data Manipulation with Pandas (Intro)', 'Automation & Scripting', 'Final Mini-Projects']),
        outcomes: JSON.stringify(['Write clean, efficient, and well-structured Python code', 'Automate repetitive tasks with Python scripts', 'Develop basic web applications', 'Perform data manipulation and analysis', 'Solve algorithmic problems using Python', 'Build a strong foundation for advanced Python careers']),
        prerequisites: JSON.stringify(['No prior programming experience required', 'Basic computer literacy']),
        career: JSON.stringify(['Python Developer', 'Automation Engineer', 'Junior Data Analyst', 'Web Developer (Python)', 'Software Engineer (Entry-Level)']),
        isVisible: true
      },
      {
        id: 'software-testing-manual-automation',
        title: 'Software Testing (Manual + Automation)',
        subtitle: 'Ensure Quality & Reliability in Software Products',
        description: 'Master software testing with our comprehensive course covering manual and automation frameworks. This training in KPHB, Hyderabad, prepares you for a successful career in quality assurance with hands-on experience.',
        image: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=800',
        duration: '6 months',
        placement: '91%',
        students: '140+',
        rating: 4.5,
        level: 'Intermediate',
        skills: JSON.stringify(['Manual Testing', 'Test Case Design', 'Selenium', 'Jira', 'Agile', 'API Testing', 'Java/Python (for automation)', 'SQL']),
        modules: JSON.stringify(['Software Development Life Cycle (SDLC) & STLC', 'Manual Testing Fundamentals (Types, Techniques)', 'Test Case Design & Execution', 'Defect Reporting & Management (Jira)', 'Agile Testing Principles', 'Introduction to Automation Testing', 'Selenium WebDriver with Java/Python', 'TestNG/Pytest Frameworks', 'API Testing with Postman/Rest Assured', 'Performance Testing Basics (JMeter)']),
        outcomes: JSON.stringify(['Design comprehensive test plans and strategies', 'Execute manual tests and report defects effectively', 'Automate web and API test cases using industry tools', 'Participate in Agile development cycles as a QA', 'Ensure high-quality software releases', 'Understand different types of software testing']),
        prerequisites: JSON.stringify(['Basic computer knowledge and analytical skills', 'Familiarity with web applications is a plus', 'No prior coding experience required for manual section']),
        career: JSON.stringify(['QA Engineer', 'Manual Tester', 'Automation Test Engineer', 'Software Test Lead', 'Performance Tester']),
        isVisible: true
      },
      {
        id: 'sap-data-processing',
        title: 'SAP (Systems, Applications, and Products in Data Processing)',
        subtitle: 'Master Enterprise Resource Planning with SAP Solutions',
        description: 'Learn enterprise resource planning with our expert-led SAP training in Hyderabad. This course covers key SAP modules, business process optimization, and implementation strategies for various industries.',
        image: 'https://images.pexels.com/photos/1181316/pexels-photo-1181316.jpeg?auto=compress&cs=tinysrgb&w=800',
        duration: '6 months',
        placement: '94%',
        students: '90+',
        rating: 4.6,
        level: 'Professional',
        skills: JSON.stringify(['SAP HANA', 'ABAP', 'Fiori', 'S/4HANA', 'ERP Concepts', 'SAP Modules (FI, CO, MM, SD)', 'Business Process Optimization']),
        modules: JSON.stringify(['Introduction to SAP & ERP Concepts', 'SAP ABAP Programming (Fundamentals)', 'SAP Financial Accounting (FI)', 'SAP Controlling (CO)', 'SAP Materials Management (MM)', 'SAP Sales and Distribution (SD)', 'SAP HANA Overview', 'SAP Fiori & UI5 Basics', 'SAP Implementation Methodologies (ASAP/Activate)', 'Case Study & Project']),
        outcomes: JSON.stringify(['Navigate and operate within the SAP system', 'Understand key SAP modules and their integration', 'Develop custom reports and programs using ABAP', 'Participate in SAP implementation and support projects', 'Optimize business processes using SAP functionalities', 'Gain expertise in a high-demand enterprise technology']),
        prerequisites: JSON.stringify(['Basic understanding of business processes', 'Familiarity with IT systems is beneficial', 'No prior SAP experience required']),
        career: JSON.stringify(['SAP Consultant (Functional/Technical)', 'SAP Analyst', 'ERP Specialist', 'SAP Business Process Analyst', 'SAP Basis Administrator (Entry-Level)']),
        isVisible: true
      }
    ];
    localStorage.setItem('cynexai_local_courses', JSON.stringify(sampleCourses));
    return includeHidden ? sampleCourses : sampleCourses.filter(c => c.isVisible);
  } catch {
    return [];
  }
};

export const createCourse = async (course: Course) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await initTursoDB();
      await client.execute({
        sql: `INSERT OR REPLACE INTO courses 
              (id, title, subtitle, description, image, duration, placement, students, rating, level, skills, modules, outcomes, prerequisites, career, curriculum, isVisible) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          course.id,
          course.title,
          course.subtitle || '',
          course.description,
          course.image,
          course.duration,
          course.placement || '',
          course.students,
          course.rating,
          course.level,
          course.skills,
          course.modules || '[]',
          course.outcomes || '[]',
          course.prerequisites || '[]',
          course.career || '[]',
          course.curriculum || null,
          course.isVisible ? 1 : 0
        ]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create course in Turso:", e);
      throw e;
    }
  }
  try {
    const all = await getCourses(true);
    const index = all.findIndex(c => c.id === course.id);
    if (index !== -1) {
      all[index] = course;
    } else {
      all.push(course);
    }
    localStorage.setItem('cynexai_local_courses', JSON.stringify(all));
  } catch (e) {
    console.error("Deepmind: Failed to save course to localStorage", e);
  }
};

export const updateCourse = async (course: Partial<Course> & { id: string }) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const sets: string[] = [];
      const args: (string | number | null)[] = [];

      Object.entries(course).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          sets.push(`${key} = ?`);
          args.push(key === 'isVisible' ? (value ? 1 : 0) : (value === null ? null : value as string | number | null));
        }
      });

      args.push(course.id);
      await client.execute({
        sql: `UPDATE courses SET ${sets.join(', ')} WHERE id = ?`,
        args
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to update course in Turso:", e);
      throw e;
    }
  }
  try {
    const all = await getCourses(true);
    const index = all.findIndex(c => c.id === course.id);
    if (index !== -1) {
      all[index] = { ...all[index], ...course };
      localStorage.setItem('cynexai_local_courses', JSON.stringify(all));
    }
  } catch (e) {
    console.error("Deepmind: Failed to update course in localStorage", e);
  }
};

export const deleteCourse = async (id: string) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: "DELETE FROM courses WHERE id = ?",
        args: [id]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to delete course in Turso:", e);
      throw e;
    }
  }
  try {
    const all = await getCourses(true);
    const filtered = all.filter(c => c.id !== id);
    localStorage.setItem('cynexai_local_courses', JSON.stringify(filtered));
  } catch (e) {
    console.error("Deepmind: Failed to delete course in localStorage", e);
  }
};

export const toggleCourseVisibility = async (id: string, isVisible: boolean) => {
  return updateCourse({ id, isVisible });
};

const syncSampleLMSData = async () => {
  if (isTursoConfigured && client) {
    try {
      // Seed Jobs
      const jobsCheck = await client.execute("SELECT count(*) as count FROM job_listings");
      if (Number(jobsCheck.rows[0].count) === 0) {
        const sampleJobs = [
          { id: 'job_1', title: 'AI Systems Architect', company: 'Google Deepmind', location: 'London, UK', salary: '$160k - $220k', type: 'Full-time', category: 'Artificial Intelligence' },
          { id: 'job_2', title: 'Senior Java Developer', company: 'Amazon', location: 'Hyderabad, IN', salary: '₹25 - 45 LPA', type: 'Full-time', category: 'Software Engineering' },
          { id: 'job_3', title: 'MLOps Engineer', company: 'OpenAI', location: 'San Francisco, CA', salary: '$180k - $250k', type: 'Remote', category: 'Data Science' },
          { id: 'job_4', title: 'Junior Frontend Engineer', company: 'CynexAI', location: 'Bangalore, IN', salary: '₹12 - 18 LPA', type: 'Hybrid', category: 'Web Development' }
        ];

        for (const job of sampleJobs) {
          await client.execute({
            sql: `INSERT INTO job_listings (id, title, company, location, salary, description, type, category, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [job.id, job.title, job.company, job.location, job.salary, 'Sample job description', job.type, job.category, new Date().toISOString()]
          });
        }
      }

      // Seed default badges and payments for student users
      const studentsResult = await client.execute("SELECT id FROM users WHERE role = 'student'");
      for (const s of studentsResult.rows) {
        const studentId = s.id as string;
        
        // Seed badges
        const badgesCheck = await client.execute({
          sql: "SELECT count(*) as count FROM badges WHERE student_id = ?",
          args: [studentId]
        });
        if (Number(badgesCheck.rows[0].count) === 0) {
          const sampleBadges = [
            { id: 'b1', title: 'Alpha Protocol', icon: 'Zap', color: 'text-yellow-400' },
            { id: 'b2', title: 'Code Vanguard', icon: 'Rocket', color: 'text-[#41c8df]' }
          ];
          for (const b of sampleBadges) {
            await client.execute({
              sql: "INSERT INTO badges (id, student_id, title, icon, color, unlocked_at) VALUES (?, ?, ?, ?, ?, ?)",
              args: [crypto.randomUUID(), studentId, b.title, b.icon, b.color, new Date().toISOString()]
            });
          }
        }

        // Seed payments / transaction history
        const paymentsCheck = await client.execute({
          sql: "SELECT count(*) as count FROM payments WHERE student_id = ?",
          args: [studentId]
        });
        if (Number(paymentsCheck.rows[0].count) === 0) {
          const samplePayments = [
            {
              id: 'pay_ref_' + crypto.randomUUID().substring(0, 8),
              total: 49999,
              paid: 15000,
              dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending'
            },
            {
              id: 'pay_ref_' + crypto.randomUUID().substring(0, 8),
              total: 49999,
              paid: 34999,
              dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'paid'
            }
          ];
          for (const p of samplePayments) {
            await client.execute({
              sql: `INSERT INTO payments (id, student_id, total_amount, amount_paid, due_date, status)
                    VALUES (?, ?, ?, ?, ?, ?)`,
              args: [p.id, studentId, p.total, p.paid, p.dueDate, p.status]
            });
          }
        }
      }

      // Seed sample lessons for courses
      const lessonsCountRes = await client.execute("SELECT COUNT(*) as count FROM lessons");
      const lessonsCount = Number(lessonsCountRes.rows[0].count);
      if (lessonsCount < 28) {
        console.log("Deepmind: Seeding sample course lessons with active URLs...");
        await client.execute("DELETE FROM lessons");
        const sampleLessons = [
          // Data Science & Machine Learning
          { id: 'ds_l1', course_id: 'data-science-machine-learning', module_name: 'Python Programming Fundamentals', lesson_title: 'Introduction to Data Science & Jupyter Notebooks', video_url: 'https://www.youtube.com/embed/ua-CiDNNj30', order_index: 1 },
          { id: 'ds_l2', course_id: 'data-science-machine-learning', module_name: 'Data Manipulation with Pandas & NumPy', lesson_title: 'Pandas & NumPy Deep Dive for Beginners', video_url: 'https://www.youtube.com/embed/rfscVS0vtbw', order_index: 2 },
          { id: 'ds_l3', course_id: 'data-science-machine-learning', module_name: 'Supervised Machine Learning Algorithms', lesson_title: 'Introduction to Supervised Machine Learning', video_url: 'https://www.youtube.com/embed/Gv9_4yMHFhI', order_index: 3 },
          { id: 'ds_l4', course_id: 'data-science-machine-learning', module_name: 'Deep Learning with TensorFlow & Keras', lesson_title: 'Deep Learning Foundations with TensorFlow', video_url: 'https://www.youtube.com/embed/aircAruvnKk', order_index: 4 },
          { id: 'ds_l5', course_id: 'data-science-machine-learning', module_name: 'Data Visualization & EDA', lesson_title: 'Exploratory Data Analysis with Python & Matplotlib', video_url: 'https://www.youtube.com/embed/r-uOLxNrNk8', order_index: 5 },
          { id: 'ds_l6', course_id: 'data-science-machine-learning', module_name: 'Model Evaluation & Deployment', lesson_title: 'Model Selection, Evaluation & Deployment Strategies', video_url: 'https://www.youtube.com/embed/fwY9Qv96DJY', order_index: 6 },

          // Artificial Intelligence & Generative AI
          { id: 'ai_l1', course_id: 'artificial-intelligence-generative-ai', module_name: 'Introduction to AI & Deep Learning', lesson_title: 'Introduction to Artificial Intelligence & Deep Learning', video_url: 'https://www.youtube.com/embed/2ePf9rue1Ao', order_index: 1 },
          { id: 'ai_l2', course_id: 'artificial-intelligence-generative-ai', module_name: 'Generative Adversarial Networks (GANs)', lesson_title: 'Generative Adversarial Networks (GANs) Explained', video_url: 'https://www.youtube.com/embed/TpMIssRdhco', order_index: 2 },
          { id: 'ai_l3', course_id: 'artificial-intelligence-generative-ai', module_name: 'Large Language Models (LLMs) & Transformers', lesson_title: 'Introduction to Transformers & Hugging Face', video_url: 'https://www.youtube.com/embed/eMlx5fFNoYc', order_index: 3 },
          { id: 'ai_l4', course_id: 'artificial-intelligence-generative-ai', module_name: 'Prompt Engineering & Fine-tuning LLMs', lesson_title: 'Prompt Engineering & LLM Orchestration', video_url: 'https://www.youtube.com/embed/jC4v5AS4YSg', order_index: 4 },
          { id: 'ai_l5', course_id: 'artificial-intelligence-generative-ai', module_name: 'Computer Vision with CNNs', lesson_title: 'Convolutional Neural Networks for Image Recognition', video_url: 'https://www.youtube.com/embed/YRhxdVk_sIs', order_index: 5 },
          { id: 'ai_l6', course_id: 'artificial-intelligence-generative-ai', module_name: 'AI Ethics & Responsible AI', lesson_title: 'AI Ethics, Bias & Responsible AI Development', video_url: 'https://www.youtube.com/embed/aGwYtUzMQUk', order_index: 6 },

          // Full Stack Java Development
          { id: 'java_l1', course_id: 'full-stack-java-development', module_name: 'Java Core & OOP', lesson_title: 'Java Programming Basics & OOP Foundations', video_url: 'https://www.youtube.com/embed/eIrMbAQSU34', order_index: 1 },
          { id: 'java_l2', course_id: 'full-stack-java-development', module_name: 'SQL & Database Management', lesson_title: 'Introduction to Relational Databases & SQL', video_url: 'https://www.youtube.com/embed/HXV3zeQKqGY', order_index: 2 },
          { id: 'java_l3', course_id: 'full-stack-java-development', module_name: 'Spring Boot & Microservices', lesson_title: 'Building REST APIs with Spring Boot', video_url: 'https://www.youtube.com/embed/9SGDpanrc8U', order_index: 3 },
          { id: 'java_l4', course_id: 'full-stack-java-development', module_name: 'Frontend Development', lesson_title: 'Connecting React Frontend to Spring Boot Backend', video_url: 'https://www.youtube.com/embed/f2EqECiTBL8', order_index: 4 },
          { id: 'java_l5', course_id: 'full-stack-java-development', module_name: 'Microservices Architecture', lesson_title: 'Microservices with Spring Boot & Spring Cloud', video_url: 'https://www.youtube.com/embed/BnknNTN8icw', order_index: 5 },
          { id: 'java_l6', course_id: 'full-stack-java-development', module_name: 'Security & Authentication', lesson_title: 'Spring Security, JWT & OAuth2 Implementation', video_url: 'https://www.youtube.com/embed/b9O9NI-RJ3o', order_index: 6 },

          // DevOps & Cloud Technologies
          { id: 'devops_l1', course_id: 'devops-cloud-technologies', module_name: 'DevOps & Cloud Technologies', lesson_title: 'Introduction to DevOps Principles & AWS Cloud', video_url: 'https://www.youtube.com/embed/j5Zsa_eOXeY', order_index: 1 },
          { id: 'devops_l2', course_id: 'devops-cloud-technologies', module_name: 'CI/CD Pipelines', lesson_title: 'Continuous Integration & Deployment (CI/CD) Pipelines', video_url: 'https://www.youtube.com/embed/scEDHsr3APg', order_index: 2 },
          { id: 'devops_l3', course_id: 'devops-cloud-technologies', module_name: 'Docker & Containerization', lesson_title: 'Docker Containers for Software Engineers', video_url: 'https://www.youtube.com/embed/3c-iFnDcCD0', order_index: 3 },
          { id: 'devops_l4', course_id: 'devops-cloud-technologies', module_name: 'Kubernetes', lesson_title: 'Kubernetes Orchestration from Scratch', video_url: 'https://www.youtube.com/embed/X48VuDVv0do', order_index: 4 },
          { id: 'devops_l5', course_id: 'devops-cloud-technologies', module_name: 'Infrastructure as Code', lesson_title: 'Terraform & Infrastructure as Code (IaC) Fundamentals', video_url: 'https://www.youtube.com/embed/l5k1ai_GBDE', order_index: 5 },
          { id: 'devops_l6', course_id: 'devops-cloud-technologies', module_name: 'Monitoring & Observability', lesson_title: 'Prometheus, Grafana & Cloud Monitoring in Production', video_url: 'https://www.youtube.com/embed/h4Sl21AKiDg', order_index: 6 },
          
          // Python Programming
          { id: 'py_l1', course_id: 'python-programming', module_name: 'Python Basics & Syntax', lesson_title: 'Introduction to Python', video_url: 'https://www.youtube.com/embed/kqtD5dpn9C8', order_index: 1 },
          { id: 'py_l2', course_id: 'python-programming', module_name: 'Data Types & Data Structures', lesson_title: 'Lists, Tuples, Dictionaries', video_url: 'https://www.youtube.com/embed/kqtD5dpn9C8', order_index: 2 },
          
          // Software Testing
          { id: 'st_l1', course_id: 'software-testing-manual-automation', module_name: 'Manual Testing Fundamentals', lesson_title: 'Intro to Manual Testing', video_url: 'https://www.youtube.com/embed/kw0Uis88y3Q', order_index: 1 },
          
          // SAP
          { id: 'sap_l1', course_id: 'sap-data-processing', module_name: 'Introduction to SAP & ERP Concepts', lesson_title: 'SAP Overview', video_url: 'https://www.youtube.com/embed/Z0p9v_4-pM0', order_index: 1 }
        ];

        for (const lesson of sampleLessons) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO lessons (id, course_id, module_name, lesson_title, video_url, order_index)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [lesson.id, lesson.course_id, lesson.module_name, lesson.lesson_title, lesson.video_url, lesson.order_index]
          });
        }
      }
    } catch (e) {
      console.error("Failed to sync sample LMS data", e);
    }
  }
};

// --- ADVANCED LMS FEATURES ---

export const getBadges = async (studentId: string): Promise<Badge[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM badges WHERE student_id = ? ORDER BY unlocked_at DESC",
        args: [studentId]
      });
      return result.rows as unknown as Badge[];
    } catch (e) {
      console.error("Failed to fetch badges", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_badges');
    if (local) {
      const all = JSON.parse(local) as Badge[];
      return all.filter(b => b.student_id === studentId);
    }
    const sampleBadges: Badge[] = [
      { id: 'b1_demo', student_id: 'demo-student-id', title: 'Alpha Protocol', icon: 'Zap', color: 'text-yellow-400', unlocked_at: new Date().toISOString() },
      { id: 'b2_demo', student_id: 'demo-student-id', title: 'Code Vanguard', icon: 'Rocket', color: 'text-[#41c8df]', unlocked_at: new Date().toISOString() }
    ];
    localStorage.setItem('cynexai_local_badges', JSON.stringify(sampleBadges));
    return sampleBadges.filter(b => b.student_id === studentId);
  } catch {
    return [];
  }
};

export const getJobListings = async (): Promise<JobListing[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute("SELECT * FROM job_listings ORDER BY created_at DESC");
      return result.rows as unknown as JobListing[];
    } catch (e) {
      console.error("Failed to fetch jobs", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_jobs');
    if (local) {
      return JSON.parse(local) as JobListing[];
    }
    const sampleJobs: JobListing[] = [
      { id: 'job_1', title: 'AI Systems Architect', company: 'Google Deepmind', location: 'London, UK', salary: '$160k - $220k', description: 'Sample job description', type: 'full-time', category: 'Artificial Intelligence', created_at: new Date().toISOString() },
      { id: 'job_2', title: 'Senior Java Developer', company: 'Amazon', location: 'Hyderabad, IN', salary: '₹25 - 45 LPA', description: 'Sample job description', type: 'full-time', category: 'Software Engineering', created_at: new Date().toISOString() },
      { id: 'job_3', title: 'MLOps Engineer', company: 'OpenAI', location: 'San Francisco, CA', salary: '$180k - $250k', description: 'Sample job description', type: 'internship', category: 'Data Science', created_at: new Date().toISOString() },
      { id: 'job_4', title: 'Junior Frontend Engineer', company: 'CynexAI', location: 'Bangalore, IN', salary: '₹12 - 18 LPA', description: 'Sample job description', type: 'part-time', category: 'Web Development', created_at: new Date().toISOString() }
    ];
    localStorage.setItem('cynexai_local_jobs', JSON.stringify(sampleJobs));
    return sampleJobs;
  } catch {
    return [];
  }
};

export const getMentorshipSessions = async (studentId: string): Promise<MentorshipSession[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM mentorship_sessions WHERE student_id = ? ORDER BY date DESC",
        args: [studentId]
      });
      return result.rows as unknown as MentorshipSession[];
    } catch (e) {
      console.error("Failed to fetch mentorship sessions", e);
    }
  }
  return [];
};

export const bookMentorship = async (session: MentorshipSession) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO mentorship_sessions (id, student_id, mentor_name, date, time, status, meeting_link)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [session.id, session.student_id, session.mentor_name, session.date, session.time, session.status, session.meeting_link || '']
      });
    } catch (e) {
      console.error("Failed to book mentorship", e);
      throw e;
    }
  }
};

export const getDiscussions = async (courseId: string): Promise<Discussion[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM course_discussions WHERE course_id = ? ORDER BY created_at ASC",
        args: [courseId]
      });
      return result.rows as unknown as Discussion[];
    } catch (e) {
      console.error("Failed to fetch discussions", e);
    }
  }
  return [];
};

export const createDiscussion = async (discussion: Discussion) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT INTO course_discussions (id, course_id, student_id, student_name, message, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [discussion.id, discussion.course_id, discussion.student_id, discussion.student_name, discussion.message, new Date().toISOString()]
      });
    } catch (e) {
      console.error("Failed to create discussion", e);
      throw e;
    }
  }
};

const syncSampleTestimonials = async () => {
  if (isTursoConfigured && client) {
    try {
      const check = await client.execute("SELECT count(*) as count FROM testimonials");
      if (Number(check.rows[0].count) === 0) {
        const sampleReviews = [
          {
            id: 'rev_1',
            name: 'Anil Kumar',
            role: 'Java Developer at BeamX Techlab',
            course: 'Full Stack Java',
            rating: 5,
            text: 'CynexAI gave me the skills and confidence I needed to land my first job in tech. The trainers are industry experts and the placement support is truly effective.',
            image: 'gallery_images/WhatsApp%20Image%202025-07-28%20at%2016.47.23_9abc2e80.jpg?version%3D1755168647258',
            isVisible: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 'rev_2',
            name: 'Suresh Kumar',
            role: 'Python Developer at Wexl Edu Pvt Ltd',
            course: 'Full Stack Python',
            rating: 5,
            text: 'From day one, the learning experience was smooth, practical, and job-focused. I highly recommend CynexAI to anyone serious about starting a tech career.',
            image: 'gallery_images/WhatsApp Image 2025-07-28 at 16.48.15_34734bc2.jpg',
            isVisible: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 'rev_3',
            name: 'Y. Bhavana',
            role: 'Web Developer at Zuper Pvt Ltd',
            course: 'Web development',
            rating: 5,
            text: 'The Web Development course at CynexAI helped me build real websites from scratch. HTML, CSS, JavaScript, and React were taught in a very easy-to-understand way.',
            image: 'gallery_images/WhatsApp Image 2025-07-28 at 17.01.27_a8763108.jpg',
            isVisible: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 'rev_4',
            name: 'K. Pullaiah',
            role: 'Software Tester at Persistent Systems',
            course: 'Testing (Manual + Automation)',
            rating: 5,
            text: "CynexAI's software testing course gave me a strong foundation in both manual and automation testing. The real-time projects and Selenium sessions helped me get placed quickly.",
            image: 'gallery_images/WhatsApp Image 2025-07-28 at 17.17.45_290e8232.jpg',
            isVisible: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 'rev_5',
            name: 'Chandrashekar',
            role: 'Software Tester at Paramount Software',
            course: 'Testing (Auto + Manual)',
            rating: 5,
            text: "CynexAI's software testing course gave me a strong foundation in both manual and automation testing. The real-time projects and Selenium sessions helped me get placed quickly",
            image: 'gallery_images/WhatsApp Image 2025-07-30 at 13.53.04_4aea19f7.jpg',
            isVisible: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 'rev_6',
            name: 'Sai Nath',
            role: 'Web Developer at Cognizent',
            course: 'Full Stack',
            rating: 5,
            text: "CynexAI's software testing course gave me a strong foundation in both manual and automation testing. The real-time projects and Selenium sessions helped me get placed quickly",
            image: 'gallery_images/WhatsApp Image 2025-07-30 at 13.50.41_ed43fe99.jpg',
            isVisible: 1,
            created_at: new Date().toISOString()
          }
        ];

        for (const rev of sampleReviews) {
          await client.execute({
            sql: `INSERT INTO testimonials (id, name, role, course, rating, text, image, isVisible, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [rev.id, rev.name, rev.role, rev.course, rev.rating, rev.text, rev.image, rev.isVisible, rev.created_at]
          });
        }
      }
    } catch (e) {
      console.error("Failed to seed testimonials", e);
    }
  }
};

export const getReviews = async (includeHidden = false): Promise<Review[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await initTursoDB();
      let query = "SELECT * FROM testimonials";
      if (!includeHidden) {
        query += " WHERE isVisible = 1";
      }
      query += " ORDER BY created_at DESC";
      const result = await client.execute(query);
      return result.rows.map((row: any) => ({
        id: row.id as string,
        name: row.name as string,
        role: row.role as string,
        course: row.course as string,
        rating: Number(row.rating),
        text: row.text as string,
        image: row.image as string,
        isVisible: row.isVisible === 1,
        created_at: row.created_at as string
      }));
    } catch (e) {
      console.error("Failed to fetch reviews from Turso", e);
    }
  }

  // Local storage fallback for admin additions when offline/local fallback is active
  try {
    const localReviewsStr = localStorage.getItem('cynexai_local_testimonials');
    if (localReviewsStr) {
      const localReviews = JSON.parse(localReviewsStr) as Review[];
      return includeHidden ? localReviews : localReviews.filter(r => r.isVisible);
    }
    const sampleReviews: Review[] = [
      {
        id: 'rev_1',
        name: 'Anil Kumar',
        role: 'Java Developer at BeamX Techlab',
        course: 'Full Stack Java',
        rating: 5,
        text: 'CynexAI gave me the skills and confidence I needed to land my first job in tech. The trainers are industry experts and the placement support is truly effective.',
        image: 'gallery_images/WhatsApp%20Image%202025-07-28%20at%2016.47.23_9abc2e80.jpg?version%3D1755168647258',
        isVisible: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'rev_2',
        name: 'Suresh Kumar',
        role: 'Python Developer at Wexl Edu Pvt Ltd',
        course: 'Full Stack Python',
        rating: 5,
        text: 'From day one, the learning experience was smooth, practical, and job-focused. I highly recommend CynexAI to anyone serious about starting a tech career.',
        image: 'gallery_images/WhatsApp Image 2025-07-28 at 16.48.15_34734bc2.jpg',
        isVisible: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'rev_3',
        name: 'Y. Bhavana',
        role: 'Web Developer at Zuper Pvt Ltd',
        course: 'Web development',
        rating: 5,
        text: 'The Web Development course at CynexAI helped me build real websites from scratch. HTML, CSS, JavaScript, and React were taught in a very easy-to-understand way.',
        image: 'gallery_images/WhatsApp Image 2025-07-28 at 17.01.27_a8763108.jpg',
        isVisible: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'rev_4',
        name: 'K. Pullaiah',
        role: 'Software Tester at Persistent Systems',
        course: 'Testing (Manual + Automation)',
        rating: 5,
        text: "CynexAI's software testing course gave me a strong foundation in both manual and automation testing. The real-time projects and Selenium sessions helped me get placed quickly.",
        image: 'gallery_images/WhatsApp Image 2025-07-28 at 17.17.45_290e8232.jpg',
        isVisible: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'rev_5',
        name: 'Chandrashekar',
        role: 'Software Tester at Paramount Software',
        course: 'Testing (Auto + Manual)',
        rating: 5,
        text: "CynexAI's software testing course gave me a strong foundation in both manual and automation testing. The real-time projects and Selenium sessions helped me get placed quickly",
        image: 'gallery_images/WhatsApp Image 2025-07-30 at 13.53.04_4aea19f7.jpg',
        isVisible: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'rev_6',
        name: 'Sai Nath',
        role: 'Web Developer at Cognizent',
        course: 'Full Stack',
        rating: 5,
        text: "CynexAI's software testing course gave me a strong foundation in both manual and automation testing. The real-time projects and Selenium sessions helped me get placed quickly",
        image: 'gallery_images/WhatsApp Image 2025-07-30 at 13.50.41_ed43fe99.jpg',
        isVisible: true,
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem('cynexai_local_testimonials', JSON.stringify(sampleReviews));
    return includeHidden ? sampleReviews : sampleReviews.filter(r => r.isVisible);
  } catch (e) {
    console.error("Failed to parse local reviews", e);
  }

  return [];
};

export const createReview = async (review: Review) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT INTO testimonials (id, name, role, course, rating, text, image, isVisible, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          review.id,
          review.name,
          review.role,
          review.course,
          review.rating,
          review.text,
          review.image || '',
          review.isVisible ? 1 : 0,
          review.created_at || new Date().toISOString()
        ]
      });
      return;
    } catch (e) {
      console.error("Failed to create review in Turso", e);
      throw e;
    }
  }

  // Fallback local storage CRUD
  try {
    const localReviewsStr = localStorage.getItem('cynexai_local_testimonials') || '[]';
    const localReviews = JSON.parse(localReviewsStr) as Review[];
    localReviews.unshift({
      ...review,
      created_at: review.created_at || new Date().toISOString()
    });
    localStorage.setItem('cynexai_local_testimonials', JSON.stringify(localReviews));
  } catch (e) {
    console.error("Failed to create local review", e);
    throw e;
  }
};

export const updateReview = async (review: Review) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `UPDATE testimonials
              SET name = ?, role = ?, course = ?, rating = ?, text = ?, image = ?, isVisible = ?
              WHERE id = ?`,
        args: [
          review.name,
          review.role,
          review.course,
          review.rating,
          review.text,
          review.image || '',
          review.isVisible ? 1 : 0,
          review.id
        ]
      });
      return;
    } catch (e) {
      console.error("Failed to update review in Turso", e);
      throw e;
    }
  }

  // Fallback local storage CRUD
  try {
    const localReviewsStr = localStorage.getItem('cynexai_local_testimonials') || '[]';
    let localReviews = JSON.parse(localReviewsStr) as Review[];
    localReviews = localReviews.map((r: any) => r.id === review.id ? { ...r, ...review } : r);
    localStorage.setItem('cynexai_local_testimonials', JSON.stringify(localReviews));
  } catch (e) {
    console.error("Failed to update local review", e);
    throw e;
  }
};

export const deleteReview = async (id: string) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: "DELETE FROM testimonials WHERE id = ?",
        args: [id]
      });
      return;
    } catch (e) {
      console.error("Failed to delete review in Turso", e);
      throw e;
    }
  }

  // Fallback local storage CRUD
  try {
    const localReviewsStr = localStorage.getItem('cynexai_local_testimonials') || '[]';
    let localReviews = JSON.parse(localReviewsStr) as Review[];
    localReviews = localReviews.filter(r => r.id !== id);
    localStorage.setItem('cynexai_local_testimonials', JSON.stringify(localReviews));
  } catch (e) {
    console.error("Failed to delete local review", e);
    throw e;
  }
};

export const toggleReviewVisibility = async (id: string, isVisible: boolean) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: "UPDATE testimonials SET isVisible = ? WHERE id = ?",
        args: [isVisible ? 1 : 0, id]
      });
      return;
    } catch (e) {
      console.error("Failed to toggle review visibility in Turso", e);
      throw e;
    }
  }

  // Fallback local storage CRUD
  try {
    const localReviewsStr = localStorage.getItem('cynexai_local_testimonials') || '[]';
    let localReviews = JSON.parse(localReviewsStr) as Review[];
    localReviews = localReviews.map((r: any) => r.id === id ? { ...r, isVisible } : r);
    localStorage.setItem('cynexai_local_testimonials', JSON.stringify(localReviews));
  } catch (e) {
    console.error("Failed to toggle local review visibility", e);
    throw e;
  }
};

// =============================================================
// --- ATTENDANCE MANAGEMENT ---
// =============================================================

const ATTENDANCE_SESSIONS_LOCAL_KEY = 'cynexai_local_attendance_sessions';
const ATTENDANCE_RECORDS_LOCAL_KEY = 'cynexai_local_attendance_records';

const getAllAttendanceSessionsLocal = (): AttendanceSession[] => {
  try {
    const local = localStorage.getItem(ATTENDANCE_SESSIONS_LOCAL_KEY);
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
};

const getAllAttendanceRecordsLocal = (): AttendanceRecord[] => {
  try {
    const local = localStorage.getItem(ATTENDANCE_RECORDS_LOCAL_KEY);
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
};

export interface AttendanceSession {
  id: string;
  course_id: string;
  session_date: string;
  topic: string;
  pin_code: string;
  created_by: string;
  created_at: string;
  batch_name?: string;
  session_time?: string;
  meeting_link?: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  marked_at: string;
  method: 'pin' | 'manual' | 'automatic';
}

export const createAttendanceSession = async (session: AttendanceSession): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT INTO attendance_sessions (id, course_id, session_date, topic, pin_code, created_by, created_at, batch_name, session_time, meeting_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [session.id, session.course_id, session.session_date, session.topic, session.pin_code, session.created_by, session.created_at, session.batch_name || null, session.session_time || null, session.meeting_link || null]
      });
      return;
    } catch (e) {
      console.error('Failed to create attendance session in Turso, falling back', e);
    }
  }
  const sessions = getAllAttendanceSessionsLocal();
  sessions.push(session);
  localStorage.setItem(ATTENDANCE_SESSIONS_LOCAL_KEY, JSON.stringify(sessions));
};

export const getAttendanceSessions = async (courseId?: string): Promise<AttendanceSession[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const sql = courseId
        ? `SELECT * FROM attendance_sessions WHERE course_id = ? ORDER BY created_at DESC`
        : `SELECT * FROM attendance_sessions ORDER BY created_at DESC`;
      const args = courseId ? [courseId] : [];
      const result = await client.execute({ sql, args });
      return result.rows as unknown as AttendanceSession[];
    } catch (e) {
      console.error('Failed to get attendance sessions from Turso, falling back', e);
    }
  }
  const sessions = getAllAttendanceSessionsLocal();
  if (courseId) {
    return sessions.filter(s => s.course_id === courseId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return sessions.sort((a, b) => b.created_at.localeCompare(a.created_at));
};

export const deleteAttendanceSession = async (id: string): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `DELETE FROM attendance_sessions WHERE id = ?`, args: [id] });
      await client.execute({ sql: `DELETE FROM attendance_records WHERE session_id = ?`, args: [id] });
      return;
    } catch (e) {
      console.error('Failed to delete attendance session in Turso, falling back', e);
    }
  }
  let sessions = getAllAttendanceSessionsLocal();
  sessions = sessions.filter(s => s.id !== id);
  localStorage.setItem(ATTENDANCE_SESSIONS_LOCAL_KEY, JSON.stringify(sessions));

  let records = getAllAttendanceRecordsLocal();
  records = records.filter(r => r.session_id !== id);
  localStorage.setItem(ATTENDANCE_RECORDS_LOCAL_KEY, JSON.stringify(records));
};

export const markAttendance = async (record: AttendanceRecord): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO attendance_records (id, session_id, student_id, student_name, marked_at, method) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [record.id, record.session_id, record.student_id, record.student_name, record.marked_at, record.method]
      });
      return;
    } catch (e) {
      console.error('Failed to mark attendance in Turso, falling back', e);
    }
  }
  let records = getAllAttendanceRecordsLocal();
  records = records.filter(r => !(r.session_id === record.session_id && r.student_id === record.student_id));
  records.push(record);
  localStorage.setItem(ATTENDANCE_RECORDS_LOCAL_KEY, JSON.stringify(records));
};

export const getAttendanceRecordsBySession = async (sessionId: string): Promise<AttendanceRecord[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute({ sql: `SELECT * FROM attendance_records WHERE session_id = ? ORDER BY marked_at ASC`, args: [sessionId] });
      return result.rows as unknown as AttendanceRecord[];
    } catch (e) {
      console.error('Failed to get attendance records from Turso, falling back', e);
    }
  }
  const records = getAllAttendanceRecordsLocal();
  return records.filter(r => r.session_id === sessionId).sort((a, b) => a.marked_at.localeCompare(b.marked_at));
};

export const getStudentAttendance = async (studentId: string, courseId: string): Promise<{ totalSessions: number; attended: number; percentage: number }> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const totalRes = await client.execute({ sql: `SELECT COUNT(*) as c FROM attendance_sessions WHERE course_id = ?`, args: [courseId] });
      const attendedRes = await client.execute({ sql: `SELECT COUNT(*) as c FROM attendance_records ar JOIN attendance_sessions s ON ar.session_id = s.id WHERE ar.student_id = ? AND s.course_id = ?`, args: [studentId, courseId] });
      const total = Number(totalRes.rows[0].c);
      const attended = Number(attendedRes.rows[0].c);
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;
      return { totalSessions: total, attended, percentage };
    } catch (e) {
      console.error('Failed to get student attendance stats from Turso, falling back', e);
    }
  }
  const sessions = await getAttendanceSessions(courseId);
  const records = getAllAttendanceRecordsLocal();
  const sessionIds = sessions.map(s => s.id);
  const attendedRecords = records.filter(r => r.student_id === studentId && sessionIds.includes(r.session_id));
  const total = sessions.length;
  const attended = attendedRecords.length;
  const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;
  return { totalSessions: total, attended, percentage };
};

export const verifyAttendancePin = async (pin: string, courseId: string): Promise<AttendanceSession | null> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await client.execute({ sql: `SELECT * FROM attendance_sessions WHERE pin_code = ? AND course_id = ? AND session_date = ? LIMIT 1`, args: [pin, courseId, today] });
      if (result.rows.length > 0) return result.rows[0] as unknown as AttendanceSession;
    } catch (e) {
      console.error('Failed to verify attendance pin in Turso, falling back', e);
    }
  }
  const sessions = await getAttendanceSessions(courseId);
  const today = new Date().toISOString().split('T')[0];
  const matched = sessions.find(s => s.pin_code === pin && s.session_date === today);
  return matched || null;
};

export const getAllAttendanceStats = async (): Promise<{ student_id: string; student_name: string; course_id: string; total: number; attended: number; percentage: number }[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute(`
        SELECT ar.student_id, ar.student_name, s.course_id,
          COUNT(DISTINCT s.id) as total_sessions,
          COUNT(ar.id) as attended
        FROM attendance_sessions s
        LEFT JOIN attendance_records ar ON ar.session_id = s.id
        GROUP BY ar.student_id, s.course_id
      `);
      return result.rows.map((r: any) => ({
        student_id: r.student_id as string,
        student_name: r.student_name as string,
        course_id: r.course_id as string,
        total: Number(r.total_sessions),
        attended: Number(r.attended),
        percentage: Number(r.total_sessions) > 0 ? Math.round((Number(r.attended) / Number(r.total_sessions)) * 100) : 100
      }));
    } catch (e) {
      console.error('Failed to get all attendance stats from Turso, falling back', e);
    }
  }
  const sessions = getAllAttendanceSessionsLocal();
  const records = getAllAttendanceRecordsLocal();
  
  const studentCourseAtt: { [key: string]: { student_id: string, student_name: string, course_id: string, attended: number } } = {};

  records.forEach(r => {
    const session = sessions.find(s => s.id === r.session_id);
    if (session) {
      const key = `${r.student_id}_${session.course_id}`;
      if (!studentCourseAtt[key]) {
        studentCourseAtt[key] = {
          student_id: r.student_id,
          student_name: r.student_name,
          course_id: session.course_id,
          attended: 0
        };
      }
      studentCourseAtt[key].attended += 1;
    }
  });

  return Object.values(studentCourseAtt).map(item => {
    const courseSessions = sessions.filter(s => s.course_id === item.course_id);
    const total = courseSessions.length;
    return {
      student_id: item.student_id,
      student_name: item.student_name,
      course_id: item.course_id,
      total,
      attended: item.attended,
      percentage: total > 0 ? Math.round((item.attended / total) * 100) : 100
    };
  });
};

export const markAutomaticAttendance = async (
  studentId: string,
  studentName: string,
  recordingId: string
): Promise<boolean> => {
  try {
    const recordings = await getDailyRecordings();
    const recording = recordings.find(r => r.id === recordingId);
    if (!recording) return false;

    const batches = await getBatches();
    const batch = batches.find(b => b.id === recording.batch_id);
    if (!batch) return false;

    const courseId = batch.course_id;
    const sessionId = `sess_rec_${recording.id}`;

    const sessions = await getAttendanceSessions(courseId);
    const sessionExists = sessions.some(s => s.id === sessionId);

    if (!sessionExists) {
      const newSession: AttendanceSession = {
        id: sessionId,
        course_id: courseId,
        session_date: recording.recording_date,
        topic: `[Recorded Class] ${recording.title}`,
        pin_code: 'AUTO',
        created_by: 'system',
        created_at: new Date().toISOString()
      };
      await createAttendanceSession(newSession);
    }

    const existingRecords = await getAttendanceRecordsBySession(sessionId);
    const alreadyMarked = existingRecords.some(r => r.student_id === studentId);
    if (alreadyMarked) {
      return false;
    }

    const record: AttendanceRecord = {
      id: `att_rec_${studentId}_${recording.id}`,
      session_id: sessionId,
      student_id: studentId,
      student_name: studentName,
      marked_at: new Date().toISOString(),
      method: 'automatic'
    };

    await markAttendance(record);
    return true;
  } catch (error) {
    console.error("Failed to mark automatic attendance:", error);
    return false;
  }
};

// =============================================================
// --- CERTIFICATES ---
// =============================================================

export interface Certificate {
  id: string;
  student_id: string;
  student_name: string;
  course_id: string;
  course_title: string;
  issued_at: string;
  certificate_number: string;
  credential_id?: string;
  file_data?: string;
  file_type?: string;
}

export interface CertificateCredential {
  id: string;
  username: string;
  password?: string; // Optional for security, don't return if not needed
  student_name: string;
}

export const getCertificatesByStudent = async (studentId: string): Promise<Certificate[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute({ sql: `SELECT * FROM certificates WHERE student_id = ? ORDER BY issued_at DESC`, args: [studentId] });
      return result.rows as unknown as Certificate[];
    } catch (e) { console.error('Failed to get certificates', e); }
  }
  const local = localStorage.getItem('cynexai_local_certificates');
  if (local) {
    const certs: Certificate[] = JSON.parse(local);
    return certs.filter(c => c.student_id === studentId).sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());
  }
  return [];
};

export const getAllCertificates = async (): Promise<Certificate[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute(`SELECT * FROM certificates ORDER BY issued_at DESC`);
      return result.rows as unknown as Certificate[];
    } catch (e) { console.error('Failed to get all certificates', e); }
  }
  const local = localStorage.getItem('cynexai_local_certificates');
  if (local) {
    const certs: Certificate[] = JSON.parse(local);
    return certs.sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());
  }
  return [];
};

export const issueCertificate = async (cert: Certificate): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO certificates (id, student_id, student_name, course_id, course_title, issued_at, certificate_number, credential_id, file_data, file_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [cert.id, cert.student_id, cert.student_name, cert.course_id, cert.course_title, cert.issued_at, cert.certificate_number, cert.credential_id || null, cert.file_data || null, cert.file_type || null]
      });
    } catch (e) { console.error('Failed to issue certificate', e); throw e; }
  }
  const local = localStorage.getItem('cynexai_local_certificates');
  const certs: Certificate[] = local ? JSON.parse(local) : [];
  if (!certs.some(c => c.id === cert.id)) {
    certs.push(cert);
    localStorage.setItem('cynexai_local_certificates', JSON.stringify(certs));
  }
};

export const getCertificateCredentials = async (): Promise<CertificateCredential[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute(`SELECT id, username, student_name FROM certificate_credentials ORDER BY student_name ASC`);
      return result.rows as unknown as CertificateCredential[];
    } catch (e) { console.error('Failed to get certificate credentials', e); }
  }
  return [];
};

export const createCertificateCredential = async (cred: CertificateCredential): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT INTO certificate_credentials (id, username, password, student_name) VALUES (?, ?, ?, ?)`,
        args: [cred.id, cred.username, cred.password || '', cred.student_name]
      });
    } catch (e) { console.error('Failed to create certificate credential', e); throw e; }
  }
};

export const verifyCertificateLogin = async (username: string, password: string):Promise<CertificateCredential | null> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      // First try to authenticate against the users table
      const result = await client.execute({
        sql: `SELECT id, email as username, name as student_name FROM users WHERE email = ? AND password_hash = ? AND role = 'student' LIMIT 1`,
        args: [username, password]
      });
      if (result.rows.length > 0) {
        return {
          id: result.rows[0].id as string,
          username: result.rows[0].username as string,
          student_name: result.rows[0].student_name as string
        };
      }
    } catch (e) {
      console.error('Failed to verify certificate login from users table, trying certificate_credentials fallback', e);
    }

    try {
      const result = await client.execute({
        sql: `SELECT id, username, student_name FROM certificate_credentials WHERE username = ? AND password = ? LIMIT 1`,
        args: [username, password]
      });
      if (result.rows.length > 0) return result.rows[0] as unknown as CertificateCredential;
    } catch (e) { console.error('Failed to verify certificate login from certificate_credentials', e); }
  }

  // Local storage fallback for offline/development mode
  try {
    const users = JSON.parse(localStorage.getItem('cynex_users') || '[]');
    const user = users.find((u: any) => u.email === username && u.password_hash === password && u.role === 'student');
    if (user) {
      return {
        id: user.id,
        username: user.email,
        student_name: user.name
      };
    }
  } catch (e) {
    console.error('Failed to verify certificate login from local storage fallback', e);
  }
  return null;
};

export const getCertificatesByCredential = async (credentialId: string): Promise<Certificate[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute({
        sql: `SELECT * FROM certificates WHERE credential_id = ? OR student_id = ? ORDER BY issued_at DESC`,
        args: [credentialId, credentialId]
      });
      return result.rows as unknown as Certificate[];
    } catch (e) { console.error('Failed to get certificates by credential', e); }
  }
  return [];
};

export const deleteCertificate = async (id: string): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `DELETE FROM certificates WHERE id = ?`, args: [id] });
    } catch (e) { console.error('Failed to delete certificate', e); throw e; }
  }
};

export const checkAndIssueCertificate = async (
  studentId: string,
  studentName: string,
  courseId: string,
  courseTitle: string,
  progressPercentage: number
): Promise<Certificate | null> => {
  if (progressPercentage < 100) return null;
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      // Check if already issued
      const existing = await client.execute({ sql: `SELECT * FROM certificates WHERE student_id = ? AND course_id = ? LIMIT 1`, args: [studentId, courseId] });
      if (existing.rows.length > 0) return existing.rows[0] as unknown as Certificate;
      // Count existing certificates for sequential numbering
      const countRes = await client.execute(`SELECT COUNT(*) as c FROM certificates`);
      const count = Number(countRes.rows[0].c) + 1;
      const certNumber = `CYNEX-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
      const newCert: Certificate = {
        id: crypto.randomUUID(),
        student_id: studentId,
        student_name: studentName,
        course_id: courseId,
        course_title: courseTitle,
        issued_at: new Date().toISOString(),
        certificate_number: certNumber
      };
      await issueCertificate(newCert);
      return newCert;
    } catch (e) { console.error('Failed to auto-issue certificate', e); }
  }
  return null;
};

// =============================================================
// --- DOUBT WALL ---
// =============================================================

export interface DoubtQuestion {
  id: string;
  course_id: string;
  student_id: string;
  student_name: string;
  title: string;
  body: string;
  tags: string;
  upvotes: number;
  is_resolved: number;
  created_at: string;
}

export interface DoubtAnswer {
  id: string;
  question_id: string;
  author_id: string;
  author_name: string;
  author_role: 'student' | 'admin';
  body: string;
  upvotes: number;
  is_accepted: number;
  created_at: string;
}

export const getDoubtQuestions = async (courseId?: string): Promise<DoubtQuestion[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const sql = courseId
        ? `SELECT * FROM doubt_questions WHERE course_id = ? ORDER BY created_at DESC`
        : `SELECT * FROM doubt_questions ORDER BY created_at DESC`;
      const args = courseId ? [courseId] : [];
      const result = await client.execute({ sql, args });
      return result.rows.map((r: any) => ({ ...r, upvotes: Number(r.upvotes), is_resolved: Number(r.is_resolved) })) as unknown as DoubtQuestion[];
    } catch (e) { console.error('Failed to get doubt questions', e); }
  }
  const local = localStorage.getItem('cynexai_local_doubts');
  if (local) {
    let doubts: DoubtQuestion[] = JSON.parse(local);
    if (courseId) {
      doubts = doubts.filter(d => d.course_id === courseId);
    }
    return doubts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  return [];
};

export const createDoubtQuestion = async (q: DoubtQuestion): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT INTO doubt_questions (id, course_id, student_id, student_name, title, body, tags, upvotes, is_resolved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
        args: [q.id, q.course_id, q.student_id, q.student_name, q.title, q.body, q.tags, q.created_at]
      });
    } catch (e) { console.error('Failed to create doubt question', e); throw e; }
  }
  
  // Local fallback
  const local = localStorage.getItem('cynexai_local_doubts');
  const doubts: DoubtQuestion[] = local ? JSON.parse(local) : [];
  doubts.push(q);
  localStorage.setItem('cynexai_local_doubts', JSON.stringify(doubts));
};

export const deleteDoubtQuestion = async (id: string): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `DELETE FROM doubt_questions WHERE id = ?`, args: [id] });
      await client.execute({ sql: `DELETE FROM doubt_answers WHERE question_id = ?`, args: [id] });
    } catch (e) { console.error('Failed to delete doubt question', e); throw e; }
  }
  
  // Local fallback
  const local = localStorage.getItem('cynexai_local_doubts');
  if (local) {
    const doubts: DoubtQuestion[] = JSON.parse(local);
    localStorage.setItem('cynexai_local_doubts', JSON.stringify(doubts.filter(d => d.id !== id)));
  }
};

export const resolveDoubtQuestion = async (id: string): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `UPDATE doubt_questions SET is_resolved = 1 WHERE id = ?`, args: [id] });
    } catch (e) { console.error('Failed to resolve question', e); throw e; }
  }

  // Local fallback
  const local = localStorage.getItem('cynexai_local_doubts');
  if (local) {
    const doubts: DoubtQuestion[] = JSON.parse(local);
    const updated = doubts.map(d => d.id === id ? { ...d, is_resolved: true } : d);
    localStorage.setItem('cynexai_local_doubts', JSON.stringify(updated));
  }
};

export const upvoteDoubtQuestion = async (id: string): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `UPDATE doubt_questions SET upvotes = upvotes + 1 WHERE id = ?`, args: [id] });
    } catch (e) { console.error('Failed to upvote question', e); throw e; }
  }

  // Local fallback
  const local = localStorage.getItem('cynexai_local_doubts');
  if (local) {
    const doubts: DoubtQuestion[] = JSON.parse(local);
    const updated = doubts.map(d => d.id === id ? { ...d, upvotes: d.upvotes + 1 } : d);
    localStorage.setItem('cynexai_local_doubts', JSON.stringify(updated));
  }
};

export const getDoubtAnswers = async (questionId: string): Promise<DoubtAnswer[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute({ sql: `SELECT * FROM doubt_answers WHERE question_id = ? ORDER BY is_accepted DESC, upvotes DESC, created_at ASC`, args: [questionId] });
      return result.rows.map((r: any) => ({ ...r, upvotes: Number(r.upvotes), is_accepted: Number(r.is_accepted) })) as unknown as DoubtAnswer[];
    } catch (e) { console.error('Failed to get doubt answers', e); }
  }
  
  const local = localStorage.getItem('cynexai_local_doubt_answers');
  if (local) {
    const answers: DoubtAnswer[] = JSON.parse(local);
    return answers.filter(a => a.question_id === questionId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  return [];
};

export const createDoubtAnswer = async (a: DoubtAnswer): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT INTO doubt_answers (id, question_id, author_id, author_name, author_role, body, upvotes, is_accepted, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`,
        args: [a.id, a.question_id, a.author_id, a.author_name, a.author_role, a.body, a.created_at]
      });
    } catch (e) { console.error('Failed to create doubt answer', e); throw e; }
  }
  
  // Local fallback
  const local = localStorage.getItem('cynexai_local_doubt_answers');
  const answers: DoubtAnswer[] = local ? JSON.parse(local) : [];
  answers.push(a);
  localStorage.setItem('cynexai_local_doubt_answers', JSON.stringify(answers));
};

export const acceptDoubtAnswer = async (answerId: string, questionId: string): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `UPDATE doubt_answers SET is_accepted = 0 WHERE question_id = ?`, args: [questionId] });
      await client.execute({ sql: `UPDATE doubt_answers SET is_accepted = 1 WHERE id = ?`, args: [answerId] });
      await client.execute({ sql: `UPDATE doubt_questions SET is_resolved = 1 WHERE id = ?`, args: [questionId] });
    } catch (e) { console.error('Failed to accept answer', e); throw e; }
  }
};

export const upvoteDoubtAnswer = async (id: string): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `UPDATE doubt_answers SET upvotes = upvotes + 1 WHERE id = ?`, args: [id] });
    } catch (e) { console.error('Failed to upvote answer', e); }
  }
};

// =============================================================
// --- CODING PRACTICE ---
// =============================================================

export interface CodingProblem {
  id: string;
  course_id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  boilerplate: string; // JSON: { python: '...', javascript: '...', java: '...' }
  test_cases: string;  // JSON: [{ input: '...', expected_output: '...' }]
  constraints: string;
  created_at: string;
}

export interface CodeSubmission {
  id: string;
  student_id: string;
  problem_id: string;
  code: string;
  language: string;
  status: 'accepted' | 'wrong_answer' | 'runtime_error' | 'pending';
  runtime_ms: number;
  submitted_at: string;
}

export const getCodingProblems = async (courseId?: string): Promise<CodingProblem[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const sql = courseId
        ? `SELECT * FROM coding_problems WHERE course_id = ? ORDER BY difficulty ASC, created_at DESC`
        : `SELECT * FROM coding_problems ORDER BY difficulty ASC, created_at DESC`;
      const args = courseId ? [courseId] : [];
      const result = await client.execute({ sql, args });
      const rows = result.rows as unknown as CodingProblem[];
      // Sync to localStorage as cache
      localStorage.setItem('cynexai_coding_problems', JSON.stringify(rows));
      return rows;
    } catch (e) { console.error('Failed to get coding problems', e); }
  }
  // LocalStorage fallback
  const local = localStorage.getItem('cynexai_coding_problems');
  const problems: CodingProblem[] = local ? JSON.parse(local) : [];
  if (courseId) return problems.filter(p => p.course_id === courseId);
  return problems;
};

export const createCodingProblem = async (problem: CodingProblem): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT INTO coding_problems (id, course_id, title, description, difficulty, boilerplate, test_cases, constraints, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [problem.id, problem.course_id, problem.title, problem.description, problem.difficulty, problem.boilerplate, problem.test_cases, problem.constraints, problem.created_at]
      });
      return;
    } catch (e) { console.error('Failed to create coding problem', e); throw e; }
  }
  // LocalStorage fallback
  const local = localStorage.getItem('cynexai_coding_problems');
  const problems: CodingProblem[] = local ? JSON.parse(local) : [];
  // Avoid duplicates
  if (!problems.find(p => p.id === problem.id)) {
    problems.push(problem);
    localStorage.setItem('cynexai_coding_problems', JSON.stringify(problems));
  }
};

export const updateCodingProblem = async (problem: CodingProblem): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `UPDATE coding_problems SET course_id=?, title=?, description=?, difficulty=?, boilerplate=?, test_cases=?, constraints=? WHERE id=?`,
        args: [problem.course_id, problem.title, problem.description, problem.difficulty, problem.boilerplate, problem.test_cases, problem.constraints, problem.id]
      });
    } catch (e) { console.error('Failed to update coding problem', e); throw e; }
  }
};

export const deleteCodingProblem = async (id: string): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `DELETE FROM coding_problems WHERE id = ?`, args: [id] });
    } catch (e) { console.error('Failed to delete coding problem', e); throw e; }
  }
};

export const getCodeSubmissionsByStudent = async (studentId: string): Promise<CodeSubmission[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute({ sql: `SELECT * FROM code_submissions WHERE student_id = ? ORDER BY submitted_at DESC`, args: [studentId] });
      return result.rows as unknown as CodeSubmission[];
    } catch (e) { console.error('Failed to get code submissions', e); }
  }
  return [];
};

export const getAllCodeSubmissions = async (): Promise<CodeSubmission[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute("SELECT * FROM code_submissions ORDER BY submitted_at DESC");
      return result.rows as unknown as CodeSubmission[];
    } catch (e) {
      console.error('Failed to get all code submissions', e);
    }
  }
  return [];
};


export const createCodeSubmission = async (submission: CodeSubmission): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT INTO code_submissions (id, student_id, problem_id, code, language, status, runtime_ms, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [submission.id, submission.student_id, submission.problem_id, submission.code, submission.language, submission.status, submission.runtime_ms, submission.submitted_at]
      });
    } catch (e) { console.error('Failed to save code submission', e); throw e; }
  }
};

export const getSolvedProblemIds = async (studentId: string): Promise<string[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute({ sql: `SELECT DISTINCT problem_id FROM code_submissions WHERE student_id = ? AND status = 'accepted'`, args: [studentId] });
      return result.rows.map((r: any) => r.problem_id as string);
    } catch (e) { console.error('Failed to get solved problems', e); }
  }
  return [];
};

// =============================================================
// --- FAQ OPERATIONS ---
// =============================================================

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  isVisible: boolean;
  order_index?: number;
  created_at?: string;
}

const LOCAL_FAQS_KEY = 'cynexai_local_faqs';

const staticDefaultFaqs: FAQItem[] = [
  {
    id: 'faq_1',
    question: "What is the best AI training institute near Hyderabad?",
    answer: "CynexAI is considered one of the best AI training institutes in Hyderabad, located conveniently in Kukatpally near the KPHB Metro. We offer expert-led courses in Data Science, Machine Learning, and Generative AI with a focus on practical, industry-relevant skills and strong placement support.",
    isVisible: true,
    order_index: 1
  },
  {
    id: 'faq_2',
    question: "How to become a DevOps engineer?",
    answer: "To become a DevOps engineer, you need a strong foundation in cloud technologies, automation tools, and CI/CD pipelines. CynexAI's DevOps & Cloud Technologies course covers essential tools like AWS, Docker, Kubernetes, and Jenkins to prepare you for a successful career as a DevOps engineer.",
    isVisible: true,
    order_index: 2
  },
  {
    id: 'faq_3',
    question: "Do you offer an online generative AI course for beginners?",
    answer: "Yes, CynexAI offers a comprehensive online course in Artificial Intelligence & Generative AI suitable for beginners and professionals. The course covers everything from neural networks and NLP to advanced generative models, preparing you to build and deploy AI applications.",
    isVisible: true,
    order_index: 3
  },
  {
    id: 'faq_4',
    question: "What is included in the Full Stack Java Developer course?",
    answer: "Our Full Stack Java Developer course is an extensive program covering both front-end and back-end development. You will learn Core Java, Spring Boot, Hibernate, RESTful APIs, and a front-end framework like React or Angular to build complete, robust web applications.",
    isVisible: true,
    order_index: 4
  },
  {
    id: 'faq_5',
    question: "Why should I choose CynexAI for my tech training?",
    answer: "CynexAI stands out due to our 100% placement assurance, ISO certified curriculum, and mentorship by senior tech experts. We provide hands-on corporate skills, real-world case studies, mock interviews, and dedicated resume building to make you job-ready from day one.",
    isVisible: true,
    order_index: 5
  },
  {
    id: 'faq_6',
    question: "What makes CynexAI's curriculum different from other training institutes?",
    answer: "Our curriculum is designed in collaboration with industry leaders and updated regularly to match real-world requirements. We emphasize active, practical learning with live projects, interactive coding environments, and in-depth syllabus coverage rather than just theoretical concepts.",
    isVisible: true,
    order_index: 6
  },
  {
    id: 'faq_7',
    question: "Do you provide resume building and mock interview preparation?",
    answer: "Yes! As part of our career transition support, we conduct multiple rounds of mock technical and HR interviews, help design professional portfolios, optimize your LinkedIn profile, and connect you with our network of over 50+ hiring partners.",
    isVisible: true,
    order_index: 7
  }
];

export const getFaqs = async (includeHidden: boolean = false): Promise<FAQItem[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      let sql = "SELECT * FROM faqs";
      if (!includeHidden) {
        sql += " WHERE isVisible = 1";
      }
      sql += " ORDER BY order_index ASC, created_at DESC";
      const result = await client.execute(sql);
      return result.rows.map((row: any) => ({
        id: row.id as string,
        question: row.question as string,
        answer: row.answer as string,
        isVisible: row.isVisible === 1,
        order_index: Number(row.order_index),
        created_at: row.created_at as string
      }));
    } catch (e) {
      console.error("Deepmind: Failed to fetch FAQs from Turso", e);
    }
  }

  // Local storage fallback
  try {
    const local = localStorage.getItem(LOCAL_FAQS_KEY);
    if (local) {
      const items = JSON.parse(local) as FAQItem[];
      return includeHidden ? items : items.filter(i => i.isVisible);
    }
    // Set default initial value in local storage
    localStorage.setItem(LOCAL_FAQS_KEY, JSON.stringify(staticDefaultFaqs));
    return includeHidden ? staticDefaultFaqs : staticDefaultFaqs.filter(i => i.isVisible);
  } catch {
    return includeHidden ? staticDefaultFaqs : staticDefaultFaqs.filter(i => i.isVisible);
  }
};

export const createFaq = async (faq: FAQItem) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO faqs (id, question, answer, isVisible, order_index, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [faq.id, faq.question, faq.answer, faq.isVisible ? 1 : 0, faq.order_index || 0, new Date().toISOString()]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create FAQ in Turso", e);
      throw e;
    }
  }

  // Local storage
  const items = await getFaqs(true);
  items.push({ ...faq, created_at: new Date().toISOString() });
  localStorage.setItem(LOCAL_FAQS_KEY, JSON.stringify(items));
};

export const updateFaq = async (faq: FAQItem) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `UPDATE faqs SET question = ?, answer = ?, isVisible = ?, order_index = ? WHERE id = ?`,
        args: [faq.question, faq.answer, faq.isVisible ? 1 : 0, faq.order_index || 0, faq.id]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to update FAQ in Turso", e);
      throw e;
    }
  }

  // Local storage
  let items = await getFaqs(true);
  items = items.map(item => item.id === faq.id ? { ...item, ...faq } : item);
  localStorage.setItem(LOCAL_FAQS_KEY, JSON.stringify(items));
};

export const deleteFaq = async (id: string) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `DELETE FROM faqs WHERE id = ?`,
        args: [id]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to delete FAQ in Turso", e);
      throw e;
    }
  }

  // Local storage
  let items = await getFaqs(true);
  items = items.filter(item => item.id !== id);
  localStorage.setItem(LOCAL_FAQS_KEY, JSON.stringify(items));
};

// =============================================================
// --- BATCHES & DAILY RECORDINGS ---
// =============================================================

const BATCHES_LOCAL_KEY = 'cynexai_local_batches';
const RECORDINGS_LOCAL_KEY = 'cynexai_local_recordings';

export const getBatches = async (): Promise<Batch[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute("SELECT * FROM batches ORDER BY created_at DESC");
      return result.rows as unknown as Batch[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch batches from Turso", e);
    }
  }
  try {
    const local = localStorage.getItem(BATCHES_LOCAL_KEY);
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
};

export const createBatch = async (batch: Batch) => {
  const newBatch = { ...batch, created_at: batch.created_at || new Date().toISOString() };
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO batches (id, name, course_id, created_at) VALUES (?, ?, ?, ?)`,
        args: [newBatch.id, newBatch.name, newBatch.course_id, newBatch.created_at]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create batch in Turso", e);
      throw e;
    }
  }
  const items = await getBatches();
  items.push(newBatch);
  localStorage.setItem(BATCHES_LOCAL_KEY, JSON.stringify(items));
};

export const updateBatch = async (batch: Batch) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `UPDATE batches SET name = ?, course_id = ? WHERE id = ?`,
        args: [batch.name, batch.course_id, batch.id]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to update batch in Turso", e);
      throw e;
    }
  }
  let items = await getBatches();
  items = items.map(item => item.id === batch.id ? { ...item, ...batch } : item);
  localStorage.setItem(BATCHES_LOCAL_KEY, JSON.stringify(items));
};

export const deleteBatch = async (id: string) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `DELETE FROM batches WHERE id = ?`, args: [id] });
      await client.execute({ sql: `DELETE FROM daily_recordings WHERE batch_id = ?`, args: [id] });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to delete batch in Turso", e);
      throw e;
    }
  }
  let items = await getBatches();
  items = items.filter(item => item.id !== id);
  localStorage.setItem(BATCHES_LOCAL_KEY, JSON.stringify(items));
};

export const getDailyRecordings = async (): Promise<DailyRecording[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute("SELECT * FROM daily_recordings ORDER BY recording_date DESC, created_at DESC");
      return result.rows as unknown as DailyRecording[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch daily recordings from Turso", e);
    }
  }
  try {
    const local = localStorage.getItem(RECORDINGS_LOCAL_KEY);
    if (local) return JSON.parse(local);
    
    // Seed default recordings
    const defaultRecordings: DailyRecording[] = [
      {
        id: 'rec_demo_1',
        batch_id: 'batch_demo',
        subject: 'Python Core',
        title: 'Functions & Modules in Python',
        description: 'Detailed explanation of Python functions, scopes, parameters, args, kwargs, and module imports.',
        video_url: 'https://www.youtube.com/embed/ua-CiDNNj30',
        duration: '1h 15m',
        recording_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        chapters: JSON.stringify([{ time: '00:00', title: 'Intro' }, { time: '10:00', title: 'Defining Functions' }, { time: '35:00', title: '*args and **kwargs' }]),
        created_at: new Date().toISOString()
      },
      {
        id: 'rec_demo_2',
        batch_id: 'batch_demo',
        subject: 'Pandas',
        title: 'Exploratory Data Analysis using Pandas Dataframes',
        description: 'Hands-on session using pandas to load, inspect, clean, and run basic statistics on a dataset.',
        video_url: 'https://www.youtube.com/embed/rfscVS0vtbw',
        duration: '1h 30m',
        recording_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        chapters: JSON.stringify([{ time: '00:00', title: 'Overview' }, { time: '15:00', title: 'Loading CSV Data' }, { time: '45:00', title: 'Filtering and GroupBy' }]),
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem(RECORDINGS_LOCAL_KEY, JSON.stringify(defaultRecordings));
    return defaultRecordings;
  } catch {
    return [];
  }
};

export const getDailyRecordingsByBatch = async (batchId: string): Promise<DailyRecording[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM daily_recordings WHERE batch_id = ? ORDER BY recording_date DESC, created_at DESC",
        args: [batchId]
      });
      return result.rows as unknown as DailyRecording[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch daily recordings for batch", e);
    }
  }
  const all = await getDailyRecordings();
  return all.filter(r => r.batch_id === batchId);
};

export const createDailyRecording = async (rec: DailyRecording) => {
  const newRec = { ...rec, created_at: rec.created_at || new Date().toISOString() };
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO daily_recordings (id, batch_id, subject, title, description, video_url, duration, recording_date, chapters, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [newRec.id, newRec.batch_id, newRec.subject, newRec.title, newRec.description || null, newRec.video_url, newRec.duration || null, newRec.recording_date, newRec.chapters || null, newRec.created_at]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to create daily recording in Turso", e);
      throw e;
    }
  }
  const items = await getDailyRecordings();
  items.push(newRec);
  localStorage.setItem(RECORDINGS_LOCAL_KEY, JSON.stringify(items));
};

export const updateDailyRecording = async (rec: DailyRecording) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: `UPDATE daily_recordings SET batch_id = ?, subject = ?, title = ?, description = ?, video_url = ?, duration = ?, recording_date = ?, chapters = ? WHERE id = ?`,
        args: [rec.batch_id, rec.subject, rec.title, rec.description || null, rec.video_url, rec.duration || null, rec.recording_date, rec.chapters || null, rec.id]
      });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to update daily recording in Turso", e);
      throw e;
    }
  }
  let items = await getDailyRecordings();
  items = items.map(item => item.id === rec.id ? { ...item, ...rec } : item);
  localStorage.setItem(RECORDINGS_LOCAL_KEY, JSON.stringify(items));
};

export const deleteDailyRecording = async (id: string) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `DELETE FROM daily_recordings WHERE id = ?`, args: [id] });
      return;
    } catch (e) {
      console.error("Deepmind: Failed to delete daily recording in Turso", e);
      throw e;
    }
  }
  let items = await getDailyRecordings();
  items = items.filter(item => item.id !== id);
  localStorage.setItem(RECORDINGS_LOCAL_KEY, JSON.stringify(items));
};

export const syncSampleFaqs = async () => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const existing = await client.execute("SELECT COUNT(*) as count FROM faqs");
      const count = Number(existing.rows[0].count);
      if (count > 0) return; // Already initialized

      for (const faq of staticDefaultFaqs) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO faqs (id, question, answer, isVisible, order_index, created_at)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [faq.id, faq.question, faq.answer, faq.isVisible ? 1 : 0, faq.order_index || 0, new Date().toISOString()]
        });
      }
    } catch (e) {
      console.error("Deepmind: Failed to sync sample FAQs", e);
    }
  }
};

export const syncSampleMockTests = async () => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const existing = await client.execute("SELECT COUNT(*) as count FROM mock_tests");
      const count = Number(existing.rows[0].count);
      if (count > 0) return; // Already initialized

      console.log("Deepmind: Syncing sample mock tests and questions...");
      
      const mockTests = [
        {
          id: 'ds_foundation_test',
          title: 'Foundation Assessment',
          description: 'Test your understanding of basic Python, statistical analysis, and machine learning foundation concepts.',
          duration: 45,
          category: 'Beginner',
          totalQuestions: 5,
          isActive: 1,
          createdAt: new Date().toISOString(),
          course_id: 'data-science-machine-learning',
          batch_id: 'batch_demo'
        },
        {
          id: 'ds_midterm_test',
          title: 'Mid-term Technical Evaluation',
          description: 'Intermediate evaluation covering supervised learning algorithms, pandas data structures, and feature engineering.',
          duration: 90,
          category: 'Intermediate',
          totalQuestions: 5,
          isActive: 1,
          createdAt: new Date().toISOString(),
          course_id: 'data-science-machine-learning',
          batch_id: 'batch_demo'
        },
        {
          id: 'ds_certification_test',
          title: 'Final Certification Mock',
          description: 'Advanced assessment evaluating your readiness for placements. Covers deep learning models, natural language processing, and evaluation metrics.',
          duration: 120,
          category: 'Advanced',
          totalQuestions: 5,
          isActive: 1,
          createdAt: new Date().toISOString(),
          course_id: 'data-science-machine-learning',
          batch_id: 'batch_demo'
        }
      ];

      for (const test of mockTests) {
        await client.execute({
          sql: "INSERT INTO mock_tests (id, title, description, duration, category, totalQuestions, isActive, createdAt, course_id, batch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [test.id, test.title, test.description, test.duration, test.category, test.totalQuestions, test.isActive, test.createdAt, test.course_id, test.batch_id]
        });
      }

      const mockQuestions = [
        // ds_foundation_test (Foundation Assessment)
        { id: 'q_ds_f1', testId: 'ds_foundation_test', text: 'Which of the following is used to manage packages in Python?', options: ['pip', 'npm', 'gradle', 'maven'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'pip is the package installer for Python. You can use pip to install packages from the Python Package Index and other indexes.' },
        { id: 'q_ds_f2', testId: 'ds_foundation_test', text: 'What is the correct way to import pandas under the alias pd?', options: ['import pandas as pd', 'import pd from pandas', 'library(pandas) as pd', 'import pandas pd'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'The standard alias for pandas is pd: import pandas as pd.' },
        { id: 'q_ds_f3', testId: 'ds_foundation_test', text: 'Which statistical metric represents the middle value in a sorted data set?', options: ['Mean', 'Median', 'Mode', 'Variance'], correctAnswer: 1, difficulty: 'easy', type: 'mcq', explanation: 'Median is the middle value when the data set is ordered from least to greatest.' },
        { id: 'q_ds_f4', testId: 'ds_foundation_test', text: 'In Supervised Machine Learning, what do we need to train the model?', options: ['Only input data', 'Only output labels', 'Both input data and corresponding output labels', 'No data at all'], correctAnswer: 2, difficulty: 'easy', type: 'mcq', explanation: 'Supervised learning requires labeled training data consisting of both input features and target labels.' },
        { id: 'q_ds_f5', testId: 'ds_foundation_test', text: 'Which library is primarily used for statistical data visualization in Python?', options: ['numpy', 'scikit-learn', 'seaborn', 'tensorflow'], correctAnswer: 2, difficulty: 'easy', type: 'mcq', explanation: 'Seaborn is a Python data visualization library based on matplotlib. It provides a high-level interface for drawing attractive and informative statistical graphics.' },
        
        // ds_midterm_test (Mid-term Technical Evaluation)
        { id: 'q_ds_m1', testId: 'ds_midterm_test', text: 'What does bias-variance tradeoff refer to in machine learning?', options: ['Finding a balance between underfitting (high bias) and overfitting (high variance)', 'Speed vs accuracy tradeoff of a model', 'Storage vs computation tradeoff of a model', 'Selecting the right number of features'], correctAnswer: 0, difficulty: 'medium', type: 'mcq', explanation: 'The bias-variance tradeoff is the property of a model that the variance in the parameter estimates across samples of the same size can be traded off against the bias in the parameter estimates.' },
        { id: 'q_ds_m2', testId: 'ds_midterm_test', text: 'Which of the following is a classification algorithm?', options: ['Linear Regression', 'Logistic Regression', 'K-Means Clustering', 'Principal Component Analysis'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'Despite its name, Logistic Regression is a classification algorithm used to predict binary outcomes.' },
        { id: 'q_ds_m3', testId: 'ds_midterm_test', text: 'What is the purpose of train_test_split from scikit-learn?', options: ['To split dataset into training set and testing set', 'To clean missing data', 'To normalize the feature values', 'To evaluate model metrics'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'train_test_split is used to partition the data into training and validation/testing portions.' },
        { id: 'q_ds_m4', testId: 'ds_midterm_test', text: 'Which metric is calculated as: True Positives / (True Positives + False Positives)?', options: ['Recall', 'Precision', 'F1-Score', 'Accuracy'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'Precision is the ratio of correctly predicted positive observations to the total predicted positives.' },
        { id: 'q_ds_m5', testId: 'ds_midterm_test', text: 'In a Decision Tree, what is the top-most node called?', options: ['Leaf Node', 'Branch Node', 'Root Node', 'Child Node'], correctAnswer: 2, difficulty: 'easy', type: 'mcq', explanation: 'The starting/top-most node of a decision tree is the Root Node.' },

        // ds_certification_test (Final Certification Mock)
        { id: 'q_ds_c1', testId: 'ds_certification_test', text: 'What is the vanishing gradient problem in Deep Neural Networks?', options: ['Gradients become too large, leading to numerical overflow', 'Gradients become extremely small, preventing weight updates in early layers', 'Weights are initialized to zero', 'Activation functions return negative values only'], correctAnswer: 1, difficulty: 'hard', type: 'mcq', explanation: 'Vanishing gradient occurs when backpropagated gradients shrink exponentially as they go back, causing early layers to train very slowly.' },
        { id: 'q_ds_c2', testId: 'ds_certification_test', text: 'Which neural network architecture is best suited for sequence modeling (e.g. text/time series)?', options: ['Convolutional Neural Network (CNN)', 'Recurrent Neural Network (RNN)', 'Feedforward Neural Network', 'Generative Adversarial Network (GAN)'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'RNNs are specifically designed to handle sequential data by maintaining internal memory states.' },
        { id: 'q_ds_c3', testId: 'ds_certification_test', text: 'In NLP, what is the purpose of TF-IDF representation?', options: ['To translate text to another language', 'To evaluate word importance relative to a document and a corpus', 'To correct spelling errors', 'To tag parts of speech'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'TF-IDF (Term Frequency-Inverse Document Frequency) measures how important a word is to a document in a collection.' },
        { id: 'q_ds_c4', testId: 'ds_certification_test', text: 'What does the term ROC AUC score represent?', options: ['The area under the receiver operating characteristic curve, indicating classification quality', 'The rate of convergence of a model', 'The accuracy of regression predictions', 'The clustering separation index'], correctAnswer: 0, difficulty: 'hard', type: 'mcq', explanation: 'ROC AUC represents classification performance across all classification thresholds, measuring the model\'s ability to distinguish classes.' },
        { id: 'q_ds_c5', testId: 'ds_certification_test', text: 'What technique is used to prevent overfitting by randomly setting activation units to 0 during training?', options: ['Batch Normalization', 'Gradient Descent', 'Dropout', 'L1 Regularization'], correctAnswer: 2, difficulty: 'medium', type: 'mcq', explanation: 'Dropout is a regularization technique where randomly selected neurons are ignored during training, reducing co-dependency.' }
      ];

      for (const q of mockQuestions) {
        await client.execute({
          sql: `INSERT INTO questions (id, testId, text, options, correctAnswer, difficulty, type, explanation, isApproved) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [q.id, q.testId, q.text, JSON.stringify(q.options), q.correctAnswer, q.difficulty, q.type, q.explanation, 1]
        });
      }
      console.log("Deepmind: Seeding sample mock tests and questions complete.");
    } catch (e) {
      console.error("Deepmind: Failed to sync sample mock tests", e);
    }
  }
};

// --- LMS RESOURCE VAULT HELPERS ---

export const getLessonResources = async (lessonId: string): Promise<LessonResource[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM lesson_resources WHERE lesson_id = ?",
        args: [lessonId]
      });
      return result.rows as unknown as LessonResource[];
    } catch (e) {
      console.error("Failed to fetch lesson resources", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_lesson_resources') || '[]';
    const list: LessonResource[] = JSON.parse(local);
    return list.filter(r => r.lesson_id === lessonId);
  } catch {
    return [];
  }
};

export const addLessonResource = async (res: LessonResource): Promise<void> => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "INSERT INTO lesson_resources (id, lesson_id, resource_type, title, resource_url, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [res.id, res.lesson_id, res.resource_type, res.title, res.resource_url, res.created_at || new Date().toISOString()]
      });
      return;
    } catch (e) {
      console.error("Failed to add lesson resource", e);
      throw e;
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_lesson_resources') || '[]';
    const list: LessonResource[] = JSON.parse(local);
    list.push({
      ...res,
      created_at: res.created_at || new Date().toISOString()
    });
    localStorage.setItem('cynexai_local_lesson_resources', JSON.stringify(list));
  } catch (e) {
    console.error("Failed to add resource in localStorage", e);
  }
};

export const deleteLessonResource = async (resId: string): Promise<void> => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "DELETE FROM lesson_resources WHERE id = ?",
        args: [resId]
      });
      return;
    } catch (e) {
      console.error("Failed to delete lesson resource", e);
      throw e;
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_lesson_resources') || '[]';
    const list: LessonResource[] = JSON.parse(local);
    const filtered = list.filter(r => r.id !== resId);
    localStorage.setItem('cynexai_local_lesson_resources', JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to delete resource in localStorage", e);
  }
};

// --- LIVE ATTENDANCE SESSIONS HELPERS ---

export const startLiveAttendanceSession = async (
  lessonId: string, 
  pin: string, 
  batchId?: string, 
  createdBy?: string
): Promise<string> => {
  const sessionId = `sess_${Date.now()}`;
  const now = new Date().toISOString();

  if (isTursoConfigured && client) {
    try {
      // 1. Close any existing active session for this lesson
      await client.execute({
        sql: "UPDATE lesson_attendance_sessions SET is_active = 0, ended_at = ? WHERE lesson_id = ? AND is_active = 1",
        args: [now, lessonId]
      });
      // 2. Insert new session
      await client.execute({
        sql: `INSERT INTO lesson_attendance_sessions (id, lesson_id, batch_id, attendance_pin, is_active, started_at, created_by)
              VALUES (?, ?, ?, ?, 1, ?, ?)`,
        args: [sessionId, lessonId, batchId || null, pin, now, createdBy || 'admin']
      });
      return sessionId;
    } catch (e) {
      console.error("Failed to start attendance session", e);
      throw e;
    }
  }

  // LocalStorage Fallback
  try {
    const local = localStorage.getItem('cynexai_local_attendance_sessions') || '[]';
    const list: LessonAttendanceSession[] = JSON.parse(local);
    // Close other sessions for this lesson
    const updated = list.map(s => s.lesson_id === lessonId && s.is_active === 1 ? { ...s, is_active: 0, ended_at: now } : s);
    updated.push({
      id: sessionId,
      lesson_id: lessonId,
      batch_id: batchId,
      attendance_pin: pin,
      is_active: 1,
      started_at: now,
      created_by: createdBy || 'admin'
    });
    localStorage.setItem('cynexai_local_attendance_sessions', JSON.stringify(updated));
    return sessionId;
  } catch (e) {
    console.error("Failed to start session in localStorage", e);
    return sessionId;
  }
};

export const closeAttendanceSession = async (sessionId: string): Promise<void> => {
  const now = new Date().toISOString();
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "UPDATE lesson_attendance_sessions SET is_active = 0, ended_at = ? WHERE id = ?",
        args: [now, sessionId]
      });
      return;
    } catch (e) {
      console.error("Failed to close attendance session", e);
      throw e;
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_attendance_sessions') || '[]';
    const list: LessonAttendanceSession[] = JSON.parse(local);
    const updated = list.map(s => s.id === sessionId ? { ...s, is_active: 0, ended_at: now } : s);
    localStorage.setItem('cynexai_local_attendance_sessions', JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to close session in localStorage", e);
  }
};

export const getActiveAttendanceSession = async (lessonId: string): Promise<LessonAttendanceSession | null> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM lesson_attendance_sessions WHERE lesson_id = ? AND is_active = 1 LIMIT 1",
        args: [lessonId]
      });
      if (result.rows.length > 0) {
        return result.rows[0] as unknown as LessonAttendanceSession;
      }
      return null;
    } catch (e) {
      console.error("Failed to get active attendance session", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_attendance_sessions') || '[]';
    const list: LessonAttendanceSession[] = JSON.parse(local);
    return list.find(s => s.lesson_id === lessonId && s.is_active === 1) || null;
  } catch {
    return null;
  }
};

export const getActiveAttendanceSessionsForCourse = async (courseId: string): Promise<LessonAttendanceSession[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: `SELECT s.* FROM lesson_attendance_sessions s 
              JOIN lessons l ON s.lesson_id = l.id 
              WHERE l.course_id = ? AND s.is_active = 1`,
        args: [courseId]
      });
      return result.rows as unknown as LessonAttendanceSession[];
    } catch (e) {
      console.error("Failed to fetch active course sessions", e);
    }
  }
  try {
    const localSess = localStorage.getItem('cynexai_local_attendance_sessions') || '[]';
    const sessions: LessonAttendanceSession[] = JSON.parse(localSess);
    const active = sessions.filter(s => s.is_active === 1);
    const lessons = await getLessonsByCourse(courseId);
    const lessonIds = new Set(lessons.map(l => l.id));
    return active.filter(s => lessonIds.has(s.lesson_id));
  } catch {
    return [];
  }
};

export const getAttendanceCheckIns = async (sessionId: string): Promise<any[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: `SELECT a.*, u.name as student_name FROM student_attendance a 
              LEFT JOIN users u ON a.student_id = u.id 
              WHERE a.session_id = ? 
              ORDER BY a.check_in_time DESC`,
        args: [sessionId]
      });
      return result.rows;
    } catch (e) {
      console.error("Failed to get attendance check ins", e);
    }
  }
  try {
    const localRecords = localStorage.getItem('cynexai_local_student_attendance') || '[]';
    const records: StudentAttendanceRecord[] = JSON.parse(localRecords);
    const filtered = records.filter(r => r.session_id === sessionId);
    const localUsers = localStorage.getItem('cynexai_local_users') || '[]';
    const users = JSON.parse(localUsers);
    return filtered.map((r: any) => {
      const u = users.find((user: any) => user.id === r.student_id);
      return {
        ...r,
        student_name: u ? u.name : 'Student'
      };
    });
  } catch {
    return [];
  }
};

export const checkInAttendance = async (
  studentId: string, 
  sessionId: string, 
  pin: string
): Promise<{ success: boolean; error?: string }> => {
  const now = new Date().toISOString();
  
  if (isTursoConfigured && client) {
    try {
      // 1. Fetch the session and verify it is active and PIN matches
      const sessionRes = await client.execute({
        sql: "SELECT * FROM lesson_attendance_sessions WHERE id = ? LIMIT 1",
        args: [sessionId]
      });
      if (sessionRes.rows.length === 0) {
        return { success: false, error: "Session not found." };
      }
      const session = sessionRes.rows[0];
      if (Number(session.is_active) !== 1) {
        return { success: false, error: "This attendance session is no longer active." };
      }
      if (String(session.attendance_pin) !== pin) {
        return { success: false, error: "Incorrect 4-digit PIN code." };
      }

      // 2. Check if already checked in
      const existing = await client.execute({
        sql: "SELECT * FROM student_attendance WHERE student_id = ? AND session_id = ? LIMIT 1",
        args: [studentId, sessionId]
      });
      if (existing.rows.length > 0) {
        return { success: false, error: "You have already checked in for this session." };
      }

      // 3. Insert record
      await client.execute({
        sql: "INSERT INTO student_attendance (id, student_id, session_id, check_in_time, status) VALUES (?, ?, ?, ?, 'present')",
        args: [`rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, studentId, sessionId, now]
      });
      return { success: true };
    } catch (e) {
      console.error("Check-in failed in Turso", e);
      return { success: false, error: "Database transaction failed." };
    }
  }

  // LocalStorage Fallback
  try {
    const sessionsLocal = localStorage.getItem('cynexai_local_attendance_sessions') || '[]';
    const sessions: LessonAttendanceSession[] = JSON.parse(sessionsLocal);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return { success: false, error: "Session not found." };
    if (session.is_active !== 1) return { success: false, error: "Session is inactive." };
    if (session.attendance_pin !== pin) return { success: false, error: "Incorrect PIN." };

    const recordsLocal = localStorage.getItem('cynexai_local_student_attendance') || '[]';
    const records: StudentAttendanceRecord[] = JSON.parse(recordsLocal);
    const alreadyIn = records.some(r => r.student_id === studentId && r.session_id === sessionId);
    if (alreadyIn) return { success: false, error: "Already checked in." };

    records.push({
      id: `rec_${Date.now()}`,
      student_id: studentId,
      session_id: sessionId,
      check_in_time: now,
      status: 'present'
    });
    localStorage.setItem('cynexai_local_student_attendance', JSON.stringify(records));
    return { success: true };
  } catch (e) {
    return { success: false, error: "LocalStorage check-in error." };
  }
};

// --- STUDENT LESSON PROGRESS HELPERS ---

export const getStudentLessonProgress = async (
  studentId: string, 
  lessonId: string
): Promise<StudentLessonProgress | null> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM student_lesson_progress WHERE student_id = ? AND lesson_id = ? LIMIT 1",
        args: [studentId, lessonId]
      });
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id as string,
          student_id: row.student_id as string,
          lesson_id: row.lesson_id as string,
          watch_percentage: Number(row.watch_percentage),
          quiz_score: Number(row.quiz_score),
          completed: Number(row.completed),
          last_watched_timestamp: Number(row.last_watched_timestamp),
          updated_at: row.updated_at as string
        };
      }
      return null;
    } catch (e) {
      console.error("Failed to get student progress", e);
    }
  }
  try {
    const local = localStorage.getItem('cynexai_local_student_lesson_progress') || '[]';
    const progressList: StudentLessonProgress[] = JSON.parse(local);
    return progressList.find(p => p.student_id === studentId && p.lesson_id === lessonId) || null;
  } catch {
    return null;
  }
};

export const getStudentLessonProgressForCourse = async (
  studentId: string, 
  courseId: string
): Promise<StudentLessonProgress[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: `SELECT p.* FROM student_lesson_progress p 
              JOIN lessons l ON p.lesson_id = l.id 
              WHERE p.student_id = ? AND l.course_id = ?`,
        args: [studentId, courseId]
      });
      return result.rows.map((row: any) => ({
        id: row.id as string,
        student_id: row.student_id as string,
        lesson_id: row.lesson_id as string,
        watch_percentage: Number(row.watch_percentage),
        quiz_score: Number(row.quiz_score),
        completed: Number(row.completed),
        last_watched_timestamp: Number(row.last_watched_timestamp),
        updated_at: row.updated_at as string
      }));
    } catch (e) {
      console.error("Failed to get course progress records", e);
    }
  }
  try {
    const localProgress = localStorage.getItem('cynexai_local_student_lesson_progress') || '[]';
    const progressList: StudentLessonProgress[] = JSON.parse(localProgress);
    const lessons = await getLessonsByCourse(courseId);
    const lessonIds = new Set(lessons.map(l => l.id));
    return progressList.filter(p => p.student_id === studentId && lessonIds.has(p.lesson_id));
  } catch {
    return [];
  }
};

export const updateStudentLessonProgress = async (progress: StudentLessonProgress): Promise<void> => {
  const isCompleted = (progress.watch_percentage >= 85 && progress.quiz_score >= 70) ? 1 : 0;
  const now = new Date().toISOString();
  const progressId = progress.id || `prog_${progress.student_id}_${progress.lesson_id}`;

  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO student_lesson_progress (
                id, student_id, lesson_id, watch_percentage, quiz_score, completed, last_watched_timestamp, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          progressId,
          progress.student_id,
          progress.lesson_id,
          progress.watch_percentage,
          progress.quiz_score,
          isCompleted,
          progress.last_watched_timestamp,
          now
        ]
      });
      return;
    } catch (e) {
      console.error("Failed to update student progress in Turso", e);
      throw e;
    }
  }

  // LocalStorage Fallback
  try {
    const local = localStorage.getItem('cynexai_local_student_lesson_progress') || '[]';
    const progressList: StudentLessonProgress[] = JSON.parse(local);
    const idx = progressList.findIndex(p => p.student_id === progress.student_id && p.lesson_id === progress.lesson_id);
    const record: StudentLessonProgress = {
      ...progress,
      id: progressId,
      completed: isCompleted,
      updated_at: now
    };
    if (idx !== -1) {
      progressList[idx] = record;
    } else {
      progressList.push(record);
    }
    localStorage.setItem('cynexai_local_student_lesson_progress', JSON.stringify(progressList));
  } catch (e) {
    console.error("Failed to update progress in localStorage", e);
  }
};

// --- ANALYTICS EVENT LOGGER ---

export const logAnalyticsEvent = async (
  studentId: string, 
  eventType: string, 
  lessonId?: string, 
  metadata?: any
): Promise<void> => {
  const id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const now = new Date().toISOString();
  const metaStr = metadata ? JSON.stringify(metadata) : null;

  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "INSERT INTO analytics_events (id, student_id, event_type, lesson_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [id, studentId, eventType, lessonId || null, metaStr, now]
      });
      return;
    } catch (e) {
      console.error("Failed to log analytics event in Turso", e);
    }
  }

  // LocalStorage Fallback
  try {
    const local = localStorage.getItem('cynexai_local_analytics_events') || '[]';
    const events: AnalyticsEvent[] = JSON.parse(local);
    events.push({
      id,
      student_id: studentId,
      event_type: eventType,
      lesson_id: lessonId,
      metadata: metaStr || undefined,
      created_at: now
    });
    // Keep it trimmed to last 1000 items
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    localStorage.setItem('cynexai_local_analytics_events', JSON.stringify(events));
  } catch (e) {
    console.error("Failed to log event in localStorage", e);
  }
};

// --- STUDENT NOTES SYSTEM ---

export const getStudentNotes = async (studentId: string, lessonId: string): Promise<StudentNote[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM student_notes WHERE student_id = ? AND lesson_id = ? ORDER BY timestamp ASC",
        args: [studentId, lessonId]
      });
      return result.rows.map((row: any) => ({
        id: row.id as string,
        student_id: row.student_id as string,
        lesson_id: row.lesson_id as string,
        timestamp: Number(row.timestamp),
        note_text: row.note_text as string,
        created_at: row.created_at as string
      }));
    } catch (e) {
      console.error("Failed to get student notes", e);
    }
  }
  
  try {
    const local = localStorage.getItem(`cynexai_student_notes_${studentId}_${lessonId}`);
    if (local) {
      return JSON.parse(local);
    }
  } catch {}
  return [];
};

export const createStudentNote = async (note: StudentNote): Promise<void> => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "INSERT INTO student_notes (id, student_id, lesson_id, timestamp, note_text, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [note.id, note.student_id, note.lesson_id, note.timestamp, note.note_text, note.created_at]
      });
      return;
    } catch (e) {
      console.error("Failed to insert student note", e);
    }
  }
  
  try {
    const localKey = `cynexai_student_notes_${note.student_id}_${note.lesson_id}`;
    const local = localStorage.getItem(localKey) || '[]';
    const notes: StudentNote[] = JSON.parse(local);
    notes.push(note);
    notes.sort((a, b) => a.timestamp - b.timestamp);
    localStorage.setItem(localKey, JSON.stringify(notes));
  } catch (e) {
    console.error("Failed to save note locally", e);
  }
};

export const deleteStudentNote = async (noteId: string): Promise<void> => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "DELETE FROM student_notes WHERE id = ?",
        args: [noteId]
      });
      return;
    } catch (e) {
      console.error("Failed to delete student note", e);
    }
  }
};

// --- AI LESSON CONTENT SYSTEM ---

export const getAILessonContent = async (lessonId: string): Promise<AILessonContent | null> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute({
        sql: "SELECT * FROM ai_lesson_content WHERE lesson_id = ? LIMIT 1",
        args: [lessonId]
      });
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id as string,
          lesson_id: row.lesson_id as string,
          summary: row.summary as string,
          chapters: row.chapters as string,
          created_at: row.created_at as string
        };
      }
    } catch (e) {
      console.error("Failed to fetch AI content", e);
    }
  }
  
  try {
    const local = localStorage.getItem(`cynexai_ai_content_${lessonId}`);
    if (local) return JSON.parse(local);
  } catch {}
  return null;
};

export const createAILessonContent = async (content: AILessonContent): Promise<void> => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "INSERT INTO ai_lesson_content (id, lesson_id, summary, chapters, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [content.id, content.lesson_id, content.summary, content.chapters, content.created_at]
      });
      return;
    } catch (e) {
      console.error("Failed to insert AI content", e);
    }
  }
  
  try {
    localStorage.setItem(`cynexai_ai_content_${content.lesson_id}`, JSON.stringify(content));
  } catch (e) {
    console.error("Failed to save AI content locally", e);
  }
};

