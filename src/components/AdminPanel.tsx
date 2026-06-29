import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiagResult {
  success?: boolean;
  latency?: string | number;
  tables?: string[];
  counts?: Record<string, number>;
  message?: string;
}
import {
  Plus,
  Search,
  Edit2,
  Eye,
  EyeOff,
  Trash2,
  X,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Type,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  MessageSquare,
  Send,
  Star,
  Download
} from 'lucide-react';
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  togglePostVisibility,
  Post,
  generateSlug,
  initTursoDB,
  isTursoConfigured,
  testConnection,
  clearLocalFallback,
  populateSampleData,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  toggleCourseVisibility,
  Course,
  CourseCurriculum,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  User,
  getSupportTickets,
  SupportTicket,
  updateSupportStatus,
  createSupportTicket,
  createEnrollment,
  getAllEnrollments,
  Enrollment,
  getSupportReplies,
  createSupportReply,
  SupportReply,
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleReviewVisibility,
  Review,
  getBatches,
  Batch,
  Lesson,
  LessonResource,
  LessonAttendanceSession,
  createLesson,
  updateLesson,
  deleteLesson,
  getLessonsByCourse,
  getLessonResources,
  addLessonResource,
  deleteLessonResource,
  startLiveAttendanceSession,
  closeAttendanceSession,
  getActiveAttendanceSession,
  getAttendanceCheckIns,
  getStudentLessonProgressForCourse,
} from '../lib/turso';
import { advancedAiPosts } from '../data/aiPosts';
import AdminLogin from './AdminLogin';
import { BookOpen, PlusCircle, Clock, Award, Terminal, HelpCircle, Video, ClipboardList, Trophy, Menu, Briefcase, ChevronDown, ChevronUp, Link2, Activity, Sparkles, Lock, RefreshCw, Square, Check, Users, ArrowUp, ArrowDown, Gift, Brain } from 'lucide-react';
import { AdminAttendance } from './AdminAttendance';
import { AdminCertificates } from './AdminCertificates';
import { AdminDoubtWall } from './AdminDoubtWall';
import { AdminCodingProblems } from './AdminCodingProblems';
import { AdminFAQ } from './AdminFAQ';
import { AdminRecordings } from './AdminRecordings';
import AdminMockTests from './AdminMockTests';
import { AdminLeaderboard } from './AdminLeaderboard';
import { AdminCourseManager } from './AdminCourseManager';
import { AdminProjectSubmissions } from './AdminProjectSubmissions';
import AdminLiveActivity from './AdminLiveActivity';
import AdminReferrals from './AdminReferrals';
import AdminDailyQuiz from './AdminDailyQuiz';

// Admin password is loaded exclusively from environment variable.
// If not set, access is blocked to prevent accidental exposure.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? '';

// Login rate-limiting constants (client-side brute-force protection)
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_ATTEMPTS_KEY = 'cynexai_admin_login_attempts';
const LOCKOUT_UNTIL_KEY = 'cynexai_admin_lockout_until';

export const safeParseArr = (v?: string | string[] | any): string[] => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return []; }
  }
  return [];
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<'articles' | 'courses' | 'coursemanager' | 'students' | 'tickets' | 'reviews' | 'attendance' | 'certificates' | 'doubts' | 'coding' | 'faqs' | 'recordings' | 'mocktests' | 'leaderboard' | 'projects' | 'live_activity' | 'referrals' | 'dailyquiz'>('articles');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Batches State
  const [batches, setBatches] = useState<Batch[]>([]);

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewFormData, setReviewFormData] = useState<Omit<Review, 'id' | 'created_at'>>({
    name: '',
    role: '',
    course: '',
    rating: 5,
    text: '',
    image: '',
    isVisible: true
  });

  // Blog State
  const [posts, setPosts] = useState<Post[]>([]);
  const [formData, setFormData] = useState<Omit<Post, 'id' | 'date'>>({
    title: '',
    content: '',
    image: '',
    category: 'AI Insights',
    isVisible: true
  });
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Course State
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseFormData, setCourseFormData] = useState<{
    id: string;
    title: string;
    subtitle: string;
    description: string;
    image: string;
    duration: string;
    placement: string;
    students: string;
    rating: number;
    level: string;
    skills: string[];
    modules: string[];
    outcomes: string[];
    prerequisites: string[];
    career: string[];
    curriculum: CourseCurriculum;
  }>({
    id: '',
    title: '',
    subtitle: '',
    description: '',
    image: '',
    duration: '',
    placement: '',
    students: '0+',
    rating: 4.8,
    level: 'Intermediate',
    skills: [],
    modules: [],
    outcomes: [],
    prerequisites: [],
    career: [],
    curriculum: { days: [], weeklyTests: [], tips: [], tools: [], subConcepts: [] }
  });

  // Course Outline, Lessons, resources, PIN session, and AI Generator State
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [courseLessons, setCourseLessons] = useState<Record<string, Lesson[]>>({});
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonFormData, setLessonFormData] = useState<{
    id?: string;
    course_id: string;
    module_name: string;
    lesson_title: string;
    video_url: string;
    order_index: number;
    module_id?: string;
    description?: string;
    duration?: number;
    prerequisite_lesson_id?: string;
    is_published?: number;
  }>({
    course_id: '',
    module_name: '',
    lesson_title: '',
    video_url: '',
    order_index: 0,
    module_id: '',
    description: '',
    duration: 15,
    prerequisite_lesson_id: '',
    is_published: 1
  });
  
  // Lesson Resources Vault State
  const [lessonResourcesList, setLessonResourcesList] = useState<LessonResource[]>([]);
  const [newResourceForm, setNewResourceForm] = useState({
    title: '',
    resource_type: 'slides' as any,
    resource_url: ''
  });

  // Live Attendance Session State
  const [activeSession, setActiveSession] = useState<LessonAttendanceSession | null>(null);
  const [activeCheckIns, setActiveCheckIns] = useState<any[]>([]);
  const [isLiveSessionOpen, setIsLiveSessionOpen] = useState(false);
  const [, setLiveSessionLessonId] = useState<string | null>(null);

  // Enrollment Analytics Modal State
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [analyticsCourse, setAnalyticsCourse] = useState<Course | null>(null);
  const [enrollmentReports, setEnrollmentReports] = useState<any[]>([]);

  // AI Curriculum Generator State
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [aiCourseTitle, setAiCourseTitle] = useState('');
  const [aiSkillLevel, setAiSkillLevel] = useState('Beginner');
  const [aiTargetAudience, setAiTargetAudience] = useState('Students');
  const [aiDuration, setAiDuration] = useState('6 weeks');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null); // Generated modules and lessons list

  // Student State
  const [students, setStudents] = useState<User[]>([]);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [studentFormData, setStudentFormData] = useState<Omit<User, 'id' | 'created_at'>>({
    name: '',
    email: '',
    password_hash: '',
    phone: '',
    role: 'student',
    batch_id: ''
  });
  const [allocatedCourseId, setAllocatedCourseId] = useState('');
  const [allocatedBatchId, setAllocatedBatchId] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  // Enrollment State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedStudentForEnroll, setSelectedStudentForEnroll] = useState<User | null>(null);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([]);


  // Support State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplies, setTicketReplies] = useState<SupportReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [isAdminTicketModalOpen, setIsAdminTicketModalOpen] = useState(false);
  const [adminTicketFormData, setAdminTicketFormData] = useState({
    student_id: '',
    category: 'Course Content',
    description: ''
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [diagResult, setDiagResult] = useState<DiagResult | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState<number>(() => {
    const stored = sessionStorage.getItem(LOGIN_ATTEMPTS_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });
  const [lockedUntil, setLockedUntil] = useState<number>(() => {
    const stored = sessionStorage.getItem(LOCKOUT_UNTIL_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });

  const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
    if (!data || !data.length) {
      alert("No data available to download in this section");
      return;
    }
    
    const keys = Object.keys(data[0]);
    const displayHeaders = headers || keys;
    const csvRows = [];
    
    csvRows.push(displayHeaders.map(header => `"${String(header).replace(/"/g, '""')}"`).join(','));
    
    for (const row of data) {
      const values = keys.map(key => {
        const val = row[key];
        const strVal = val === null || val === undefined 
          ? '' 
          : typeof val === 'object' 
            ? JSON.stringify(val) 
            : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReport = () => {
    switch (activeTab) {
      case 'articles': {
        const data = posts.map(p => ({
          ID: p.id,
          Title: p.title,
          Category: p.category,
          Date: p.date,
          Visible: p.isVisible ? 'Yes' : 'No'
        }));
        exportToCSV(data, 'blog_articles_report.csv', ['ID', 'Title', 'Category', 'Date', 'Visible']);
        break;
      }
      case 'courses': {
        const data = courses.map(c => ({
          ID: c.id,
          Title: c.title,
          Duration: c.duration,
          Rating: c.rating,
          Level: c.level,
          Students: c.students,
          Visible: c.isVisible ? 'Yes' : 'No'
        }));
        exportToCSV(data, 'courses_report.csv', ['ID', 'Title', 'Duration', 'Rating', 'Level', 'Students', 'Visible']);
        break;
      }
      case 'students': {
        const data = students.map(s => ({
          ID: s.id,
          Name: s.name,
          Email: s.email,
          Phone: s.phone || 'N/A',
          BatchID: s.batch_id || 'None Allocated',
          RegisteredDate: s.created_at || 'N/A'
        }));
        exportToCSV(data, 'students_report.csv', ['ID', 'Name', 'Email', 'Phone', 'Batch ID', 'Registered Date']);
        break;
      }

      case 'tickets': {
        const data = tickets.map(t => ({
          ID: t.id,
          StudentName: students.find(s => s.id === t.student_id)?.name || t.student_id,
          Category: t.category,
          Description: t.description,
          Status: t.status,
          CreatedAt: t.created_at
        }));
        exportToCSV(data, 'support_tickets_report.csv', ['Ticket ID', 'Student Name', 'Category', 'Description', 'Status', 'Created At']);
        break;
      }
      case 'reviews': {
        const data = reviews.map(r => ({
          ID: r.id,
          Name: r.name,
          Role: r.role,
          Course: r.course,
          Rating: r.rating,
          StoryText: r.text,
          Visible: r.isVisible ? 'Yes' : 'No'
        }));
        exportToCSV(data, 'graduate_success_stories.csv', ['ID', 'Graduate Name', 'Job Role', 'Course Completed', 'Rating', 'Story Description', 'Visible']);
        break;
      }
      default:
        alert("Download is handled directly in this section's workspace component");
    }
  };

  useEffect(() => {
    const authStatus = localStorage.getItem('cynexai_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }

    const init = async () => {
      await initTursoDB();
      fetchPosts();
      fetchCourses();
      fetchStudents();
      fetchTickets();
      fetchAllEnrollments();
      fetchReviews();
      fetchBatches();
    };
    init();
  }, []);

  const fetchBatches = async () => {
    try {
      const b = await getBatches();
      setBatches(b);
    } catch {
      setError('Failed to fetch batches');
    }
  };

  const fetchReviews = async () => {
    try {
      const fetchedReviews = await getReviews(true);
      setReviews(fetchedReviews);
    } catch {
      setError('Failed to fetch testimonials');
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { posts: fetchedPosts } = await getPosts({ limit: 100, includeHidden: true });
      setPosts(fetchedPosts);
    } catch {
      setError('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const fetchedCourses = await getCourses(true);
      setCourses(fetchedCourses);
    } catch {
      setError('Failed to fetch courses');
    }
  };

  const fetchStudents = async () => {
    try {
      const users = await getUsers();
      setStudents(users.filter(u => u.role === 'student'));
    } catch {
      setError('Failed to fetch students');
    }
  };


  const fetchTickets = async () => {
    try {
      const result = await getSupportTickets();
      setTickets(result);
    } catch {
      setError('Failed to fetch tickets');
    }
  };

  const fetchAllEnrollments = async () => {
    try {
      const result = await getAllEnrollments();
      setAllEnrollments(result);
    } catch {
      console.error('Failed to fetch enrollments');
    }
  };

  const handleResolveTicket = async (id: string) => {
    try {
      await updateSupportStatus(id, 'resolved');
      setTickets(tickets.map(t => t.id === id ? { ...t, status: 'resolved' } : t));
      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket({ ...selectedTicket, status: 'resolved' });
      }
      setSuccess('Ticket marked as resolved');
    } catch {
      setError('Failed to update ticket');
    }
  };

  const handleOpenTicketChat = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setRepliesLoading(true);
    try {
      const replies = await getSupportReplies(ticket.id);
      setTicketReplies(replies);
    } catch (error) {
      console.error("Failed to load ticket replies", error);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      const newReply = {
        id: crypto.randomUUID(),
        ticket_id: selectedTicket.id,
        sender_id: 'admin',
        sender_name: 'CynexAI Support',
        sender_role: 'admin' as const,
        message: replyMessage.trim()
      };
      await createSupportReply(newReply);
      setTicketReplies([...ticketReplies, { ...newReply, created_at: new Date().toISOString() }]);
      setReplyMessage('');
    } catch (error) {
      alert("Failed to send message. Please try again.");
    }
  };

  const handleCreateAdminTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTicketFormData.student_id || !adminTicketFormData.description.trim()) {
      setError('Please select a student and provide ticket details.');
      return;
    }

    try {
      const newTicket = {
        id: crypto.randomUUID(),
        student_id: adminTicketFormData.student_id,
        category: adminTicketFormData.category,
        description: adminTicketFormData.description.trim(),
        status: 'open' as const
      };
      await createSupportTicket(newTicket);
      setTickets([{ ...newTicket, created_at: new Date().toISOString() }, ...tickets]);
      setIsAdminTicketModalOpen(false);
      setAdminTicketFormData({
        student_id: '',
        category: 'Course Content',
        description: ''
      });
      setSuccess('Support ticket created successfully on behalf of the student.');
    } catch (err) {
      setError('Failed to log new support ticket.');
    }
  };

  const handleOpenReviewModal = (review?: Review) => {
    if (review) {
      setEditingReview(review);
      setReviewFormData({
        name: review.name,
        role: review.role,
        course: review.course,
        rating: review.rating,
        text: review.text,
        image: review.image,
        isVisible: review.isVisible
      });
    } else {
      setEditingReview(null);
      setReviewFormData({
        name: '',
        role: '',
        course: '',
        rating: 5,
        text: '',
        image: '',
        isVisible: true
      });
    }
    setIsReviewModalOpen(true);
    setError(null);
  };

  const handleReviewFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      if (editingReview) {
        await updateReview({
          ...reviewFormData,
          id: editingReview.id
        });
        setSuccess('Testimonial updated successfully');
      } else {
        const newReview: Review = {
          ...reviewFormData,
          id: 'rev_' + Date.now()
        };
        await createReview(newReview);
        setSuccess('Testimonial created successfully');
      }
      setIsReviewModalOpen(false);
      fetchReviews();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Submit Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(editingReview
        ? `Update Failed: ${message}`
        : `Creation Failed: ${message}`
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleReviewVisibility = async (id: string, currentVisibility: boolean) => {
    try {
      await toggleReviewVisibility(id, !currentVisibility);
      setReviews(reviews.map(r => r.id === id ? { ...r, isVisible: !currentVisibility } : r));
    } catch {
      setError('Failed to toggle visibility');
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this testimonial?')) return;

    try {
      await deleteReview(id);
      setReviews(reviews.filter(r => r.id !== id));
      setSuccess('Testimonial deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete testimonial');
    }
  };

  const handleOpenModal = (post?: Post) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        content: post.content,
        image: post.image,
        category: post.category,
        isVisible: post.isVisible
      });
    } else {
      setEditingPost(null);
      setFormData({
        title: '',
        content: '',
        image: '',
        category: 'AI Insights',
        isVisible: true
      });
    }
    setIsModalOpen(true);
    setError(null);
  };


  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      if (editingPost) {
        await updatePost({
          ...formData,
          id: editingPost.id
        });
        setSuccess('Post updated successfully');
      } else {
        const newPost: Post = {
          ...formData,
          id: generateSlug(formData.title),
          date: new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })
        };
        await createPost(newPost);
        setSuccess('Post created successfully');
      }
      setIsModalOpen(false);
      fetchPosts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Submit Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(editingPost
        ? `Update Failed: ${message}`
        : `Creation Failed: ${message}`
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleVisibility = async (id: string, currentVisibility: boolean) => {
    try {
      await togglePostVisibility(id, !currentVisibility);
      setPosts(posts.map(p => p.id === id ? { ...p, isVisible: !currentVisibility } : p));
    } catch {
      setError('Failed to toggle visibility');
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await deletePost(id);
      setPosts(posts.filter(p => p.id !== id));
      setSuccess('Post deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete post');
    }
  };

  // --- COURSE HANDLERS ---
  const handleOpenCourseModal = (course?: Course) => {
    const safeParseCurriculum = (v?: string): CourseCurriculum => {
      if (!v) return { days: [], weeklyTests: [], tips: [], tools: [], subConcepts: [] };
      try { return JSON.parse(v) as CourseCurriculum; } catch { return { days: [], weeklyTests: [], tips: [], tools: [], subConcepts: [] }; }
    };
    if (course) {
      setEditingCourse(course);
      setCourseFormData({
        id: course.id,
        title: course.title,
        subtitle: course.subtitle || '',
        description: course.description,
        image: course.image,
        duration: course.duration,
        placement: course.placement || '',
        students: course.students,
        rating: course.rating,
        level: course.level,
        skills: safeParseArr(course.skills),
        modules: safeParseArr(course.modules),
        outcomes: safeParseArr(course.outcomes),
        prerequisites: safeParseArr(course.prerequisites),
        career: safeParseArr(course.career),
        curriculum: safeParseCurriculum(course.curriculum),
      });
    } else {
      setEditingCourse(null);
      setCourseFormData({
        id: '',
        title: '',
        subtitle: '',
        description: '',
        image: '',
        duration: '',
        placement: '',
        students: '0+',
        rating: 4.8,
        level: 'Intermediate',
        skills: [],
        modules: [],
        outcomes: [],
        prerequisites: [],
        career: [],
        curriculum: { days: [], weeklyTests: [], tips: [], tools: [], subConcepts: [] },
      });
    }
    setIsCourseModalOpen(true);
    setError(null);
  };

  const handleCourseFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    const slug = courseFormData.id || generateSlug(courseFormData.title);
    const finalCourse: Course = {
      ...courseFormData,
      id: slug,
      skills: JSON.stringify(courseFormData.skills),
      modules: JSON.stringify(courseFormData.modules),
      outcomes: JSON.stringify(courseFormData.outcomes),
      prerequisites: JSON.stringify(courseFormData.prerequisites),
      career: JSON.stringify(courseFormData.career),
      curriculum: JSON.stringify(courseFormData.curriculum),
      isVisible: editingCourse?.isVisible ?? true
    };

    try {
      if (editingCourse) {
        await updateCourse(finalCourse);
        setSuccess('Course updated successfully');
      } else {
        await createCourse(finalCourse as Course);
        setSuccess('Course created successfully');
      }
      setIsCourseModalOpen(false);
      fetchCourses();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(`Course Operation Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleCourseVisibility = async (id: string, currentVisibility: boolean) => {
    try {
      await toggleCourseVisibility(id, !currentVisibility);
      setCourses(courses.map(c => c.id === id ? { ...c, isVisible: !currentVisibility } : c));
    } catch {
      setError('Failed to toggle course visibility');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await deleteCourse(id);
      setCourses(courses.filter(c => c.id !== id));
      setSuccess('Course deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete course');
    }
  };

  // --- ADMIN LESSON & COURSE BUILDER HANDLERS ---
  const fetchLessonsForCourse = async (courseId: string) => {
    try {
      const lessons = await getLessonsByCourse(courseId);
      setCourseLessons(prev => ({ ...prev, [courseId]: lessons }));
      
      // Also fetch if there is any active session for the lessons
      for (const l of lessons) {
        const sess = await getActiveAttendanceSession(l.id);
        if (sess && sess.is_active === 1) {
          setActiveSession(sess);
          setLiveSessionLessonId(l.id);
        }
      }
    } catch (e) {
      console.error("Failed to load lessons", e);
    }
  };

  const handleToggleCourseOutline = async (courseId: string) => {
    if (activeCourseId === courseId) {
      setActiveCourseId(null);
    } else {
      setActiveCourseId(courseId);
      await fetchLessonsForCourse(courseId);
    }
  };

  const handleOpenLessonModal = async (courseId: string, moduleName: string, lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonFormData({
        id: lesson.id,
        course_id: lesson.course_id,
        module_name: lesson.module_name,
        lesson_title: lesson.lesson_title,
        video_url: lesson.video_url || '',
        order_index: lesson.order_index,
        module_id: lesson.module_id || '',
        description: lesson.description || '',
        duration: lesson.duration || 15,
        prerequisite_lesson_id: lesson.prerequisite_lesson_id || '',
        is_published: lesson.is_published !== undefined ? lesson.is_published : 1
      });
      // Fetch resources
      try {
        const res = await getLessonResources(lesson.id);
        setLessonResourcesList(res);
      } catch (e) {
        console.error(e);
      }
    } else {
      setEditingLesson(null);
      setLessonFormData({
        course_id: courseId,
        module_name: moduleName,
        lesson_title: '',
        video_url: '',
        order_index: (courseLessons[courseId]?.filter(l => l.module_name === moduleName).length || 0) + 1,
        module_id: '',
        description: '',
        duration: 15,
        prerequisite_lesson_id: '',
        is_published: 1
      });
      setLessonResourcesList([]);
    }
    setNewResourceForm({ title: '', resource_type: 'slides', resource_url: '' });
    setIsLessonModalOpen(true);
  };

  const handleLessonFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonFormData.lesson_title.trim()) return;

    const lessonId = lessonFormData.id || `les_${Date.now()}`;
    const payload: Lesson = {
      id: lessonId,
      course_id: lessonFormData.course_id,
      module_name: lessonFormData.module_name,
      lesson_title: lessonFormData.lesson_title.trim(),
      video_url: lessonFormData.video_url.trim(),
      order_index: Number(lessonFormData.order_index),
      module_id: lessonFormData.module_id || undefined,
      description: lessonFormData.description || undefined,
      duration: Number(lessonFormData.duration || 15),
      prerequisite_lesson_id: lessonFormData.prerequisite_lesson_id || undefined,
      is_published: lessonFormData.is_published !== undefined ? lessonFormData.is_published : 1
    };

    try {
      if (editingLesson) {
        await updateLesson(payload);
        setSuccess('Lesson updated successfully');
      } else {
        await createLesson(payload);
        setSuccess('Lesson created successfully');
      }
      setIsLessonModalOpen(false);
      fetchLessonsForCourse(lessonFormData.course_id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save lesson');
    }
  };

  const handleDeleteLesson = async (courseId: string, lessonId: string) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await deleteLesson(lessonId);
      setSuccess('Lesson deleted');
      fetchLessonsForCourse(courseId);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete lesson');
    }
  };

  const handleMoveLesson = async (courseId: string, lessonId: string, direction: 'up' | 'down') => {
    const lessons = [...(courseLessons[courseId] || [])];
    const index = lessons.findIndex(l => l.id === lessonId);
    if (index === -1) return;
    
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= lessons.length) return;

    // Swap order indices
    const temp = lessons[index].order_index;
    lessons[index].order_index = lessons[swapIndex].order_index;
    lessons[swapIndex].order_index = temp;

    try {
      await updateLesson(lessons[index]);
      await updateLesson(lessons[swapIndex]);
      fetchLessonsForCourse(courseId);
    } catch (e) {
      console.error("Failed to reorder lessons", e);
    }
  };

  // --- LESSON RESOURCE VAULT ---
  const handleResourceAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !newResourceForm.title.trim() || !newResourceForm.resource_url.trim()) return;

    const newRes: LessonResource = {
      id: `res_${Date.now()}`,
      lesson_id: editingLesson.id,
      resource_type: newResourceForm.resource_type,
      title: newResourceForm.title.trim(),
      resource_url: newResourceForm.resource_url.trim(),
      created_at: new Date().toISOString()
    };

    try {
      await addLessonResource(newRes);
      setLessonResourcesList(prev => [...prev, newRes]);
      setNewResourceForm({ title: '', resource_type: 'slides', resource_url: '' });
      setSuccess('Resource added successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to add resource');
    }
  };

  const handleResourceDelete = async (resId: string) => {
    try {
      await deleteLessonResource(resId);
      setLessonResourcesList(prev => prev.filter(r => r.id !== resId));
      setSuccess('Resource deleted');
      setTimeout(() => setSuccess(null), 2000);
    } catch {
      setError('Failed to delete resource');
    }
  };

  // --- LIVE ATTENDANCE SESSIONS ---
  const handleToggleLiveAttendance = async (lessonId: string) => {
    // Generate PIN and start
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      const sessId = await startLiveAttendanceSession(lessonId, pin);
      const sess: LessonAttendanceSession = {
        id: sessId,
        lesson_id: lessonId,
        attendance_pin: pin,
        is_active: 1,
        started_at: new Date().toISOString()
      };
      setActiveSession(sess);
      setLiveSessionLessonId(lessonId);
      setActiveCheckIns([]);
      setIsLiveSessionOpen(true);
      setSuccess(`Live Attendance session started! PIN: ${pin}`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError('Failed to start live session');
    }
  };

  const handleCloseLiveSession = async (sessionId: string) => {
    try {
      await closeAttendanceSession(sessionId);
      setActiveSession(null);
      setLiveSessionLessonId(null);
      setIsLiveSessionOpen(false);
      setSuccess('Live session closed successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to close session');
    }
  };

  const refreshAttendanceCheckInsList = async () => {
    if (activeSession) {
      try {
        const records = await getAttendanceCheckIns(activeSession.id);
        setActiveCheckIns(records);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // --- ENROLLMENT ANALYTICS MODAL ---
  const handleOpenEnrollmentAnalytics = async (course: Course) => {
    setAnalyticsCourse(course);
    setIsEnrollmentModalOpen(true);
    setEnrollmentReports([]);
    try {
      const enrolls = await getAllEnrollments();
      const courseEnrolls = enrolls.filter(e => e.course_id === course.id);
      const users = await getUsers();
      
      const reports = [];
      for (const e of courseEnrolls) {
        const user = users.find(u => u.id === e.student_id);
        if (user) {
          // Fetch student progress
          const progress = await getStudentLessonProgressForCourse(user.id, course.id);
          const totalLessons = courseLessons[course.id]?.length || 1;
          const completedCount = progress.filter(p => p.completed === 1).length;
          const avgProgress = Math.round((completedCount / totalLessons) * 100);

          reports.push({
            student_id: user.id,
            name: user.name,
            email: user.email,
            progress_percentage: e.progress_percentage || avgProgress,
            completed: completedCount,
            total: totalLessons
          });
        }
      }
      setEnrollmentReports(reports);
    } catch (e) {
      console.error("Failed to load enrollment analytics", e);
    }
  };

  // --- AI CURRICULUM GENERATOR ---
  const handleOpenAiGenerator = (course: Course) => {
    setEditingCourse(course);
    setAiCourseTitle(course.title);
    setAiPrompt(`Create a modular curriculum outline with lessons for a course on ${course.title}. Ensure it covers beginner setups, core syntax, intermediate challenges, and a final capstone project.`);
    setIsAiGeneratorOpen(true);
    setAiResult(null);
    setError(null);
  };

  const handleAiGenerateCurriculum = async () => {
    if (!aiPrompt.trim() || !aiCourseTitle.trim()) return;
    setAiGenerating(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      // MOCK AI curriculum structure
      const responseOutline = {
        modules: [
          {
            name: `Module 1: Getting Started with ${aiCourseTitle}`,
            lessons: [
              { title: `Core Paradigms and Concepts`, duration: 15, description: `Understanding what is ${aiCourseTitle}, basic setup requirements, and tools.` },
              { title: `Environment Setup and Verification`, duration: 25, description: `Hands-on guide to installation, running a hello-world app, and verification.` }
            ]
          },
          {
            name: `Module 2: Essential Data Structures & Logic`,
            lessons: [
              { title: `Variables, Scope, and Collections`, duration: 20, description: `Variables, data types, scoping rules, arrays/lists, dictionaries/objects.` },
              { title: `Flow Controls and Functions`, duration: 30, description: `Conditional statements, iterative loops, functions declarations, and parameters.` }
            ]
          },
          {
            name: `Module 3: Advanced Applications and Project`,
            lessons: [
              { title: `Integrations and Dynamic Flow`, duration: 35, description: `Calling external APIs, async routines, error handling strategies.` },
              { title: `Capstone Project Build Session`, duration: 45, description: `Final lab challenge integrating all concepts to build a working platform tool.` }
            ]
          }
        ]
      };
      setAiResult(responseOutline);
    } catch {
      setError('AI generation failed.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAiCurriculum = async (courseId: string) => {
    if (!aiResult) return;
    try {
      let order = 1;
      const currentModulesList = [...safeParseArr(editingCourse?.modules)];

      for (const mod of aiResult.modules) {
        if (!currentModulesList.includes(mod.name)) {
          currentModulesList.push(mod.name);
        }
        for (const les of mod.lessons) {
          const lessonId = `les_ai_${Date.now()}_${order}_${Math.random().toString(36).substr(2, 4)}`;
          await createLesson({
            id: lessonId,
            course_id: courseId,
            module_name: mod.name,
            lesson_title: les.title,
            video_url: '', // Needs YouTube URL
            order_index: order++,
            description: les.description,
            duration: les.duration,
            is_published: 1
          });
        }
      }

      // Update course modules array in SQLite
      const updatedCourse = {
        ...editingCourse!,
        modules: JSON.stringify(currentModulesList)
      };
      await updateCourse(updatedCourse);
      
      setSuccess('AI Curriculum drafted and applied successfully! Draft lessons added.');
      setIsAiGeneratorOpen(false);
      setAiResult(null);
      fetchCourses();
      fetchLessonsForCourse(courseId);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('Failed to apply AI curriculum');
    }
  };

  // --- STUDENT HANDLERS ---
  const handleOpenStudentModal = (student?: User) => {
    if (student) {
      setEditingStudent(student);
      setStudentFormData({
        name: student.name,
        email: student.email,
        password_hash: '', // Dont prepopulate password hash for editing for safety
        phone: student.phone || '',
        role: student.role,
        batch_id: student.batch_id || ''
      });
      // Find existing enrollment if any
      const existingEnrollment = allEnrollments.find(e => e.student_id === student.id);
      setAllocatedCourseId(existingEnrollment ? existingEnrollment.course_id : '');
      setAllocatedBatchId(student.batch_id || '');
    } else {
      setEditingStudent(null);
      setStudentFormData({
        name: '',
        email: '',
        password_hash: '',
        phone: '',
        role: 'student',
        batch_id: ''
      });
      setAllocatedCourseId(courses.length > 0 ? courses[0].id : '');
      setAllocatedBatchId('');
    }
    setIsStudentModalOpen(true);
    setError(null);
  };

  const handleStudentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    const userPayload: User = {
      ...studentFormData,
      batch_id: allocatedBatchId || undefined,
      id: editingStudent ? editingStudent.id : generateSlug(studentFormData.name + Date.now()),
      created_at: editingStudent ? editingStudent.created_at : new Date().toISOString()
    } as User;

    try {
      if (editingStudent) {
        if (!studentFormData.password_hash) {
           delete userPayload.password_hash; // Don't override if empty during edit
        }
        await updateUser(userPayload);

        // Update or create enrollment for edited student
        const existingEnrollment = allEnrollments.find(enr => enr.student_id === editingStudent.id);
        if (allocatedCourseId) {
          if (existingEnrollment) {
            if (existingEnrollment.course_id !== allocatedCourseId) {
              await createEnrollment({
                ...existingEnrollment,
                course_id: allocatedCourseId
              });
            }
          } else {
            const newEnrollment: Enrollment = {
              id: `enr_${Date.now()}`,
              student_id: editingStudent.id,
              course_id: allocatedCourseId,
              progress_percentage: 0,
              status: 'active'
            };
            await createEnrollment(newEnrollment);
          }
        }
        setSuccess('Student updated successfully');
      } else {
        if (!studentFormData.password_hash) {
          setError('A password is required when creating a new student.');
          setFormLoading(false);
          return;
        }
        await createUser(userPayload);

        // Automatically enroll in allocated course on creation
        if (allocatedCourseId) {
          const newEnrollment: Enrollment = {
            id: `enr_${Date.now()}`,
            student_id: userPayload.id,
            course_id: allocatedCourseId,
            progress_percentage: 0,
            status: 'active'
          };
          await createEnrollment(newEnrollment);
        }
        setSuccess('Student created successfully');
      }
      setIsStudentModalOpen(false);
      fetchStudents();
      fetchAllEnrollments();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(`Student Operation Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await deleteUser(id);
      setStudents(students.filter(s => s.id !== id));
      setSuccess('Student deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete student');
    }
  };

  const handleOpenEnrollModal = (student: User) => {
    setSelectedStudentForEnroll(student);
    setEnrollCourseId(courses.length > 0 ? courses[0].id : '');
    setIsEnrollModalOpen(true);
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForEnroll || !enrollCourseId) return;

    setFormLoading(true);
    try {
      const newEnrollment: Enrollment = {
        id: `enr_${Date.now()}`,
        student_id: selectedStudentForEnroll.id,
        course_id: enrollCourseId,
        progress_percentage: 0,
        status: 'active'
      };
      await createEnrollment(newEnrollment);
      setSuccess(`Successfully enrolled ${selectedStudentForEnroll.name}`);
      setIsEnrollModalOpen(false);
      fetchAllEnrollments();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Enrollment Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFormLoading(false);
    }
  };


  const handleLogin = (password: string) => {
    const now = Date.now();

    // Check if account is currently locked out
    if (lockedUntil > now) {
      const remainingMins = Math.ceil((lockedUntil - now) / 60000);
      setLoginError(`Too many failed attempts. Please try again in ${remainingMins} minute(s).`);
      return;
    }

    // Block access if the env var is not configured
    if (!ADMIN_PASSWORD) {
      setLoginError('Admin access is not configured. Please set VITE_ADMIN_PASSWORD in your environment.');
      return;
    }

    if (password === ADMIN_PASSWORD) {
      // Success — clear lockout state
      const newAttempts = 0;
      setLoginAttempts(newAttempts);
      sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);
      sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
      setLockedUntil(0);

      setIsAuthenticated(true);
      setLoginError(null);
      localStorage.setItem('cynexai_admin_auth', 'true');
    } else {
      // Failed attempt — increment counter
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, String(newAttempts));

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockoutTime = Date.now() + LOCKOUT_DURATION_MS;
        setLockedUntil(lockoutTime);
        sessionStorage.setItem(LOCKOUT_UNTIL_KEY, String(lockoutTime));
        setLoginError(`Access locked for 15 minutes after ${MAX_LOGIN_ATTEMPTS} failed attempts.`);
      } else {
        const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
        setLoginError(`Invalid security password. ${remaining} attempt(s) remaining.`);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cynexai_admin_auth');
    setIsAuthenticated(false);
  };

  const handleRunDiagnostics = async () => {
    setDiagLoading(true);
    setError(null);
    try {
      const result = await testConnection();
      setDiagResult(result);
      if (result.success) {
        setSuccess('Cloud Connection Verified');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`Diagnostic Alert: ${result.message}`);
      }
    } catch (err: unknown) {
      setError(`Diagnostic Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDiagLoading(false);
    }
  };

  const handleResetLocal = () => {
    if (window.confirm('This will clear your local backup storage. Cloud data will remain. Continue?')) {
      clearLocalFallback();
      setPosts([]);
      setSuccess('Local storage cleared');
    }
  };

  const handlePopulateSample = async () => {
    if (window.confirm('This will add a sample post to verify Cloud connection. Continue?')) {
      setDiagLoading(true);
      try {
        const result = await populateSampleData();
        if (result?.success) {
          setSuccess('Sample post injected successfully');
          fetchPosts();
        } else {
          setError('Injection Failed');
        }
      } catch (err: unknown) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setDiagLoading(false);
      }
    }
  };

  const handleGenerateAI = async () => {
    if (window.confirm('This will add 5 advanced AI articles to your database. Continue?')) {
      setDiagLoading(true);
      try {
        let count = 0;
        for (const post of advancedAiPosts) {
          const id = generateSlug(post.title);
          const exists = posts.some(p => p.id === id);
          if (!exists) {
            await createPost({
              ...post,
              id,
              date: new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })
            });
            count++;
          }
        }
        setSuccess(`Successfully added ${count} new AI articles!`);
        fetchPosts();
      } catch (err: unknown) {
        setError(`Generation Failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setDiagLoading(false);
      }
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} error={loginError} />;
  }

  return (
    <div className="dark h-screen overflow-hidden bg-[#0a0a0a] flex flex-col md:flex-row pt-16 sm:pt-20 text-slate-200">
      {/* Mobile Header / Hamburger Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-[#0f172a] sticky top-16 z-40">
        <h1 className="text-lg font-bold text-white">Admin Portal</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-400 hover:text-white transition-colors">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 shrink-0 bg-[#0f172a] border-r border-slate-800 md:h-[calc(100vh-5rem)] md:sticky md:top-20 overflow-y-auto no-scrollbar z-30`}>
        <div className="p-5 border-b border-slate-800 hidden md:block">
          <h1 className="text-xl font-bold text-white">Admin Portal</h1>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Operational Dashboard</p>
        </div>
        <nav className="p-3 space-y-1">
          {([
            { id: 'articles', label: 'Articles', Icon: FileText },
            { id: 'courses', label: 'Courses', Icon: BookOpen },
            { id: 'coursemanager', label: 'Course Manager', Icon: BookOpen },
            { id: 'live_activity', label: 'Live Activity', Icon: Activity },
            { id: 'students', label: 'Students', Icon: ShieldCheck },
            { id: 'tickets', label: 'Support', Icon: MessageSquare },
            { id: 'reviews', label: 'Reviews', Icon: Star },
            { id: 'leaderboard', label: 'Leaderboard', Icon: Trophy },
            { id: 'referrals', label: 'Referrals', Icon: Gift },
            { id: 'dailyquiz', label: 'Daily Quiz', Icon: Brain },
            { id: 'attendance', label: 'Attendance', Icon: Clock },
            { id: 'certificates', label: 'Certs', Icon: Award },
            { id: 'doubts', label: 'Doubts', Icon: MessageSquare },
            { id: 'coding', label: 'Coding Problems', Icon: Terminal },
            { id: 'faqs', label: 'FAQs', Icon: HelpCircle },
            { id: 'recordings', label: 'Recordings', Icon: Video },
            { id: 'mocktests', label: 'Mock Tests', Icon: ClipboardList },
            { id: 'projects', label: 'Projects', Icon: Briefcase },
          ] as { id: typeof activeTab; label: string; Icon: React.ComponentType<{className?: string}> }[]).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors text-sm ${
                activeTab === id ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          {/* Header Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white hidden md:block">
                {activeTab === 'coursemanager' ? 'Course Manager' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {activeTab === 'articles' && 'Manage your blog articles and insights.'}
                {activeTab === 'courses' && 'Manage your training courses and curriculum.'}
                {activeTab === 'coursemanager' && 'Advanced day-by-day curriculum builder.'}
                {activeTab === 'students' && 'Manage student enrollments and profiles.'}
                {activeTab === 'tickets' && 'Respond to student helpdesk requests.'}
                {activeTab === 'reviews' && 'Manage graduate success stories and testimonials.'}
                {activeTab === 'faqs' && 'Manage frequently asked questions and answers.'}
                {activeTab === 'recordings' && 'Manage daily class recordings and student batches.'}
                {activeTab === 'mocktests' && 'Manage student mock tests and question banks.'}
                {activeTab === 'projects' && 'Review student capstone projects.'}
                {activeTab === 'leaderboard' && 'Manage student rankings and performance.'}
                {activeTab === 'certificates' && 'Upload and manage student certificates.'}
                {activeTab === 'attendance' && 'Track daily student attendance.'}
                {activeTab === 'coding' && 'Manage coding questions.'}
                {activeTab === 'doubts' && 'Resolve student doubts.'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {['articles', 'courses', 'students', 'tickets', 'reviews'].includes(activeTab) && (
                <button
                  onClick={handleDownloadReport}
                  className="inline-flex items-center px-4 py-2 sm:px-5 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-md transition-all shadow-sm text-sm"
                  title="Download Report as CSV"
                >
                  <Download className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Download Report</span>
                  <span className="sm:hidden">Download</span>
                </button>
              )}
              {['articles', 'courses', 'students', 'tickets', 'reviews'].includes(activeTab) && (
                <button
                onClick={() => {
                  if (activeTab === 'articles') handleOpenModal();
                  else if (activeTab === 'courses') handleOpenCourseModal();
                  else if (activeTab === 'students') handleOpenStudentModal();
                  else if (activeTab === 'tickets') setIsAdminTicketModalOpen(true);
                  else if (activeTab === 'reviews') handleOpenReviewModal();
                }}
                className="inline-flex items-center px-4 py-2 sm:px-5 sm:py-2.5 bg-white hover:bg-slate-200 text-black font-semibold rounded-md transition-all shadow-sm text-sm"
                title={activeTab === 'tickets' ? 'Create Support Ticket' : activeTab === 'reviews' ? 'Add Success Story' : `Create New ${activeTab.slice(0, -1)}`}
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">
                {activeTab === 'articles' && 'New Article'}
                {activeTab === 'courses' && 'New Course'}
                {activeTab === 'students' && 'New Student'}
                {activeTab === 'tickets' && 'Create Ticket'}
                {activeTab === 'reviews' && 'New Success Story'}
                </span>
                <span className="sm:hidden">New</span>
              </button>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 font-semibold rounded-md transition-colors text-sm border border-transparent hover:border-red-400/20"
                title="Logout"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
  
          {/* Notifications */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-green-50 border-l-4 border-green-400 p-4 mb-8 rounded-r-xl shadow-sm flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <p className="text-sm text-green-700 font-medium">{success}</p>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded-r-xl shadow-sm flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search and Filters */}
        {['articles', 'courses', 'students', 'tickets', 'reviews'].includes(activeTab) && (
          <div className="bg-[#0f172a] rounded-md shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-slate-800 p-4 mb-8">
            <div className="relative border-slate-800">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by title or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-secondary/5 border border-transparent focus:bg-[#41c8df]/10 focus:border-[#41c8df] rounded-xl outline-none transition-all text-secondary placeholder:text-gray-500"
              />
            </div>
          </div>
        )}

        {/* Content Table */}
        {['articles', 'courses', 'students', 'tickets', 'reviews'].includes(activeTab) ? (
          <div className="bg-[#0f172a] rounded-md shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto border-slate-800">
              {activeTab === 'articles' ? (
              <table className="w-full text-left">
                <thead className="bg-secondary/5 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Article</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#41c8df] rounded-full animate-spin" />
                          <span className="text-sm font-medium">Loading articles...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="w-12 h-12 text-gray-100 mb-2" />
                          <span className="text-sm font-medium">No articles found</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-secondary/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-secondary/10 rounded-lg overflow-hidden flex-shrink-0">
                              {post.image ? (
                                <img src={post.image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                  <ImageIcon size={20} />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-secondary line-clamp-1">{post.title}</div>
                              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium">ID: {post.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#41c8df]/10 border border-[#41c8df]/30 text-[#41c8df] uppercase">
                            {post.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {post.isVisible ? (
                              <span className="flex items-center text-xs font-bold text-green-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-600 mr-2" />
                                PUBLISHED
                              </span>
                            ) : (
                              <span className="flex items-center text-xs font-bold text-gray-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2" />
                                HIDDEN
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 font-medium">
                          {post.date}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleToggleVisibility(post.id, post.isVisible)}
                              className="p-2 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 border border-transparent hover:border-[#41c8df]/30 rounded-lg transition-all"
                              title={post.isVisible ? "Hide Post" : "Show Post"}
                            >
                              {post.isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button
                              onClick={() => handleOpenModal(post)}
                              className="p-2 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 border border-transparent hover:border-[#41c8df]/30 rounded-lg transition-all"
                              title="Edit Post"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-lg transition-all"
                              title="Delete Post"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeTab === 'courses' ? (
              <div className="space-y-4">
                {loading ? (
                  <div className="px-6 py-12 text-center text-gray-400 bg-secondary/5 rounded-xl border border-slate-800">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-[#41c8df] rounded-full animate-spin" />
                      <span className="text-sm font-medium">Loading courses...</span>
                    </div>
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-400 bg-secondary/5 rounded-xl border border-slate-800">
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen className="w-12 h-12 text-gray-100 mb-2" />
                      <span className="text-sm font-medium">No courses found</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredCourses.map((course) => {
                      const enrolledCount = allEnrollments.filter(e => e.course_id === course.id).length;
                      const courseBatches = batches.filter(b => b.course_id === course.id);
                      const isExpanded = activeCourseId === course.id;
                      let parsedModules: string[] = [];
                      try {
                        parsedModules = JSON.parse(course.modules || '[]');
                      } catch {
                        parsedModules = [];
                      }

                      return (
                        <div key={course.id} className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all">
                          {/* Course Header */}
                          <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-secondary/5 border-b border-slate-800/50">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-secondary/10 rounded-lg overflow-hidden flex-shrink-0 border border-slate-800">
                                <img src={course.image} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-secondary">{course.title}</h3>
                                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium">ID: {course.id} • {course.duration}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary/10 border border-secondary/30 text-[10px] font-bold text-gray-300 uppercase">
                                    {course.level}
                                  </span>
                                  {course.isVisible ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold text-cyan-400">
                                      PUBLISHED
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-500/10 border border-gray-500/30 text-[10px] font-bold text-gray-400">
                                      DRAFT
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleOpenEnrollmentAnalytics(course)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#41c8df]/10 border border-[#41c8df]/30 text-[10px] font-bold text-[#41c8df] hover:bg-[#41c8df]/20 transition-all"
                                  >
                                    <Users size={10} /> {enrolledCount} Enrolled
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Batches & Actions */}
                            <div className="flex flex-col sm:flex-row md:items-center gap-4 w-full md:w-auto justify-end">
                              {courseBatches.length > 0 && (
                                <div className="flex flex-wrap gap-1 items-center">
                                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mr-1">Batches:</span>
                                  {courseBatches.map(b => (
                                    <span key={b.id} className="px-2 py-0.5 bg-slate-800 text-gray-300 rounded text-[10px] font-semibold border border-slate-700">
                                      {b.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenAiGenerator(course)}
                                  className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30 rounded-lg transition-all"
                                  title="AI Curriculum Generator"
                                >
                                  <Sparkles size={18} />
                                </button>
                                <button
                                  onClick={() => handleToggleCourseVisibility(course.id, course.isVisible)}
                                  className="p-2 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 border border-transparent hover:border-[#41c8df]/30 rounded-lg transition-all"
                                  title={course.isVisible ? "Make Draft" : "Publish Course"}
                                >
                                  {course.isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                                <button
                                  onClick={() => handleOpenCourseModal(course)}
                                  className="p-2 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 border border-transparent hover:border-[#41c8df]/30 rounded-lg transition-all"
                                  title="Edit Course"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-lg transition-all"
                                  title="Delete Course"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleToggleCourseOutline(course.id)}
                                  className="p-2 text-slate-300 hover:text-white bg-slate-800 border border-slate-700 rounded-lg transition-all"
                                  title="Toggle Curriculum Builder"
                                >
                                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Curriculum Tree Builder */}
                          {isExpanded && (
                            <div className="p-6 bg-background/30 border-t border-slate-800/80 space-y-6">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                <h4 className="text-sm font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-[#41c8df]" />
                                  Course Curriculum Builder
                                </h4>
                                <button
                                  onClick={() => handleOpenAiGenerator(course)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 rounded-lg text-xs font-bold transition-all"
                                >
                                  <Sparkles size={12} />
                                  CynexAI Curriculum Generator
                                </button>
                              </div>

                              {parsedModules.length === 0 ? (
                                <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl space-y-2">
                                  <p className="text-sm text-gray-500">No modules added yet for this course.</p>
                                  <p className="text-xs text-gray-600">Use the AI generator or add your first module below.</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {parsedModules.map((moduleName, modIndex) => {
                                    const moduleLessons = (courseLessons[course.id] || [])
                                      .filter(l => l.module_name === moduleName)
                                      .sort((a, b) => a.order_index - b.order_index);

                                    return (
                                      <div key={moduleName} className="border border-slate-800 rounded-lg bg-secondary/5 overflow-hidden">
                                        {/* Module Header */}
                                        <div className="p-4 bg-slate-900/40 flex items-center justify-between border-b border-slate-800/60">
                                          <div className="flex items-center gap-2.5">
                                            <span className="w-6 h-6 bg-[#41c8df]/15 text-[#41c8df] border border-[#41c8df]/30 rounded flex items-center justify-center text-xs font-bold">
                                              {modIndex + 1}
                                            </span>
                                            <span className="text-sm font-bold text-gray-200">{moduleName}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => handleOpenLessonModal(course.id, moduleName)}
                                              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all"
                                            >
                                              <Plus size={14} /> Add Lesson
                                            </button>
                                            <button
                                              onClick={async () => {
                                                if (window.confirm(`Delete module "${moduleName}"? This will not delete lessons, but they will become unassigned.`)) {
                                                  const newModules = parsedModules.filter((_, idx) => idx !== modIndex);
                                                  await updateCourse({ ...course, modules: JSON.stringify(newModules) });
                                                  fetchCourses();
                                                }
                                              }}
                                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                                              title="Remove Module"
                                            >
                                              <X size={15} />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Lessons List */}
                                        <div className="divide-y divide-slate-800/50">
                                          {moduleLessons.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-gray-500 italic">
                                              No lessons in this module. Click "Add Lesson" to add one.
                                            </div>
                                          ) : (
                                            moduleLessons.map((lesson, index) => {
                                              const hasPrereq = lesson.prerequisite_lesson_id;
                                              const prereqTitle = hasPrereq 
                                                ? (courseLessons[course.id] || []).find(l => l.id === lesson.prerequisite_lesson_id)?.lesson_title 
                                                : '';
                                              const isSessionActive = activeSession && activeSession.lesson_id === lesson.id && activeSession.is_active === 1;

                                              return (
                                                <div key={lesson.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/10 transition-colors">
                                                  <div className="flex items-start gap-3">
                                                    {/* Sort Controls */}
                                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                                      <button
                                                        onClick={() => handleMoveLesson(course.id, lesson.id, 'up')}
                                                        disabled={index === 0}
                                                        className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500"
                                                      >
                                                        <ArrowUp size={14} />
                                                      </button>
                                                      <button
                                                        onClick={() => handleMoveLesson(course.id, lesson.id, 'down')}
                                                        disabled={index === moduleLessons.length - 1}
                                                        className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500"
                                                      >
                                                        <ArrowDown size={14} />
                                                      </button>
                                                    </div>
                                                    <div>
                                                      <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-bold text-slate-300">{lesson.lesson_title}</span>
                                                        <span className="text-[10px] text-gray-500 font-semibold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50 flex items-center gap-1">
                                                          <Clock size={10} /> {lesson.duration || 15} mins
                                                        </span>
                                                        {lesson.is_published === 0 ? (
                                                          <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20">DRAFT</span>
                                                        ) : (
                                                          <span className="text-[9px] font-bold bg-cyan-500/10 text-cyan-400 px-1 py-0.2 rounded border border-cyan-500/20">ACTIVE</span>
                                                        )}
                                                        {hasPrereq && (
                                                          <span className="text-[9px] font-bold bg-purple-500/10 text-purple-400 px-1.5 py-0.2 rounded border border-purple-500/20 flex items-center gap-1">
                                                            <Lock size={9} /> Prereq: {prereqTitle || 'Locked'}
                                                          </span>
                                                        )}
                                                      </div>
                                                      {lesson.description && (
                                                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{lesson.description}</p>
                                                      )}
                                                    </div>
                                                  </div>

                                                  {/* Lesson Operations */}
                                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                                    {/* Live Attendance session control */}
                                                    {isSessionActive ? (
                                                      <button
                                                        onClick={() => {
                                                          setLiveSessionLessonId(lesson.id);
                                                          setIsLiveSessionOpen(true);
                                                          refreshAttendanceCheckInsList();
                                                        }}
                                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/15 border border-green-500/30 text-green-400 rounded-md text-xs font-bold hover:bg-green-500/20 transition-all animate-pulse"
                                                      >
                                                        <Activity size={12} />
                                                        PIN: {activeSession.attendance_pin}
                                                      </button>
                                                    ) : (
                                                      <button
                                                        onClick={() => handleToggleLiveAttendance(lesson.id)}
                                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-md text-xs font-bold hover:border-slate-500 transition-all"
                                                      >
                                                        <Clock size={12} />
                                                        Live PIN
                                                      </button>
                                                    )}

                                                    <button
                                                      onClick={() => handleOpenLessonModal(course.id, moduleName, lesson)}
                                                      className="p-1.5 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 rounded-md border border-transparent hover:border-[#41c8df]/20 transition-all"
                                                      title="Manage Lesson & Resource Vault"
                                                    >
                                                      <Link2 size={16} />
                                                    </button>
                                                    <button
                                                      onClick={() => handleOpenLessonModal(course.id, moduleName, lesson)}
                                                      className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-all"
                                                      title="Edit Lesson"
                                                    >
                                                      <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeleteLesson(course.id, lesson.id)}
                                                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                                      title="Delete Lesson"
                                                    >
                                                      <Trash2 size={16} />
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Create Module Form */}
                              <form
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  const form = e.currentTarget;
                                  const input = form.elements.namedItem('moduleName') as HTMLInputElement;
                                  const newModuleName = input.value.trim();
                                  if (!newModuleName) return;
                                  if (parsedModules.includes(newModuleName)) {
                                    alert('Module name already exists');
                                    return;
                                  }
                                  const updatedModules = [...parsedModules, newModuleName];
                                  try {
                                    await updateCourse({ ...course, modules: JSON.stringify(updatedModules) });
                                    input.value = '';
                                    fetchCourses();
                                  } catch (e) {
                                    alert('Failed to add module');
                                  }
                                }}
                                className="flex gap-2 bg-[#0a0a0a] p-3 rounded-lg border border-slate-800"
                              >
                                <input
                                  type="text"
                                  name="moduleName"
                                  placeholder="Enter new module name (e.g. Module 3: Advanced Concepts)"
                                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-200 outline-none focus:border-[#41c8df] transition-colors"
                                  required
                                />
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-[#41c8df] text-black hover:bg-[#41c8df]/90 rounded-md text-sm font-bold uppercase transition-colors"
                                >
                                  Add Module
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === 'students' ? (
              <table className="w-full text-left">
                <thead className="bg-secondary/5 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <ShieldCheck className="w-12 h-12 text-gray-100 mb-2" />
                          <span className="text-sm font-medium">No students found. Add one above.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    students.map(student => (
                      <tr key={student.id} className="hover:bg-secondary/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[#41c8df] font-bold">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-secondary">{student.name}</div>
                              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium">ID: {student.id.substring(0,8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300 font-medium">{student.email}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#41c8df]/10 border border-[#41c8df]/30 text-[#41c8df] uppercase">
                            {student.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(student.created_at || '').toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEnrollModal(student)}
                              className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 rounded-lg transition-all"
                              title="Enroll in Course"
                            >
                              <PlusCircle size={18} />
                            </button>
                            <button
                              onClick={() => handleOpenStudentModal(student)}
                              className="p-2 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 border border-transparent hover:border-[#41c8df]/30 rounded-lg transition-all"
                              title="Edit Student"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-lg transition-all"
                              title="Delete Student"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeTab === 'tickets' ? (
              <table className="w-full text-left">
                <thead className="bg-secondary/5 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <MessageSquare className="w-12 h-12 text-gray-100 mb-2" />
                          <span className="text-sm font-medium">No active tickets.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tickets.map(ticket => (
                      <tr 
                        key={ticket.id} 
                        onClick={() => handleOpenTicketChat(ticket)}
                        className="hover:bg-white/5 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-secondary group-hover:text-[#41c8df] transition-colors">{ticket.id.substring(0,8)}...</div>
                          <div className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors truncate max-w-[200px]">{ticket.description}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300 font-medium">{ticket.student_id}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#41c8df] bg-[#41c8df]/10 px-2 py-1 rounded-md">
                            {ticket.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            ticket.status === 'resolved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          }`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTicketChat(ticket);
                            }}
                            className="text-xs font-bold text-secondary hover:underline"
                          >
                            Open Chat
                          </button>
                          {ticket.status === 'open' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolveTicket(ticket.id);
                              }}
                              className="text-xs font-bold text-emerald-400 hover:underline border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 rounded-md"
                              title="Resolve Ticket"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeTab === 'reviews' ? (
              <table className="w-full text-left">
                <thead className="bg-secondary/5 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role & Company</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {reviews.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <Star className="w-8 h-8 text-secondary/30 animate-pulse" />
                          <span className="text-sm font-medium">No testimonials found</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reviews.map((rev) => (
                      <tr key={rev.id} className="hover:bg-white/5 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-[#41c8df]/30 overflow-hidden flex-shrink-0 bg-[#41c8df]/10 flex items-center justify-center text-secondary font-bold">
                              {rev.image ? (
                                <img src={rev.image} alt={rev.name} className="w-full h-full object-cover" />
                              ) : (
                                rev.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <span className="font-semibold text-secondary block">{rev.name}</span>
                              <span className="text-xs text-[#41c8df]">{Array(rev.rating).fill('★').join('')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-medium">
                          {rev.role}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {rev.course}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rev.isVisible ? 'bg-green-400/10 text-green-400' : 'bg-gray-400/10 text-gray-400'}`}>
                            {rev.isVisible ? 'Visible' : 'Hidden'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleReviewVisibility(rev.id, rev.isVisible)}
                              className={`p-2 rounded-lg border transition-all ${rev.isVisible ? 'text-gray-400 hover:text-gray-200 hover:bg-white/10 border-transparent' : 'text-[#41c8df] hover:bg-[#41c8df]/10 border-transparent'}`}
                              title={rev.isVisible ? "Hide Success Story" : "Show Success Story"}
                            >
                              {rev.isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button
                              onClick={() => handleOpenReviewModal(rev)}
                              className="p-2 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 border border-transparent hover:border-[#41c8df]/30 rounded-lg transition-all"
                              title="Edit Success Story"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-lg transition-all"
                              title="Delete Success Story"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : null}
            </div>
          </div>
        ) : (
          <div className="w-full">
            {activeTab === 'attendance' ? (
              <AdminAttendance courses={courses} users={students} />
            ) : activeTab === 'certificates' ? (
              <AdminCertificates courses={courses} users={students} />
            ) : activeTab === 'coursemanager' ? (
              <AdminCourseManager courses={courses} onRefresh={fetchCourses} />
            ) : activeTab === 'doubts' ? (
              <AdminDoubtWall adminName="CynexAI Instructor" courses={courses} />
            ) : activeTab === 'coding' ? (
              <AdminCodingProblems courses={courses} />
            ) : activeTab === 'faqs' ? (
              <AdminFAQ />
            ) : activeTab === 'recordings' ? (
              <AdminRecordings />
            ) : activeTab === 'mocktests' ? (
              <AdminMockTests />
            ) : activeTab === 'live_activity' ? (
              <AdminLiveActivity />
            ) : activeTab === 'projects' ? (
              <AdminProjectSubmissions />
            ) : activeTab === 'leaderboard' ? (
              <AdminLeaderboard />
            ) : activeTab === 'referrals' ? (
              <div className="bg-white rounded-xl p-6 text-slate-800"><AdminReferrals /></div>
            ) : activeTab === 'dailyquiz' ? (
              <div className="bg-white rounded-xl p-6 text-slate-800"><AdminDailyQuiz /></div>
            ) : null}
          </div>
        )}
      </div>

      {/* Enrollment Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsEnrollModalOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-lg bg-background border border-secondary/20 rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-secondary">Enroll Student</h2>
              <button onClick={() => setIsEnrollModalOpen(false)} className="text-gray-400 hover:text-secondary" title="Close enrollment modal">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEnrollSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Student</label>
                <div className="px-4 py-3 bg-secondary/5 border border-slate-800 rounded-xl text-gray-300 font-medium">
                  {selectedStudentForEnroll?.name} ({selectedStudentForEnroll?.email})
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Select Course</label>
                <select
                  value={enrollCourseId}
                  onChange={(e) => setEnrollCourseId(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary transition-all"
                  required
                  title="Select Course"
                >
                  <option value="" disabled className="bg-slate-900">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id} className="bg-slate-900">
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-800 text-gray-400 font-bold rounded-xl hover:bg-secondary/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-[#41c8df]/20 flex items-center justify-center gap-2"
                >
                  {formLoading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <ShieldCheck size={20} />}
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {(isModalOpen || isCourseModalOpen) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsModalOpen(false); setIsCourseModalOpen(false); }}
              className="fixed inset-0 bg-background/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-background/90 backdrop-blur-2xl border border-secondary/20 w-full max-w-4xl rounded-[2.5rem] shadow-[0_0_50px_rgba(65,200,223,0.15)] relative z-10 overflow-hidden flex flex-col max-h-full"
            >
              {activeTab === 'articles' ? (
                /* Article Form Modal Content */
                <>
                  <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-secondary/5">
                    <div>
                      <h2 className="text-2xl font-display font-bold text-secondary">
                        {editingPost ? 'Edit Article' : 'New Article'}
                      </h2>
                      <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mt-1">
                        {editingPost ? 'Update existing content' : 'Create high-signal insights'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      aria-label="Close article modal"
                      className="p-3 text-gray-400 hover:text-secondary hover:bg-secondary/10 rounded-md transition-all border border-transparent hover:border-secondary/20"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Article Title</label>
                          <div className="relative group">
                            <Type className="absolute left-4 top-4 text-gray-500 group-focus-within:text-[#41c8df] transition-colors" size={18} />
                            <input
                              required
                              type="text"
                              id="article-title"
                              aria-label="Article title"
                              placeholder="Enter article title"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              className="w-full pl-12 pr-4 py-4 bg-secondary/5 border border-slate-800 focus:bg-secondary/10 focus:border-[#41c8df] rounded-md outline-none transition-all text-secondary font-bold placeholder:text-gray-600"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="relative group">
                            <select
                              id="article-category"
                              aria-label="Article category"
                              title="Select article category"
                              value={formData.category}
                              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                              className="w-full px-4 py-4 bg-secondary/5 border border-slate-800 rounded-md outline-none text-secondary font-bold"
                            >
                              <option value="AI Insights">AI Insights</option>
                              <option value="Tutorials">Tutorials</option>
                              <option value="Case Studies">Case Studies</option>
                              <option value="Industry Trends">Industry Trends</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isVisible: !formData.isVisible })}
                            className={`w-full py-4 px-4 rounded-md font-bold flex items-center justify-center gap-2 border transition-all ${formData.isVisible ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-secondary/5 border-slate-800 text-gray-400'}`}
                          >
                            {formData.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                            {formData.isVisible ? 'Visible' : 'Hidden'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Cover Image URL / Upload</label>
                        <div className="space-y-4">
                          <input
                            type="text"
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            placeholder="Paste image URL here..."
                            className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 rounded-xl text-secondary text-sm"
                          />
                          <div className="relative w-full aspect-video rounded-md overflow-hidden border border-slate-800 bg-secondary/5">
                            {formData.image ? <img src={formData.image} className="w-full h-full object-cover" alt="" /> : <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500"><ImageIcon className="mb-2" /><span>No Image</span></div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Article Content (Markdown)</label>
                      <textarea
                        required
                        id="article-content"
                        aria-label="Article content in Markdown"
                        placeholder="Write your article content here (Markdown supported)..."
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        className="w-full h-[320px] p-6 bg-secondary/5 border border-slate-800 focus:bg-secondary/10 focus:border-[#41c8df] rounded-lg outline-none transition-all text-secondary leading-relaxed font-medium resize-none"
                      />
                    </div>
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-end gap-4">
                       <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-gray-400 hover:text-secondary font-bold uppercase text-xs">Cancel</button>
                       <button type="submit" disabled={formLoading} className="px-10 py-4 bg-white text-black font-black uppercase text-xs rounded-md transition-all shadow-xl disabled:opacity-50">
                          {formLoading ? 'Processing...' : editingPost ? 'Update Post' : 'Publish Article'}
                       </button>
                    </div>
                  </form>
                </>
              ) : (
                /* Course Form Modal Content */
                <>
                  <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-secondary/5">
                    <div>
                      <h2 className="text-2xl font-display font-bold text-secondary">
                        {editingCourse ? 'Edit Course' : 'New Course'}
                      </h2>
                      <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mt-1">
                        Define course curriculum and details
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCourseModalOpen(false)}
                      aria-label="Close course modal"
                      className="p-3 text-gray-400 hover:text-secondary hover:bg-secondary/10 rounded-md transition-all border border-transparent hover:border-secondary/20"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleCourseFormSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">

                    {/* ── Section 1: Hero Info ── */}
                    <div>
                      <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">1</span>
                        Hero Section
                      </p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Course Title *</label>
                            <input required type="text" id="course-title" aria-label="Course title"
                              placeholder="e.g., Data Science & Machine Learning"
                              value={courseFormData.title}
                              onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
                              className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none transition-all text-secondary font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Subtitle</label>
                            <input type="text"
                              placeholder="e.g., Unlock Insights from Data & Build Predictive Models"
                              value={courseFormData.subtitle}
                              onChange={(e) => setCourseFormData({ ...courseFormData, subtitle: e.target.value })}
                              className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none transition-all text-secondary"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Description *</label>
                            <textarea required
                              value={courseFormData.description}
                              onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                              className="w-full h-28 p-4 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl text-secondary resize-none outline-none"
                              placeholder="Full course description shown in hero section..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Duration</label>
                              <input type="text" placeholder="e.g., 6 months"
                                value={courseFormData.duration}
                                onChange={(e) => setCourseFormData({ ...courseFormData, duration: e.target.value })}
                                className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Placement %</label>
                              <input type="text" placeholder="e.g., 95%"
                                value={courseFormData.placement}
                                onChange={(e) => setCourseFormData({ ...courseFormData, placement: e.target.value })}
                                className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Level</label>
                              <select id="course-level" aria-label="Course level" title="Course level"
                                value={courseFormData.level}
                                onChange={(e) => setCourseFormData({ ...courseFormData, level: e.target.value })}
                                className="w-full px-3 py-3 bg-secondary/5 border border-slate-800 rounded-xl outline-none text-secondary text-sm"
                              >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                                <option value="Professional">Professional</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Students</label>
                              <input type="text" placeholder="e.g., 150+"
                                value={courseFormData.students}
                                onChange={(e) => setCourseFormData({ ...courseFormData, students: e.target.value })}
                                className="w-full px-3 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Rating</label>
                              <input type="number" step="0.1" min="1" max="5" id="course-rating" aria-label="Course rating"
                                placeholder="4.8"
                                value={courseFormData.rating}
                                onChange={(e) => setCourseFormData({ ...courseFormData, rating: parseFloat(e.target.value) })}
                                className="w-full px-3 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Course ID (Slug)</label>
                            <input type="text" placeholder="e.g., ai-ml-bootcamp (auto-generated if empty)"
                              value={courseFormData.id}
                              onChange={(e) => setCourseFormData({ ...courseFormData, id: e.target.value })}
                              className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 rounded-xl outline-none text-secondary text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Course Image URL</label>
                            <input type="text" placeholder="https://... or /local-image.png"
                              value={courseFormData.image}
                              onChange={(e) => setCourseFormData({ ...courseFormData, image: e.target.value })}
                              className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                            />
                          </div>
                          <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-800 bg-secondary/5 flex items-center justify-center">
                            {courseFormData.image
                              ? <img src={courseFormData.image} className="w-full h-full object-cover" alt="Preview" />
                              : <div className="flex flex-col items-center text-gray-500"><ImageIcon size={32} /><span className="text-xs mt-2">No Image</span></div>
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Section 2: Skills ── */}
                    <div className="border-t border-slate-800 pt-8">
                      <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">2</span>
                        Skills You'll Gain
                      </p>
                      <div className="space-y-2">
                        {courseFormData.skills.map((skill, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" value={skill}
                              onChange={(e) => { const u = [...courseFormData.skills]; u[i] = e.target.value; setCourseFormData({ ...courseFormData, skills: u }); }}
                              placeholder="e.g., Python"
                              className="flex-1 px-4 py-2.5 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                            />
                            <button type="button" 
                              onClick={() => setCourseFormData({ ...courseFormData, skills: courseFormData.skills.filter((_, idx) => idx !== i) })}
                              className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                              title="Remove skill"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setCourseFormData({ ...courseFormData, skills: [...courseFormData.skills, ''] })}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#41c8df]/10 text-[#41c8df] rounded-xl text-sm font-bold hover:bg-[#41c8df]/20 transition-all">
                          <Plus size={14} /> Add Skill
                        </button>
                      </div>
                    </div>

                    {/* ── Section 3: Learning Outcomes ── */}
                    <div className="border-t border-slate-800 pt-8">
                      <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">3</span>
                        Learning Outcomes (What You'll Learn)
                      </p>
                      <div className="space-y-2">
                        {courseFormData.outcomes.map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" value={item}
                              onChange={(e) => { const u = [...courseFormData.outcomes]; u[i] = e.target.value; setCourseFormData({ ...courseFormData, outcomes: u }); }}
                              placeholder="e.g., Build end-to-end machine learning pipelines"
                              className="flex-1 px-4 py-2.5 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                            />
                            <button type="button" 
                              onClick={() => setCourseFormData({ ...courseFormData, outcomes: courseFormData.outcomes.filter((_, idx) => idx !== i) })}
                              className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                              title="Remove outcome"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setCourseFormData({ ...courseFormData, outcomes: [...courseFormData.outcomes, ''] })}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#41c8df]/10 text-[#41c8df] rounded-xl text-sm font-bold hover:bg-[#41c8df]/20 transition-all">
                          <Plus size={14} /> Add Outcome
                        </button>
                      </div>
                    </div>

                    {/* ── Section 4: Curriculum Modules ── */}
                    <div className="border-t border-slate-800 pt-8">
                      <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">4</span>
                        Course Curriculum (Modules)
                      </p>
                      <div className="space-y-2">
                        {courseFormData.modules.map((mod, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <span className="w-7 h-7 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                            <input type="text" value={mod}
                              onChange={(e) => { const u = [...courseFormData.modules]; u[i] = e.target.value; setCourseFormData({ ...courseFormData, modules: u }); }}
                              placeholder="e.g., Python Programming Fundamentals"
                              className="flex-1 px-4 py-2.5 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                            />
                            <button type="button" 
                              onClick={() => setCourseFormData({ ...courseFormData, modules: courseFormData.modules.filter((_, idx) => idx !== i) })}
                              className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                              title="Remove module"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setCourseFormData({ ...courseFormData, modules: [...courseFormData.modules, ''] })}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#41c8df]/10 text-[#41c8df] rounded-xl text-sm font-bold hover:bg-[#41c8df]/20 transition-all">
                          <Plus size={14} /> Add Module
                        </button>
                      </div>
                    </div>

                    {/* ── Section 5: Prerequisites ── */}
                    <div className="border-t border-slate-800 pt-8">
                      <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">5</span>
                        Prerequisites
                      </p>
                      <div className="space-y-2">
                        {courseFormData.prerequisites.map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" value={item}
                              onChange={(e) => { const u = [...courseFormData.prerequisites]; u[i] = e.target.value; setCourseFormData({ ...courseFormData, prerequisites: u }); }}
                              placeholder="e.g., Basic programming knowledge (Python preferred)"
                              className="flex-1 px-4 py-2.5 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                            />
                            <button type="button" 
                              onClick={() => setCourseFormData({ ...courseFormData, prerequisites: courseFormData.prerequisites.filter((_, idx) => idx !== i) })}
                              className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                              title="Remove prerequisite"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setCourseFormData({ ...courseFormData, prerequisites: [...courseFormData.prerequisites, ''] })}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#41c8df]/10 text-[#41c8df] rounded-xl text-sm font-bold hover:bg-[#41c8df]/20 transition-all">
                          <Plus size={14} /> Add Prerequisite
                        </button>
                      </div>
                    </div>

                    {/* ── Section 6: Career Paths ── */}
                    <div className="border-t border-slate-800 pt-8">
                      <p className="text-xs font-black text-[#41c8df] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[10px]">6</span>
                        Potential Career Paths
                      </p>
                      <div className="space-y-2">
                        {courseFormData.career.map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" value={item}
                              onChange={(e) => { const u = [...courseFormData.career]; u[i] = e.target.value; setCourseFormData({ ...courseFormData, career: u }); }}
                              placeholder="e.g., Data Scientist"
                              className="flex-1 px-4 py-2.5 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                            />
                            <button type="button" 
                              onClick={() => setCourseFormData({ ...courseFormData, career: courseFormData.career.filter((_, idx) => idx !== i) })}
                              className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                              title="Remove career path"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setCourseFormData({ ...courseFormData, career: [...courseFormData.career, ''] })}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#41c8df]/10 text-[#41c8df] rounded-xl text-sm font-bold hover:bg-[#41c8df]/20 transition-all">
                          <Plus size={14} /> Add Career Path
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-end gap-4">
                      <button type="button" onClick={() => setIsCourseModalOpen(false)} className="px-8 py-4 text-gray-400 hover:text-secondary font-bold uppercase text-xs">Cancel</button>
                      <button type="submit" disabled={formLoading} className="px-10 py-4 bg-white text-black font-black uppercase text-xs rounded-md transition-all shadow-xl disabled:opacity-50">
                        {formLoading ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lesson Editor & Resource Vault Manager Modal */}
      <AnimatePresence>
        {isLessonModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsLessonModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-background/90 backdrop-blur-2xl border border-slate-800 rounded-xl p-8 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsLessonModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close Modal">
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold text-secondary mb-2 flex items-center gap-3">
                <BookOpen className="text-[#41c8df]" />
                {editingLesson ? 'Edit Lesson & Resource Vault' : 'Create New Lesson'}
              </h2>
              <p className="text-sm text-gray-400 mb-8">
                {editingLesson ? 'Configure lesson video, description, prerequisites, and resource vault assets.' : 'Add a new lesson node to this module outline.'}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lesson Details Form */}
                <form onSubmit={handleLessonFormSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="lesson-title-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lesson Title *</label>
                    <input
                      id="lesson-title-input"
                      type="text"
                      required
                      value={lessonFormData.lesson_title}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, lesson_title: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm font-medium"
                      placeholder="e.g., Intro to Neural Networks"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="lesson-duration-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Duration (Minutes)</label>
                      <input
                        id="lesson-duration-input"
                        type="number"
                        min="1"
                        required
                        value={lessonFormData.duration || 15}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, duration: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="lesson-published-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                      <select
                        id="lesson-published-input"
                        value={lessonFormData.is_published}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, is_published: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm font-medium"
                      >
                        <option value="1">Published / Active</option>
                        <option value="0">Draft / Hidden</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="lesson-video-url-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Video URL (YouTube or MP4)</label>
                    <input
                      id="lesson-video-url-input"
                      type="text"
                      value={lessonFormData.video_url}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, video_url: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm font-medium"
                      placeholder="e.g., https://www.youtube.com/watch?v=..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="lesson-prereq-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prerequisite Lesson Link</label>
                    <select
                      id="lesson-prereq-input"
                      value={lessonFormData.prerequisite_lesson_id || ''}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, prerequisite_lesson_id: e.target.value || undefined })}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm font-medium cursor-pointer"
                    >
                      <option value="">None (Always Unlocked)</option>
                      {(courseLessons[lessonFormData.course_id] || [])
                        .filter(l => l.id !== lessonFormData.id)
                        .map(l => (
                          <option key={l.id} value={l.id}>{l.lesson_title}</option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="lesson-desc-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lesson Description</label>
                    <textarea
                      id="lesson-desc-input"
                      rows={3}
                      value={lessonFormData.description || ''}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm font-medium resize-none"
                      placeholder="Brief overview of concept covered in this lesson..."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-5">
                    <button
                      type="button"
                      onClick={() => setIsLessonModalOpen(false)}
                      className="px-5 py-2.5 text-gray-400 hover:text-white text-xs font-bold uppercase transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#41c8df] text-black font-bold text-xs uppercase rounded-lg hover:bg-[#41c8df]/90 transition-all"
                    >
                      {editingLesson ? 'Save Changes' : 'Create Lesson'}
                    </button>
                  </div>
                </form>

                {/* Resource Vault Manager */}
                <div className="border-l border-slate-800/80 pl-0 lg:pl-8 space-y-6">
                  <div>
                    <h3 className="text-xs font-black text-[#41c8df] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <Link2 size={14} />
                      Resource Vault Assets
                    </h3>
                    <p className="text-xs text-gray-400">
                      Link course material, slides, GitHub repositories, and exercise download bundles directly to this lesson.
                    </p>
                  </div>

                  {!editingLesson ? (
                    <div className="text-center py-12 bg-secondary/5 border border-slate-800 rounded-xl">
                      <Lock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-medium">Please create and save the lesson first to unlock the Resource Vault Manager.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Active Vault list */}
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                        {lessonResourcesList.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No resources attached to this lesson vault.</p>
                        ) : (
                          lessonResourcesList.map(res => (
                            <div key={res.id} className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 bg-slate-800 text-[#41c8df] border border-slate-700/80 rounded uppercase font-bold text-[9px]">
                                  {res.resource_type}
                                </span>
                                <span className="font-semibold text-gray-300 truncate max-w-[200px]" title={res.title}>{res.title}</span>
                              </div>
                              <button
                                onClick={() => handleResourceDelete(res.id)}
                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add resource form */}
                      <form onSubmit={handleResourceAdd} className="bg-slate-900/60 p-4 border border-slate-800 rounded-xl space-y-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block border-b border-slate-800 pb-2">Attach New Vault Asset</span>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label htmlFor="res-type" className="text-[10px] text-gray-500 font-bold block uppercase">Asset Type</label>
                            <select
                              id="res-type"
                              value={newResourceForm.resource_type}
                              onChange={(e) => setNewResourceForm({ ...newResourceForm, resource_type: e.target.value as any })}
                              className="w-full bg-[#0a0a0a] border border-slate-800 rounded-lg p-2 text-xs text-gray-300 outline-none"
                            >
                              <option value="slides">Slide Deck</option>
                              <option value="github">GitHub Repo</option>
                              <option value="pdf">PDF Study Guide</option>
                              <option value="zip">ZIP Exercise Bundle</option>
                              <option value="figma">Figma Design File</option>
                              <option value="notion">Notion Document</option>
                              <option value="sandbox">Coding Sandbox</option>
                              <option value="external_link">External Web Link</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="res-title" className="text-[10px] text-gray-500 font-bold block uppercase">Display Title</label>
                            <input
                              id="res-title"
                              type="text"
                              required
                              value={newResourceForm.title}
                              onChange={(e) => setNewResourceForm({ ...newResourceForm, title: e.target.value })}
                              placeholder="e.g. Lecture Slides PDF"
                              className="w-full bg-[#0a0a0a] border border-slate-800 rounded-lg p-2 text-xs text-gray-300 outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="res-url" className="text-[10px] text-gray-500 font-bold block uppercase">Resource URL</label>
                          <input
                            id="res-url"
                            type="url"
                            required
                            value={newResourceForm.resource_url}
                            onChange={(e) => setNewResourceForm({ ...newResourceForm, resource_url: e.target.value })}
                            placeholder="e.g. https://drive.google.com/..."
                            className="w-full bg-[#0a0a0a] border border-slate-800 rounded-lg p-2 text-xs text-gray-300 outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold uppercase transition-colors"
                        >
                          Attach Resource
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live PIN Attendance Session Sidebar / Right Drawer */}
      <AnimatePresence>
        {isLiveSessionOpen && activeSession && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsLiveSessionOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-[#0d1321] border-l border-slate-800 w-full max-w-md shadow-2xl h-full flex flex-col z-10">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-md font-bold uppercase tracking-widest text-[#41c8df] flex items-center gap-2">
                  <Activity className="text-green-500 animate-pulse" />
                  Live Attendance Check
                </h2>
                <button onClick={() => setIsLiveSessionOpen(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {/* Active Session Status */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 text-center space-y-4">
                  <span className="text-[10px] font-black tracking-widest text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 uppercase">Session Active</span>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 font-medium block">4-Digit Passcode PIN</span>
                    <div className="text-5xl font-mono tracking-[0.2em] font-black text-white pl-2">
                      {activeSession.attendance_pin}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Instruct students in this batch to open their course player and input this passcode widget to verify live attendance check-in.
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={refreshAttendanceCheckInsList}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all"
                    >
                      <RefreshCw size={12} /> Refresh
                    </button>
                    <button
                      onClick={() => handleCloseLiveSession(activeSession.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all"
                    >
                      <Square size={12} /> End Session
                    </button>
                  </div>
                </div>

                {/* Check In Stats List */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                    <span className="uppercase tracking-wider">Checked In Students</span>
                    <span className="bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-mono">
                      {activeCheckIns.length} Present
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {activeCheckIns.length === 0 ? (
                      <div className="text-center py-12 border border-slate-800 border-dashed rounded-xl">
                        <Users className="w-8 h-8 text-gray-600 mx-auto mb-2 animate-bounce" />
                        <p className="text-xs text-gray-500 font-medium">Waiting for check-ins...</p>
                      </div>
                    ) : (
                      activeCheckIns.map((item, idx) => (
                        <div key={item.id || idx} className="p-3 bg-secondary/5 border border-slate-800 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-gray-200 block">{item.name}</span>
                            <span className="text-[10px] text-gray-500 font-semibold">{item.email}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 font-bold block">
                              {new Date(item.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[9px] text-green-400 font-bold bg-green-500/10 px-1 py-0.2 rounded border border-green-500/20">VERIFIED</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enrollment Analytics Modal */}
      <AnimatePresence>
        {isEnrollmentModalOpen && analyticsCourse && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsEnrollmentModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-background/90 backdrop-blur-2xl border border-slate-800 rounded-xl p-8 w-full max-w-4xl shadow-2xl max-h-[85vh] overflow-y-auto">
              <button onClick={() => setIsEnrollmentModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close Modal">
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold text-secondary mb-2 flex items-center gap-3">
                <Users className="text-[#41c8df]" />
                Enrollment & Engagement Report
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Course: <span className="text-[#41c8df] font-bold">{analyticsCourse.title}</span> • Overview of student learning progress and milestones.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-secondary/5 border border-slate-800 p-4 rounded-xl text-center">
                  <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider">Total Enrolled</span>
                  <span className="text-3xl font-black text-[#41c8df] mt-1 block">{enrollmentReports.length}</span>
                </div>
                <div className="bg-secondary/5 border border-slate-800 p-4 rounded-xl text-center">
                  <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider">Average Progress</span>
                  <span className="text-3xl font-black text-secondary mt-1 block">
                    {enrollmentReports.length > 0 
                      ? Math.round(enrollmentReports.reduce((acc, r) => acc + (r.progress_percentage || 0), 0) / enrollmentReports.length)
                      : 0}%
                  </span>
                </div>
                <div className="bg-secondary/5 border border-slate-800 p-4 rounded-xl text-center">
                  <span className="text-xs text-gray-500 font-bold block uppercase tracking-wider">Milestones Met</span>
                  <span className="text-3xl font-black text-green-400 mt-1 block">
                    {enrollmentReports.filter(r => r.progress_percentage === 100).length} Completed
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-300 uppercase tracking-widest border-b border-slate-800 pb-2">Student Progress List</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/5 border-b border-slate-800 text-gray-400 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Completed Lessons</th>
                        <th className="px-4 py-3">Progress Ratio</th>
                        <th className="px-4 py-3 text-right">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-gray-300">
                      {enrollmentReports.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">No students enrolled in this course yet.</td>
                        </tr>
                      ) : (
                        enrollmentReports.map((item, idx) => (
                          <tr key={item.student_id || idx} className="hover:bg-slate-800/10">
                            <td className="px-4 py-3">
                              <div>
                                <span className="font-bold text-gray-200 block">{item.name}</span>
                                <span className="text-[10px] text-gray-500 font-semibold">{item.email}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-400">
                              {item.completed} / {item.total} Nodes
                            </td>
                            <td className="px-4 py-3">
                              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                                <div className="bg-[#41c8df] h-full" style={{ width: `${item.progress_percentage || 0}%` }} />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-secondary">
                              {item.progress_percentage || 0}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CynexAI Curriculum Generator Panel / Drawer */}
      <AnimatePresence>
        {isAiGeneratorOpen && editingCourse && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAiGeneratorOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-[#0b0f19] border-l border-slate-800 w-full max-w-2xl shadow-2xl h-full flex flex-col z-10">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-purple-950/20">
                <h2 className="text-md font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2">
                  <Sparkles size={16} />
                  CynexAI Curriculum Architect
                </h2>
                <button onClick={() => setIsAiGeneratorOpen(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {!aiResult ? (
                  <div className="space-y-6">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Utilize CynexAI to automatically architect a standard day-by-day curriculum skeleton mapping lessons, modules, and study objectives.
                    </p>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="ai-title" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Course Subject/Title</label>
                        <input
                          id="ai-title"
                          type="text"
                          value={aiCourseTitle}
                          onChange={(e) => setAiCourseTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-purple-500 rounded-xl outline-none text-secondary text-sm font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="ai-level" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Skill Level</label>
                          <select
                            id="ai-level"
                            value={aiSkillLevel}
                            onChange={(e) => setAiSkillLevel(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-800 focus:border-purple-500 rounded-xl outline-none text-secondary text-sm font-medium"
                          >
                            <option value="Beginner">Beginner Level</option>
                            <option value="Intermediate">Intermediate Level</option>
                            <option value="Advanced">Advanced Level</option>
                            <option value="All Levels">All Levels (Comprehensive)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="ai-duration" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Duration</label>
                          <input
                            id="ai-duration"
                            type="text"
                            value={aiDuration}
                            onChange={(e) => setAiDuration(e.target.value)}
                            className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-purple-500 rounded-xl outline-none text-secondary text-sm font-medium"
                            placeholder="e.g. 6 weeks / 30 hours"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="ai-target" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Audience Profile</label>
                        <input
                          id="ai-target"
                          type="text"
                          value={aiTargetAudience}
                          onChange={(e) => setAiTargetAudience(e.target.value)}
                          className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-purple-500 rounded-xl outline-none text-secondary text-sm font-medium"
                          placeholder="e.g. college students, professionals, absolute beginners"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="ai-prompt-inst" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Special AI Architecting Guidelines</label>
                        <textarea
                          id="ai-prompt-inst"
                          rows={4}
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-purple-500 rounded-xl outline-none text-secondary text-sm font-medium resize-none"
                          placeholder="Add details about specific frameworks, coding languages, or case studies to focus on..."
                        />
                      </div>

                      <button
                        onClick={handleAiGenerateCurriculum}
                        disabled={aiGenerating}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs uppercase transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {aiGenerating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Architecting Curriculum Outline...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Generate Syllabus Outline
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated Blueprint Preview</span>
                      <button
                        onClick={() => setAiResult(null)}
                        className="text-xs text-purple-400 hover:text-purple-300 font-bold uppercase transition-colors"
                      >
                        Re-generate
                      </button>
                    </div>

                    <div className="space-y-4">
                      {aiResult.modules.map((mod: any, idx: number) => (
                        <div key={idx} className="border border-slate-800 bg-secondary/5 rounded-xl p-4 space-y-3">
                          <span className="text-xs font-bold text-purple-400 block border-b border-slate-800 pb-1">{mod.name}</span>
                          <div className="space-y-2 pl-2">
                            {mod.lessons.map((les: any, lIdx: number) => (
                              <div key={lIdx} className="text-xs bg-slate-900 border border-slate-800/60 p-2.5 rounded-lg">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-gray-200">{les.title}</span>
                                  <span className="text-[10px] text-gray-500 font-semibold">{les.duration} mins</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{les.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-purple-950/10 border border-purple-500/20 p-4 rounded-xl space-y-2">
                      <span className="text-xs text-purple-400 font-bold block uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        Architect Commitment Notice
                      </span>
                      <p className="text-[10px] text-purple-300 leading-relaxed">
                        Applying this blueprint will immediately append these modules and add these new draft lessons to your course curriculum outline. You can later add video URLs and resources to each draft lesson.
                      </p>
                    </div>

                    <button
                      onClick={() => handleApplyAiCurriculum(editingCourse.id)}
                      className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-black font-black rounded-xl text-xs uppercase transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Check size={14} />
                      Commit Blueprint to Curriculum
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Advanced Diagnostics Section */}
      {/* Student Modal */}
      <AnimatePresence>
        {isStudentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsStudentModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-lg p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsStudentModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close Modal">
                <X size={20} />
              </button>
              
              <h2 className="text-2xl font-display font-bold text-secondary mb-2 flex items-center gap-3">
                <ShieldCheck className="text-[#41c8df]" />
                {editingStudent ? 'Edit Student Profile' : 'Register New Student'}
              </h2>
              <p className="text-sm text-gray-400 mb-8">
                {editingStudent ? 'Update student details and access levels.' : 'Create a new student account to grant portal access.'}
              </p>

              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              <form onSubmit={handleStudentFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="student-name" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name *</label>
                    <input
                      id="student-name"
                      type="text"
                      required
                      value={studentFormData.name}
                      onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="student-email" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address *</label>
                    <input
                      id="student-email"
                      type="email"
                      required
                      value={studentFormData.email}
                      onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      placeholder="student@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="student-password" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Password {editingStudent ? '(Leave blank to keep unchanged)' : '*'}
                    </label>
                    <div className="relative">
                      <input
                        id="student-password"
                        type={showStudentPassword ? "text" : "password"}
                        required={!editingStudent}
                        value={studentFormData.password_hash}
                        onChange={(e) => setStudentFormData({ ...studentFormData, password_hash: e.target.value })}
                        className="w-full pl-4 pr-10 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                        placeholder="Secure password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentPassword(!showStudentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showStudentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="student-phone" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
                    <input
                      id="student-phone"
                      type="tel"
                      value={studentFormData.phone}
                      onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="student-course" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Allocated Course *</label>
                    <select
                      id="student-course"
                      required
                      value={allocatedCourseId}
                      onChange={(e) => setAllocatedCourseId(e.target.value)}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary appearance-none"
                      title="Allocated Course"
                    >
                      <option value="" disabled>Select a course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.title} ({course.level})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="student-batch" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Allocated Batch / Section</label>
                    <select
                      id="student-batch"
                      value={allocatedBatchId}
                      onChange={(e) => setAllocatedBatchId(e.target.value)}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary appearance-none"
                      title="Allocated Batch / Section"
                    >
                      <option value="">Unassigned / No Section</option>
                      {batches.filter(b => b.course_id === allocatedCourseId || !allocatedCourseId).map(batch => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="student-role" className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Role</label>
                    <select
                      id="student-role"
                      value={studentFormData.role}
                      onChange={(e) => setStudentFormData({ ...studentFormData, role: e.target.value as 'student' | 'admin' })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary appearance-none"
                      title="System Role"
                    >
                      <option value="student">Student (Standard Access)</option>
                      <option value="admin">Administrator (Full Access)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-end gap-4 mt-8">
                  <button type="button" onClick={() => setIsStudentModalOpen(false)} className="px-8 py-4 text-gray-400 hover:text-secondary font-bold uppercase text-xs">Cancel</button>
                  <button type="submit" disabled={formLoading} className="px-10 py-4 bg-white text-black font-black uppercase text-xs rounded-md transition-all shadow-xl disabled:opacity-50 flex items-center gap-2">
                    {formLoading ? 'Processing...' : editingStudent ? 'Save Changes' : 'Create Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <button 
                onClick={() => setSelectedTicket(null)} 
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" 
                title="Close Modal"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-display font-bold text-secondary mb-1 flex items-center gap-3">
                <MessageSquare className="text-[#41c8df]" />
                Support Conversation
              </h2>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#41c8df] bg-[#41c8df]/10 px-3 py-1 rounded-md">
                  {selectedTicket.category}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  selectedTicket.status === 'resolved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                }`}>
                  {selectedTicket.status}
                </span>
                {selectedTicket.status === 'open' && (
                  <button
                    onClick={() => handleResolveTicket(selectedTicket.id)}
                    className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md hover:bg-emerald-500/20 transition-all ml-auto"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-6 bg-white/5 rounded-md border border-white/5 space-y-6 mb-6">
                {/* Initial Query */}
                <div className="flex flex-col items-start max-w-[85%]">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-3">
                    Student ID: {selectedTicket.student_id} (Initiator)
                  </div>
                  <div className="bg-[#41c8df]/10 text-white border border-[#41c8df]/20 px-5 py-3 rounded-md rounded-tl-none font-medium leading-relaxed">
                    {selectedTicket.description}
                  </div>
                  <div className="text-[9px] text-gray-500 font-bold mt-1 ml-3">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </div>
                </div>

                {repliesLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
                    <div className="w-6 h-6 border-2 border-[#41c8df] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider">Loading conversation thread...</span>
                  </div>
                ) : (
                  ticketReplies.map(reply => {
                    const isSelf = reply.sender_role === 'admin';
                    return (
                      <div 
                        key={reply.id} 
                        className={`flex flex-col ${isSelf ? 'items-end ml-auto max-w-[85%]' : 'items-start max-w-[85%]'}`}
                      >
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSelf ? 'text-emerald-400 mr-3' : 'text-gray-400 ml-3'}`}>
                          {isSelf ? `${reply.sender_name} (You)` : `Student (${reply.sender_name})`}
                        </div>
                        <div className={`px-5 py-3 rounded-md font-medium shadow-sm leading-relaxed ${
                          isSelf 
                            ? 'bg-emerald-600 text-white rounded-tr-none' 
                            : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                        }`}>
                          {reply.message}
                        </div>
                        <div className={`text-[9px] text-gray-500 font-bold mt-1 ${isSelf ? 'mr-3' : 'ml-3'}`}>
                          {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Send Form */}
              <form onSubmit={handleSendAdminReply} className="flex gap-4">
                <input
                  type="text"
                  required
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type admin reply here..."
                  className="flex-1 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl px-5 py-4 outline-none text-secondary font-medium placeholder:text-gray-500 transition-all"
                />
                <button
                  type="submit"
                  className="px-6 py-4 bg-white text-black font-black uppercase text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md flex items-center gap-2"
                >
                  <Send size={14} /> Send Reply
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminTicketModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setIsAdminTicketModalOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-lg p-8 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsAdminTicketModalOpen(false)} 
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" 
                title="Close Modal"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-display font-bold text-secondary mb-2 flex items-center gap-3">
                <MessageSquare className="text-[#41c8df]" />
                Create Support Ticket
              </h2>
              <p className="text-sm text-gray-400 mb-8">Log a customer support or query ticket on behalf of a student.</p>

              <form onSubmit={handleCreateAdminTicket} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="admin-ticket-student" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Student *</label>
                  <select
                    id="admin-ticket-student"
                    required
                    value={adminTicketFormData.student_id}
                    onChange={(e) => setAdminTicketFormData({ ...adminTicketFormData, student_id: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary appearance-none"
                    title="Select Student"
                  >
                    <option value="">-- Select Student --</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="admin-ticket-category" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category *</label>
                  <select
                    id="admin-ticket-category"
                    required
                    value={adminTicketFormData.category}
                    onChange={(e) => setAdminTicketFormData({ ...adminTicketFormData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary appearance-none"
                    title="Ticket Category"
                  >
                    <option value="Course Content">Course Content</option>
                    <option value="Payment / EMI">Payment / EMI</option>
                    <option value="Technical Access">Technical Access</option>
                    <option value="Certificate Request">Certificate Request</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="admin-ticket-desc" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description / Issue details *</label>
                  <textarea
                    id="admin-ticket-desc"
                    required
                    rows={4}
                    value={adminTicketFormData.description}
                    onChange={(e) => setAdminTicketFormData({ ...adminTicketFormData, description: e.target.value })}
                    placeholder="Enter support request details here..."
                    className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary font-medium resize-none"
                  />
                </div>

                <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-end gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsAdminTicketModalOpen(false)} 
                    className="px-8 py-4 text-gray-400 hover:text-secondary font-bold uppercase text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-10 py-4 bg-white text-black font-black uppercase text-xs rounded-md transition-all shadow-xl hover:scale-[1.02]"
                  >
                    Create Ticket
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Testimonial Form Modal */}
      <AnimatePresence>
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-background border border-secondary/20 rounded-[2.5rem] shadow-2xl overflow-hidden z-10"
            >
              <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-secondary/5">
                <div>
                  <h2 className="text-xl font-display font-bold text-secondary">
                    {editingReview ? 'Edit Success Story' : 'New Success Story'}
                  </h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                    {editingReview ? 'Modify student testimonial' : 'Add new student achievement'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsReviewModalOpen(false)} 
                  className="text-gray-400 hover:text-secondary p-2 hover:bg-secondary/10 rounded-xl transition-all" 
                  title="Close testimonial modal"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleReviewFormSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto">
                <div className="space-y-2">
                  <label htmlFor="review-student-name" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Student Name *</label>
                  <input
                    type="text"
                    required
                    id="review-student-name"
                    value={reviewFormData.name}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary font-medium transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="review-role" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role & Placement *</label>
                  <input
                    type="text"
                    required
                    id="review-role"
                    value={reviewFormData.role}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, role: e.target.value })}
                    placeholder="e.g. AI Engineer at Google"
                    className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary font-medium transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="review-course" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Course *</label>
                    <input
                      type="text"
                      required
                      id="review-course"
                      value={reviewFormData.course}
                      onChange={(e) => setReviewFormData({ ...reviewFormData, course: e.target.value })}
                      placeholder="e.g. Advanced AI Development"
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary font-medium transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="review-rating" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rating (1-5) *</label>
                    <select
                      id="review-rating"
                      title="Select student rating from 1 to 5 stars"
                      aria-label="Rating"
                      value={reviewFormData.rating}
                      onChange={(e) => setReviewFormData({ ...reviewFormData, rating: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-background border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary font-medium transition-all text-white"
                    >
                      <option value="5">5 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="2">2 Stars</option>
                      <option value="1">1 Star</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Image / Avatar</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="review-image-url" className="text-[10px] text-gray-500 font-bold block mb-1">PASTE IMAGE URL</label>
                      <input
                        type="url"
                        id="review-image-url"
                        value={reviewFormData.image}
                        onChange={(e) => setReviewFormData({ ...reviewFormData, image: e.target.value })}
                        placeholder="e.g. https://images.unsplash.com/photo-..."
                        className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary font-medium transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="review-file-upload" className="text-[10px] text-gray-500 font-bold block mb-1">UPLOAD LOCAL FILE</label>
                      <div className="relative flex items-center justify-center border border-dashed border-secondary/20 hover:border-[#41c8df] rounded-xl bg-secondary/5 h-[46px] transition-all cursor-pointer overflow-hidden group">
                        <input
                          type="file"
                          id="review-file-upload"
                          title="Upload local image file"
                          placeholder="Select local image file"
                          aria-label="Upload local image file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert('File is too large! Please choose an image smaller than 2MB.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setReviewFormData({ ...reviewFormData, image: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="flex items-center gap-2 text-xs text-gray-400 group-hover:text-[#41c8df] font-bold">
                          <ImageIcon size={16} />
                          <span>Choose Image...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {reviewFormData.image && (
                    <div className="mt-2 flex items-center gap-3 bg-secondary/5 border border-slate-800 p-2.5 rounded-xl">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-[#41c8df]/30 bg-background flex-shrink-0 flex items-center justify-center">
                        <img src={reviewFormData.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-400 block font-bold">PREVIEW SELECTED IMAGE</span>
                        <span className="text-[10px] text-[#41c8df] truncate block font-medium">
                          {reviewFormData.image.startsWith('data:') ? 'Local file uploaded successfully (Base64)' : reviewFormData.image}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewFormData({ ...reviewFormData, image: '' })}
                        className="text-gray-400 hover:text-red-500 text-xs font-bold uppercase transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="review-text" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Success Quote / Review *</label>
                  <textarea
                    required
                    id="review-text"
                    rows={4}
                    value={reviewFormData.text}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, text: e.target.value })}
                    placeholder="Describe their transformation or experience..."
                    className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary font-medium resize-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="rev-isVisible"
                    checked={reviewFormData.isVisible}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, isVisible: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-800 bg-secondary/5 text-[#41c8df] focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="rev-isVisible" className="text-sm font-bold text-gray-300 cursor-pointer">
                    Show on website homepage success stories
                  </label>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-semibold flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div className="border-t border-slate-800 pt-5 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="w-full sm:w-auto px-6 py-3 text-gray-400 hover:text-secondary font-bold uppercase text-xs transition-colors bg-transparent border-none outline-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full sm:w-auto px-10 py-3 bg-white text-black font-black uppercase text-xs rounded-md transition-all shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 cursor-pointer"
                  >
                    {formLoading ? 'Saving...' : editingReview ? 'Save Changes' : 'Publish Success Story'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Advanced Diagnostics Section */}
      <div className="max-w-7xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 relative z-10">
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#41c8df]" />
              System Infrastructure
            </h3>
            <div className={`w-2.5 h-2.5 rounded-full ${isTursoConfigured ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-[10px] font-bold text-gray-500">
              <span>Cloud Status</span>
              <span className={isTursoConfigured ? 'text-green-600' : 'text-amber-600'}>
                {isTursoConfigured ? 'Operational' : 'Fallback Active'}
              </span>
            </div>
            {diagResult && (
              <>
                <div className="flex justify-between text-[10px] font-bold text-gray-500 border-t border-slate-800 pt-2">
                  <span>Ping Latency</span>
                  <span className="text-secondary">{diagResult.latency ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-500">
                  <span>Active Tables</span>
                  <span className="text-secondary">{diagResult.tables?.length ?? 0}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-500">
                  <span>Stored Articles</span>
                  <span className="text-[#41c8df] font-black">{diagResult.counts?.blog_posts ?? 0}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            <button
              onClick={handleRunDiagnostics}
              disabled={diagLoading}
              className="px-4 py-2 bg-secondary/10 border border-secondary/20 text-secondary hover:border-secondary/50 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-secondary/20 transition-all disabled:opacity-50"
            >
              {diagLoading ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleResetLocal}
              className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all"
            >
              Reset Local
            </button>
            <button
              onClick={handleGenerateAI}
              disabled={diagLoading}
              className="px-4 py-2 bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-100 transition-all disabled:opacity-50"
            >
              Generate AI Content
            </button>
            <button
              onClick={handlePopulateSample}
              disabled={diagLoading}
              className="px-4 py-2 bg-[#41c8df]/10 text-[#41c8df] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#41c8df]/20 transition-all disabled:opacity-50"
            >
              Repair Data
            </button>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col justify-center text-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] leading-relaxed">
            Deepmind Protocol v1.3.0<br />
            Protected Encryption: AES-256<br />
            Secure Session Active
          </p>
        </div>
      </div>
      </main>
    </div>
  );
};

export default AdminPanel;
