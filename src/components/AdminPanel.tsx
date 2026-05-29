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
  getAllPayments,
  createPayment,
  Payment,
  updatePayment,
  deletePayment,
  togglePaymentVisibility,
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
} from '../lib/turso';
import { advancedAiPosts } from '../data/aiPosts';
import AdminLogin from './AdminLogin';
import { BookOpen, PlusCircle, Clock, Award, Terminal, HelpCircle, Video, ClipboardList, Trophy, Menu } from 'lucide-react';
import { AdminAttendance } from './AdminAttendance';
import { AdminCertificates } from './AdminCertificates';
import { AdminDoubtWall } from './AdminDoubtWall';
import { AdminCodingProblems } from './AdminCodingProblems';
import { AdminFAQ } from './AdminFAQ';
import { AdminRecordings } from './AdminRecordings';
import AdminMockTests from './AdminMockTests';
import { AdminLeaderboard } from './AdminLeaderboard';
import { AdminCourseManager } from './AdminCourseManager';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'CynexAI@2026';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<'articles' | 'courses' | 'coursemanager' | 'students' | 'payments' | 'tickets' | 'reviews' | 'attendance' | 'certificates' | 'doubts' | 'coding' | 'faqs' | 'recordings' | 'mocktests' | 'leaderboard'>('articles');
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

  // Payment & Enrollment State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    student_id: '',
    total_amount: 0,
    amount_paid: 0,
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'paid' | 'pending'
  });

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
      case 'payments': {
        const data = payments.map(p => ({
          ID: p.id,
          StudentName: p.student_name,
          TotalAmount: p.total_amount,
          AmountPaid: p.amount_paid,
          DueDate: p.due_date,
          Status: p.status
        }));
        exportToCSV(data, 'payments_report.csv', ['Transaction ID', 'Student Name', 'Total Amount', 'Amount Paid', 'Due Date', 'Status']);
        break;
      }
      case 'tickets': {
        const data = tickets.map(t => ({
          ID: t.id,
          StudentName: t.student_name,
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
      fetchPayments();
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

  const fetchPayments = async () => {
    try {
      const result = await getAllPayments();
      setPayments(result);
    } catch {
      setError('Failed to fetch payments');
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
    const safeParseArr = (v?: string): string[] => {
      if (!v) return [];
      try { return JSON.parse(v); } catch { return []; }
    };
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
        if (!studentFormData.password_hash) userPayload.password_hash = 'default123';
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

  // --- PAYMENT HANDLERS ---
  const handleOpenPaymentModal = () => {
    setEditingPayment(null);
    setPaymentFormData({
      student_id: students.length > 0 ? students[0].id : '',
      total_amount: 0,
      amount_paid: 0,
      due_date: new Date().toISOString().split('T')[0],
      status: 'pending'
    });
    setIsPaymentModalOpen(true);
    setError(null);
  };

  const handleOpenEditPaymentModal = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentFormData({
      student_id: payment.student_id,
      total_amount: payment.total_amount,
      amount_paid: payment.amount_paid,
      due_date: payment.due_date ? payment.due_date.split('T')[0] : new Date().toISOString().split('T')[0],
      status: payment.status
    });
    setIsPaymentModalOpen(true);
    setError(null);
  };

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await deletePayment(id);
      setSuccess('Payment record deleted successfully');
      fetchPayments();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(`Delete Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleTogglePaymentVisibility = async (id: string, isVisible: boolean) => {
    try {
      await togglePaymentVisibility(id, !isVisible);
      setSuccess(isVisible ? 'Payment hidden from student' : 'Payment made visible to student');
      fetchPayments();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(`Failed to toggle visibility: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handlePaymentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      if (editingPayment) {
        await updatePayment({
          id: editingPayment.id,
          student_id: paymentFormData.student_id,
          total_amount: paymentFormData.total_amount,
          amount_paid: paymentFormData.amount_paid,
          due_date: paymentFormData.due_date,
          status: paymentFormData.status,
          isVisible: editingPayment.isVisible
        });
        setSuccess('Payment updated successfully');
      } else {
        const newPayment: Payment = {
          ...paymentFormData,
          id: `pay_${Date.now()}`,
          isVisible: true
        };
        await createPayment(newPayment);
        setSuccess('Payment recorded successfully');
      }
      setIsPaymentModalOpen(false);
      setEditingPayment(null);
      fetchPayments();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(`Payment Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleLogin = (password: string) => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError(null);
      localStorage.setItem('cynexai_admin_auth', 'true');
      // Resolve "allEnrollments" unused warning by logging it on successful login (internal use)
      console.log('Enrollment System Initialized:', allEnrollments.length);
    } else {
      setLoginError('Invalid security password');
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
    <div className="h-screen overflow-hidden bg-[#0a0a0a] flex flex-col md:flex-row pt-16 sm:pt-20 text-slate-200">
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
            { id: 'students', label: 'Students', Icon: ShieldCheck },
            { id: 'payments', label: 'Payments', Icon: FileText },
            { id: 'tickets', label: 'Support', Icon: MessageSquare },
            { id: 'reviews', label: 'Reviews', Icon: Star },
            { id: 'leaderboard', label: 'Leaderboard', Icon: Trophy },
            { id: 'attendance', label: 'Attendance', Icon: Clock },
            { id: 'certificates', label: 'Certs', Icon: Award },
            { id: 'doubts', label: 'Doubts', Icon: MessageSquare },
            { id: 'coding', label: 'Daily Practice', Icon: Terminal },
            { id: 'faqs', label: 'FAQs', Icon: HelpCircle },
            { id: 'recordings', label: 'Recordings', Icon: Video },
            { id: 'mocktests', label: 'Mock Tests', Icon: ClipboardList },
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
                {activeTab === 'payments' && 'Track student payments and EMI installments.'}
                {activeTab === 'tickets' && 'Respond to student helpdesk requests.'}
                {activeTab === 'reviews' && 'Manage graduate success stories and testimonials.'}
                {activeTab === 'faqs' && 'Manage frequently asked questions and answers.'}
                {activeTab === 'recordings' && 'Manage daily class recordings and student batches.'}
                {activeTab === 'mocktests' && 'Manage student mock tests and question banks.'}
                {activeTab === 'leaderboard' && 'Manage student rankings and performance.'}
                {activeTab === 'certificates' && 'Upload and manage student certificates.'}
                {activeTab === 'attendance' && 'Track daily student attendance.'}
                {activeTab === 'coding' && 'Manage coding questions.'}
                {activeTab === 'doubts' && 'Resolve student doubts.'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {['articles', 'courses', 'students', 'payments', 'tickets', 'reviews'].includes(activeTab) && (
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
              {['articles', 'courses', 'students', 'payments', 'tickets', 'reviews'].includes(activeTab) && (
                <button
                onClick={() => {
                  if (activeTab === 'articles') handleOpenModal();
                  else if (activeTab === 'courses') handleOpenCourseModal();
                  else if (activeTab === 'students') handleOpenStudentModal();
                  else if (activeTab === 'payments') handleOpenPaymentModal();
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
                {activeTab === 'payments' && 'Record Payment'}
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
        {['articles', 'courses', 'students', 'payments', 'tickets', 'reviews'].includes(activeTab) && (
          <div className="bg-[#0f172a] rounded-md shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-slate-800 p-4 mb-8">
            <div className="relative border-slate-800">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by title or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-secondary/5 border border-transparent focus:bg-secondary/10 focus:border-[#41c8df] rounded-xl outline-none transition-all text-secondary placeholder:text-gray-500"
              />
            </div>
          </div>
        )}

        {/* Content Table */}
        {['articles', 'courses', 'students', 'payments', 'tickets', 'reviews'].includes(activeTab) ? (
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
              <table className="w-full text-left">
                <thead className="bg-secondary/5 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Level</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#41c8df] rounded-full animate-spin" />
                          <span className="text-sm font-medium">Loading courses...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <BookOpen className="w-12 h-12 text-gray-100 mb-2" />
                          <span className="text-sm font-medium">No courses found</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map((course) => (
                      <tr key={course.id} className="hover:bg-secondary/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-secondary/10 rounded-lg overflow-hidden flex-shrink-0">
                              <img src={course.image} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-secondary line-clamp-1">{course.title}</div>
                              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium">ID: {course.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300 font-medium">
                          {course.duration}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/10 border border-secondary/30 text-gray-300 uppercase">
                            {course.level}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {course.isVisible ? (
                              <span className="flex items-center text-xs font-bold text-cyan-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-2" />
                                PUBLISHED
                              </span>
                            ) : (
                              <span className="flex items-center text-xs font-bold text-gray-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2" />
                                DRAFT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
            ) : activeTab === 'payments' ? (
              <table className="w-full text-left">
                <thead className="bg-secondary/5 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Payment ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Visibility</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="w-12 h-12 text-gray-100 mb-2" />
                          <span className="text-sm font-medium">No payments found.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payments.map(payment => (
                      <tr key={payment.id} className="hover:bg-secondary/5 transition-colors group">
                        <td className="px-6 py-4 text-sm text-secondary font-medium">{payment.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{payment.student_id}</td>
                        <td className="px-6 py-4 text-sm text-secondary font-bold">₹{payment.amount_paid} / ₹{payment.total_amount}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${payment.status === 'paid' ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {payment.isVisible !== false ? (
                            <span className="flex items-center text-xs font-bold text-cyan-500">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-2" />
                              VISIBLE
                            </span>
                          ) : (
                            <span className="flex items-center text-xs font-bold text-gray-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2" />
                              HIDDEN
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleTogglePaymentVisibility(payment.id, payment.isVisible !== false)}
                              className="p-2 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 border border-transparent hover:border-[#41c8df]/30 rounded-lg transition-all"
                              title={payment.isVisible !== false ? "Hide Payment" : "Show Payment"}
                            >
                              {payment.isVisible !== false ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button
                              onClick={() => handleOpenEditPaymentModal(payment)}
                              className="p-2 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 border border-transparent hover:border-[#41c8df]/30 rounded-lg transition-all"
                              title="Edit Payment"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(payment.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-lg transition-all"
                              title="Delete Payment"
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
              <AdminCourseManager courses={courses} />
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
            ) : activeTab === 'leaderboard' ? (
              <AdminLeaderboard />
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

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-lg p-8 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsPaymentModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close Modal">
                <X size={20} />
              </button>

              <h2 className="text-2xl font-display font-bold text-secondary mb-2 flex items-center gap-3">
                <FileText className="text-[#41c8df]" />
                {editingPayment ? 'Edit Payment Record' : 'Record Payment'}
              </h2>
              <p className="text-sm text-gray-400 mb-8">
                {editingPayment ? 'Modify the details of this fee payment or EMI installment.' : 'Log a fee payment or EMI installment for a student.'}
              </p>

              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              <form onSubmit={handlePaymentFormSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="payment-student" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Student *</label>
                  <select
                    id="payment-student"
                    required
                    value={paymentFormData.student_id}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, student_id: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary appearance-none"
                    title="Select Student"
                  >
                    <option value="">-- Select Student --</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="payment-total" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Fee (₹) *</label>
                    <input
                      id="payment-total"
                      type="number" required min={0}
                      value={paymentFormData.total_amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, total_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      placeholder="e.g. 50000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="payment-paid" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amount Paid (₹) *</label>
                    <input
                      id="payment-paid"
                      type="number" required min={0}
                      value={paymentFormData.amount_paid}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount_paid: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      placeholder="e.g. 10000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="payment-due" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Due Date *</label>
                    <input
                      id="payment-due"
                      type="date" required
                      value={paymentFormData.due_date}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, due_date: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      title="Due Date"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="payment-status" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                    <select
                      id="payment-status"
                      value={paymentFormData.status}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, status: e.target.value as 'pending' | 'paid' })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-slate-800 focus:border-[#41c8df] rounded-xl outline-none text-secondary appearance-none"
                      title="Payment Status"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>

                {paymentFormData.total_amount > 0 && (
                  <div className="bg-secondary/5 border border-slate-800 rounded-xl p-4">
                    <div className="flex justify-between text-sm font-bold text-gray-400 mb-2">
                      <span>Balance Due</span>
                      <span className={paymentFormData.total_amount - paymentFormData.amount_paid > 0 ? 'text-yellow-400' : 'text-green-400'}>
                        ₹{(paymentFormData.total_amount - paymentFormData.amount_paid).toLocaleString()}
                      </span>
                    </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <motion.div
                          className="bg-[#41c8df] h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((paymentFormData.amount_paid / paymentFormData.total_amount) * 100, 100)}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {Math.round((paymentFormData.amount_paid / paymentFormData.total_amount) * 100)}% cleared
                    </p>
                  </div>
                )}

                <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-end gap-4">
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-8 py-4 text-gray-400 hover:text-secondary font-bold uppercase text-xs">Cancel</button>
                  <button type="submit" disabled={formLoading} className="px-10 py-4 bg-white text-black font-black uppercase text-xs rounded-md transition-all shadow-xl disabled:opacity-50">
                    {formLoading ? 'Saving...' : editingPayment ? 'Save Changes' : 'Record Payment'}
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
