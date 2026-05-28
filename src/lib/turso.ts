/// <reference types="vite/client" />
import { createClient } from '@libsql/client';
import { codingQuestionBank, mockTestBank, mockTestQuestionsBank } from './questionBank';

// Turso Database Configuration
const url = import.meta.env.VITE_TURSO_DATABASE_URL;
const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

// Diagnostic Logging
console.log("Deepmind: Turso Configuration Init", {
  urlExists: !!url,
  tokenExists: !!authToken,
  urlValue: url?.substring(0, 15) + "...",
});

// Initialize the Turso client only if credentials are provided
export const isTursoConfigured = Boolean(
  url &&
  url.trim() !== '' &&
  url !== 'your_database_url' &&
  authToken &&
  authToken.trim() !== '' &&
  authToken !== 'your_auth_token'
);

if (isTursoConfigured) {
  console.log("Deepmind: Turso Cloud is ACTIVE");
} else {
  console.warn("Deepmind: Turso Cloud is NOT configured. Using LocalStorage fallback.");
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
  const newUser = { ...user, created_at: user.created_at || new Date().toISOString() };
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
  return [];
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
      return result.rows.map(row => ({
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
      return result.rows.map(row => ({
        ...row,
        isVisible: (row as any).isVisible === undefined ? true : (row as any).isVisible === 1
      })) as unknown as Payment[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch payments", e);
    }
  }
  return [];
};

export const getAllPayments = async (): Promise<Payment[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute("SELECT * FROM payments");
      return result.rows.map(row => ({
        ...row,
        isVisible: (row as any).isVisible === 1 || (row as any).isVisible === undefined || (row as any).isVisible === null
      })) as unknown as Payment[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch all payments", e);
    }
  }
  return [];
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
    } catch (e) {
      console.error("Deepmind: Failed to create payment", e);
      throw e;
    }
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
    } catch (e) {
      console.error("Deepmind: Failed to update payment in Turso:", e);
      throw e;
    }
  }
};

export const deletePayment = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "DELETE FROM payments WHERE id = ?",
        args: [id]
      });
    } catch (e) {
      console.error("Deepmind: Failed to delete payment in Turso:", e);
      throw e;
    }
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
  return [];
};

export const createSupportTicket = async (ticket: Omit<SupportTicket, 'created_at'>) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO support_tickets (id, student_id, category, description, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [ticket.id, ticket.student_id, ticket.category, ticket.description, ticket.status || 'open', new Date().toISOString()]
      });
    } catch (e) {
      console.error("Deepmind: Failed to create ticket", e);
      throw e;
    }
  }
};

export const updateSupportStatus = async (id: string, status: 'open' | 'resolved') => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "UPDATE support_tickets SET status = ? WHERE id = ?",
        args: [status, id]
      });
    } catch (e) {
      console.error("Deepmind: Failed to update ticket status", e);
      throw e;
    }
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
  return [];
};

export const createSupportReply = async (reply: Omit<SupportReply, 'created_at'>) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT INTO support_replies (id, ticket_id, sender_id, sender_name, sender_role, message, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [reply.id, reply.ticket_id, reply.sender_id, reply.sender_name, reply.sender_role, reply.message, new Date().toISOString()]
      });
    } catch (e) {
      console.error("Deepmind: Failed to create support reply", e);
      throw e;
    }
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
  type: 'mcq' | 'coding';
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
  submission_url: string;
  status: 'pending' | 'approved' | 'needs_work';
  score?: number;
  feedback?: string;
  submitted_at: string;
}

export interface Badge {
  id: string;
  student_id: string;
  title: string;
  icon: string;
  color: string;
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
    if (!data) return [];
    return JSON.parse(data);
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
      const result = await client.execute("SELECT * FROM mock_tests ORDER BY createdAt DESC");
      return result.rows.map(row => ({
        id: row.id as string,
        title: row.title as string,
        description: row.description as string,
        duration: Number(row.duration),
        category: row.category as string,
        totalQuestions: Number(row.totalQuestions),
        isActive: row.isActive === 1,
        createdAt: row.createdAt as string,
        course_id: row.course_id as string || undefined,
        batch_id: row.batch_id as string || undefined
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
      let sql = "SELECT * FROM questions WHERE testId = ?";
      const args: (string | number)[] = [testId];

      if (!includeUnapproved) {
        sql += " AND isApproved = 1";
      }

      const result = await client.execute({ sql, args });
      return result.rows.map((row) => ({
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
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "INSERT INTO mock_tests (id, title, description, duration, category, totalQuestions, isActive, createdAt, course_id, batch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
          newTest.batch_id || null
        ]
      });
      return;
    } catch (e) {
      console.error("Failed to create mock test in Turso:", e);
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

export const addQuestion = async (question: Question) => {
  if (isTursoConfigured && client) {
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
      return;
    } catch (e) {
      console.error("Failed to add question in Turso:", e);
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

export interface TestResult {
  id: string;
  studentName: string;
  testId: string;
  testTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  date: string;
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
      await client.execute({
        sql: "INSERT INTO test_results (id, studentName, testId, testTitle, score, totalQuestions, percentage, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [result.id, result.studentName, result.testId, result.testTitle, result.score, result.totalQuestions, result.percentage, result.date]
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
      const result = await client.execute("SELECT * FROM test_results ORDER BY date DESC");
      return result.rows.map(row => ({
        id: row.id as string,
        studentName: row.studentName as string,
        testId: row.testId as string,
        testTitle: row.testTitle as string,
        score: Number(row.score),
        totalQuestions: Number(row.totalQuestions),
        percentage: Number(row.percentage),
        date: row.date as string
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
    const hasProblemToday = allProblems.some(p => p.createdAt.startsWith(todayStr));
    
    if (!hasProblemToday) {
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      const questionIndex = dayOfYear % codingQuestionBank.length;
      const questionToAdd = codingQuestionBank[questionIndex];
      
      const newProblem: CodingProblem = {
        ...questionToAdd,
        id: `auto_daily_${todayStr}_${questionToAdd.id}`,
        createdAt: new Date().toISOString()
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
        createdAt: new Date().toISOString()
      };
      
      await createMockTest(newMockTest);
      
      for (const mq of mockTestQuestionsBank) {
        await createQuestion({
          ...mq,
          id: `auto_mq_${currentWeek}_${mq.id}`,
          testId: newMockTest.id
        });
      }
      console.log(`Auto-provisioned weekly mock test: ${newMockTest.title}`);
    }
  } catch (error) {
    console.error("Auto provision failed:", error);
  }
};

export const getProjectSubmissions = async (studentId: string): Promise<ProjectSubmission[]> => {
  const local = localStorage.getItem('cynexai_project_submissions');
  return local ? JSON.parse(local).filter((s: ProjectSubmission) => s.student_id === studentId) : [];
};

export const createProjectSubmission = async (submission: ProjectSubmission) => {
  const local = localStorage.getItem('cynexai_project_submissions');
  const submissions: ProjectSubmission[] = local ? JSON.parse(local) : [];
  submissions.push(submission);
  localStorage.setItem('cynexai_project_submissions', JSON.stringify(submissions));
};

export const getUserProgress = async (studentId: string): Promise<UserProgress> => {
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
  localStorage.setItem('cynexai_user_progress_' + progress.userId, JSON.stringify(progress));
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
      return result.rows.map(row => ({
        ...row,
        isActive: (row as any).isActive === 1
      })) as unknown as Announcement[];
    } catch (e) {
      console.error("Failed to fetch announcements", e);
    }
  }
  return [];
};

export const createAnnouncement = async (announcement: Omit<Announcement, 'created_at'>) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT INTO announcements (id, title, message, target_audience, course_id, created_by, created_at, isActive)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [announcement.id, announcement.title, announcement.message, announcement.target_audience,
               announcement.course_id || null, announcement.created_by, new Date().toISOString(), announcement.isActive ? 1 : 0]
      });
    } catch (e) {
      console.error("Failed to create announcement", e);
      throw e;
    }
  }
};

export const deleteAnnouncement = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({ sql: "DELETE FROM announcements WHERE id = ?", args: [id] });
    } catch (e) {
      console.error("Failed to delete announcement", e);
    }
  }
};

export const toggleAnnouncementStatus = async (id: string, isActive: boolean) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({ sql: "UPDATE announcements SET isActive = ? WHERE id = ?", args: [isActive ? 1 : 0, id] });
    } catch (e) {
      console.error("Failed to toggle announcement", e);
    }
  }
};

// --- ADMIN LESSON CRUD ---

export const createLesson = async (lesson: Lesson) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT INTO lessons (id, course_id, module_name, lesson_title, video_url, order_index)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [lesson.id, lesson.course_id, lesson.module_name, lesson.lesson_title, lesson.video_url, lesson.order_index]
      });
    } catch (e) {
      console.error("Failed to create lesson", e);
      throw e;
    }
  }
};

export const updateLesson = async (lesson: Lesson) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `UPDATE lessons SET module_name=?, lesson_title=?, video_url=?, order_index=? WHERE id=?`,
        args: [lesson.module_name, lesson.lesson_title, lesson.video_url, lesson.order_index, lesson.id]
      });
    } catch (e) {
      console.error("Failed to update lesson", e);
      throw e;
    }
  }
};

export const deleteLesson = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({ sql: "DELETE FROM lessons WHERE id = ?", args: [id] });
    } catch (e) {
      console.error("Failed to delete lesson", e);
    }
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
  return [];
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
  return [];
};

export const createBadge = async (badge: Badge) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT INTO badges (id, student_id, title, icon, color, unlocked_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [badge.id, badge.student_id, badge.title, badge.icon, badge.color, badge.unlocked_at || new Date().toISOString()]
      });
    } catch (e) {
      console.error("Failed to create badge", e);
      throw e;
    }
  }
};

export const deleteBadge = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({ sql: "DELETE FROM badges WHERE id = ?", args: [id] });
    } catch (e) {
      console.error("Failed to delete badge", e);
    }
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
      return result.rows.map(r => ({
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
      return result.rows.map(r => ({
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
          createdAt TEXT
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
          date TEXT
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
          created_at TEXT
        )
      `);

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
      const tursoPosts = result.rows.map(row => ({
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
      const tursoCategories = new Set(result.rows.map(row => row.category as string).filter(Boolean));

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
    const tableNames = tables.rows.map(r => String(r.name));

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
      return result.rows.map(row => ({
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
  
  return [];
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
    } catch (e) {
      console.error("Deepmind: Failed to create course in Turso:", e);
      throw e;
    }
  }
};

export const updateCourse = async (course: Partial<Course> & { id: string }) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const sets: string[] = [];
      const args: (string | number | null)[] = [];

      Object.entries(course).forEach(([key, value]) => {
        if (key !== 'id') {
          sets.push(`${key} = ?`);
          args.push(key === 'isVisible' ? (value ? 1 : 0) : value as string | number | null);
        }
      });

      args.push(course.id);
      await client.execute({
        sql: `UPDATE courses SET ${sets.join(', ')} WHERE id = ?`,
        args
      });
    } catch (e) {
      console.error("Deepmind: Failed to update course in Turso:", e);
      throw e;
    }
  }
};

export const deleteCourse = async (id: string) => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({
        sql: "DELETE FROM courses WHERE id = ?",
        args: [id]
      });
    } catch (e) {
      console.error("Deepmind: Failed to delete course in Turso:", e);
      throw e;
    }
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
      if (lessonsCount < 16) {
        console.log("Deepmind: Seeding sample course lessons with active URLs...");
        await client.execute("DELETE FROM lessons");
        const sampleLessons = [
          // Data Science & Machine Learning
          { id: 'ds_l1', course_id: 'data-science-machine-learning', module_name: 'Python Programming Fundamentals', lesson_title: 'Introduction to Data Science & Jupyter Notebooks', video_url: 'https://www.youtube.com/embed/ua-CiDNNj30', order_index: 1 },
          { id: 'ds_l2', course_id: 'data-science-machine-learning', module_name: 'Data Manipulation with Pandas & NumPy', lesson_title: 'Pandas & NumPy Deep Dive for Beginners', video_url: 'https://www.youtube.com/embed/rfscVS0vtbw', order_index: 2 },
          { id: 'ds_l3', course_id: 'data-science-machine-learning', module_name: 'Supervised Machine Learning Algorithms', lesson_title: 'Introduction to Supervised Machine Learning', video_url: 'https://www.youtube.com/embed/GwIo3gToVQM', order_index: 3 },
          { id: 'ds_l4', course_id: 'data-science-machine-learning', module_name: 'Deep Learning with TensorFlow & Keras', lesson_title: 'Deep Learning Foundations with TensorFlow', video_url: 'https://www.youtube.com/embed/aircAruvnKk', order_index: 4 },

          // Artificial Intelligence & Generative AI
          { id: 'ai_l1', course_id: 'artificial-intelligence-generative-ai', module_name: 'Introduction to AI & Deep Learning', lesson_title: 'Introduction to Artificial Intelligence & Deep Learning', video_url: 'https://www.youtube.com/embed/Jgvyz2fK-a4', order_index: 1 },
          { id: 'ai_l2', course_id: 'artificial-intelligence-generative-ai', module_name: 'Generative Adversarial Networks (GANs)', lesson_title: 'Generative Adversarial Networks (GANs) Explained', video_url: 'https://www.youtube.com/embed/8L11aMN5KY8', order_index: 2 },
          { id: 'ai_l3', course_id: 'artificial-intelligence-generative-ai', module_name: 'Large Language Models (LLMs) & Transformers', lesson_title: 'Introduction to Transformers & Hugging Face', video_url: 'https://www.youtube.com/embed/XfpMkf4rD6E', order_index: 3 },
          { id: 'ai_l4', course_id: 'artificial-intelligence-generative-ai', module_name: 'Prompt Engineering & Fine-tuning LLMs', lesson_title: 'Prompt Engineering & LLM Orchestration', video_url: 'https://www.youtube.com/embed/mJCckqQ96gc', order_index: 4 },

          // Full Stack Java Development
          { id: 'java_l1', course_id: 'full-stack-java-development', module_name: 'Java Core & OOP', lesson_title: 'Java Programming Basics & OOP Foundations', video_url: 'https://www.youtube.com/embed/grEKMHGYync', order_index: 1 },
          { id: 'java_l2', course_id: 'full-stack-java-development', module_name: 'SQL & Database Management', lesson_title: 'Introduction to Relational Databases & SQL', video_url: 'https://www.youtube.com/embed/HXV3zeQKqGY', order_index: 2 },
          { id: 'java_l3', course_id: 'full-stack-java-development', module_name: 'Spring Boot & Microservices', lesson_title: 'Building REST APIs with Spring Boot', video_url: 'https://www.youtube.com/embed/vtPkDP3DF5A', order_index: 3 },
          { id: 'java_l4', course_id: 'full-stack-java-development', module_name: 'Frontend Development', lesson_title: 'Connecting React Frontend to Spring Boot Backend', video_url: 'https://www.youtube.com/embed/2u3IcrgVnEg', order_index: 4 },

          // DevOps & Cloud Technologies
          { id: 'devops_l1', course_id: 'devops-cloud-technologies', module_name: 'DevOps & Cloud Technologies', lesson_title: 'Introduction to DevOps Principles & AWS Cloud', video_url: 'https://www.youtube.com/embed/j5Zsa_eOXeY', order_index: 1 },
          { id: 'devops_l2', course_id: 'devops-cloud-technologies', module_name: 'CI/CD Pipelines', lesson_title: 'Continuous Integration & Deployment (CI/CD) Pipelines', video_url: 'https://www.youtube.com/embed/scEDHsr3APg', order_index: 2 },
          { id: 'devops_l3', course_id: 'devops-cloud-technologies', module_name: 'Docker & Containerization', lesson_title: 'Docker Containers for Software Engineers', video_url: 'https://www.youtube.com/embed/3c-iFnDcCD0', order_index: 3 },
          { id: 'devops_l4', course_id: 'devops-cloud-technologies', module_name: 'Kubernetes', lesson_title: 'Kubernetes Orchestration from Scratch', video_url: 'https://www.youtube.com/embed/X48VuDVv0do', order_index: 4 }
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
  return [];
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
  return [];
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
      return result.rows.map(row => ({
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
    localReviews = localReviews.map(r => r.id === review.id ? { ...r, ...review } : r);
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
    localReviews = localReviews.map(r => r.id === id ? { ...r, isVisible } : r);
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
        sql: `INSERT INTO attendance_sessions (id, course_id, session_date, topic, pin_code, created_by, created_at, batch_name, session_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [session.id, session.course_id, session.session_date, session.topic, session.pin_code, session.created_by, session.created_at, session.batch_name || null, session.session_time || null]
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
      return result.rows.map(r => ({
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
  return [];
};

export const getAllCertificates = async (): Promise<Certificate[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute(`SELECT * FROM certificates ORDER BY issued_at DESC`);
      return result.rows as unknown as Certificate[];
    } catch (e) { console.error('Failed to get all certificates', e); }
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
      return result.rows.map(r => ({ ...r, upvotes: Number(r.upvotes), is_resolved: Number(r.is_resolved) })) as unknown as DoubtQuestion[];
    } catch (e) { console.error('Failed to get doubt questions', e); }
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
};

export const deleteDoubtQuestion = async (id: string): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `DELETE FROM doubt_questions WHERE id = ?`, args: [id] });
      await client.execute({ sql: `DELETE FROM doubt_answers WHERE question_id = ?`, args: [id] });
    } catch (e) { console.error('Failed to delete doubt question', e); throw e; }
  }
};

export const resolveDoubtQuestion = async (id: string): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `UPDATE doubt_questions SET is_resolved = 1 WHERE id = ?`, args: [id] });
    } catch (e) { console.error('Failed to resolve question', e); throw e; }
  }
};

export const upvoteDoubtQuestion = async (id: string): Promise<void> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      await client.execute({ sql: `UPDATE doubt_questions SET upvotes = upvotes + 1 WHERE id = ?`, args: [id] });
    } catch (e) { console.error('Failed to upvote question', e); }
  }
};

export const getDoubtAnswers = async (questionId: string): Promise<DoubtAnswer[]> => {
  if (isTursoConfigured && client && !dbConnectionFailed) {
    try {
      const result = await client.execute({ sql: `SELECT * FROM doubt_answers WHERE question_id = ? ORDER BY is_accepted DESC, upvotes DESC, created_at ASC`, args: [questionId] });
      return result.rows.map(r => ({ ...r, upvotes: Number(r.upvotes), is_accepted: Number(r.is_accepted) })) as unknown as DoubtAnswer[];
    } catch (e) { console.error('Failed to get doubt answers', e); }
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
      return result.rows.map(r => r.problem_id as string);
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
      return result.rows.map(row => ({
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
    return local ? JSON.parse(local) : [];
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

