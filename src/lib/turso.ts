/// <reference types="vite/client" />
import { createClient } from '@libsql/client';

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

export const client = isTursoConfigured
  ? createClient({ url: url!, authToken: authToken! })
  : null;

// Circuit Breaker: If connection fails, stop trying to use Turso for this session
let dbConnectionFailed = false;
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

export const getUsers = async (): Promise<User[]> => {
  if (isTursoConfigured && client) {
    try {
      const result = await client.execute("SELECT * FROM users ORDER BY created_at DESC");
      return result.rows as unknown as User[];
    } catch (e) {
      console.error("Deepmind: Failed to fetch users", e);
    }
  }
  return [];
};

export const createUser = async (user: Omit<User, 'created_at'>) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO users (id, name, email, password_hash, phone, role, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [user.id, user.name, user.email, user.password_hash || '', user.phone || '', user.role || 'student', new Date().toISOString()]
      });
    } catch (e) {
      console.error("Deepmind: Failed to create user", e);
      throw e;
    }
  }
};

export const updateUser = async (user: User) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `UPDATE users SET name = ?, email = ?, phone = ?, role = ? WHERE id = ?`,
        args: [user.name, user.email, user.phone || '', user.role || 'student', user.id]
      });
      if (user.password_hash) {
        await client.execute({
          sql: `UPDATE users SET password_hash = ? WHERE id = ?`,
          args: [user.password_hash, user.id]
        });
      }
    } catch (e) {
      console.error("Deepmind: Failed to update user", e);
      throw e;
    }
  }
};

export const deleteUser = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "DELETE FROM users WHERE id = ?",
        args: [id]
      });
      // Cascade delete enrollments and payments if necessary
      await client.execute({ sql: "DELETE FROM enrollments WHERE student_id = ?", args: [id] });
      await client.execute({ sql: "DELETE FROM payments WHERE student_id = ?", args: [id] });
    } catch (e) {
      console.error("Deepmind: Failed to delete user", e);
      throw e;
    }
  }
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
  return [];
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
  return [];
};

export const deleteEnrollment = async (id: string) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "DELETE FROM enrollments WHERE id = ?",
        args: [id]
      });
    } catch (e) {
      console.error("Deepmind: Failed to delete enrollment", e);
      throw e;
    }
  }
};

export const createEnrollment = async (enrollment: Enrollment) => {
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO enrollments (id, student_id, course_id, progress_percentage, status)
              VALUES (?, ?, ?, ?, ?)`,
        args: [enrollment.id, enrollment.student_id, enrollment.course_id, enrollment.progress_percentage || 0, enrollment.status || 'active']
      });
    } catch (e) {
      console.error("Deepmind: Failed to create enrollment", e);
      throw e;
    }
  }
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
}

export interface LeaderboardEntry {
  id: string;
  studentName: string;
  avatar: string;
  problemsSolved: number;
  points: number;
  rank: number;
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
        createdAt: row.createdAt as string
      }));
    } catch (e) {
      console.error("Failed to get mock tests from Turso:", e);
      return [];
    }
  }
  return [];
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
  return [];
};

export const createMockTest = async (test: Omit<MockTest, 'createdAt'>) => {
  const newTest = { ...test, createdAt: new Date().toISOString() };
  if (isTursoConfigured && client) {
    try {
      await client.execute({
        sql: "INSERT INTO mock_tests (id, title, description, duration, category, totalQuestions, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [newTest.id, newTest.title, newTest.description, newTest.duration, newTest.category, newTest.totalQuestions, newTest.isActive ? 1 : 0, newTest.createdAt]
      });
      return;
    } catch (e) {
      console.error("Failed to create mock test in Turso:", e);
    }
  }
  console.log("Mock test created (local fallback - not persisted):", newTest);
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
  return;
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
      return;
    } catch (e) {
      console.error("Failed to delete mock test in Turso:", e);
    }
  }
  return;
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

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  if (isTursoConfigured && client) {
    // TODO: Implement database query when schema is ready
    return [];
  }

  return [];
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

      console.log("Turso Cloud Database Connected and Initialized");
      isInitialized = true;
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
                (id, title, subtitle, description, image, duration, placement, students, rating, level, skills, modules, outcomes, prerequisites, career, isVisible) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            course.id, course.title, course.subtitle, course.description,
            course.image, course.duration, course.placement, course.students,
            course.rating, course.level, course.skills, course.modules,
            course.outcomes, course.prerequisites, course.career,
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
              (id, title, subtitle, description, image, duration, placement, students, rating, level, skills, modules, outcomes, prerequisites, career, isVisible) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
