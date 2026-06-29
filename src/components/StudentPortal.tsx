import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, BookOpen, Clock, PlayCircle, 
  Info, CheckCircle2, 
  LayoutDashboard,
  Trophy, Plus, X, Send,
  MessageSquare, Terminal, Award, Gift, Brain,
  Video, FileText, User as UserIcon, Briefcase, Globe, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  getEnrollmentsByStudent, getCourses, 
  getSupportTickets,
  createSupportTicket, getLessonsByCourse,
  getStudentChecklist, updateChecklistStep,
  getSupportReplies, createSupportReply,
  getBadges, getUsers, getBatches, getMockTests,
  updateUserOnlineStatus, deleteSession,
  Course, Enrollment, SupportTicket, Lesson, OnboardingStep, SupportReply, Badge, Batch, MockTest
} from '../lib/turso';
import StudentDashboard from './StudentDashboard';
import CoursePlayer from './CoursePlayer';
import Achievements from './Achievements';
import { StudentAttendance } from './StudentAttendance';
import { CertificateRenderer } from './CertificateRenderer';
import { DoubtWall } from './DoubtWall';
import { CodingPractice } from './CodingPractice';
import { StudentRecordings } from './StudentRecordings';
import { StudentMockTests } from './StudentMockTests';
import { StudentProfile } from './StudentProfile';
import { ProjectSubmissions } from './ProjectSubmissions';
import { GlobalLeaderboard } from './GlobalLeaderboard';
import ReferralDashboard from './ReferralDashboard';
import DailyQuiz from './DailyQuiz';
import ScrollingBanner from './ScrollingBanner';

const StudentPortal = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'referral' | 'quiz' | 'dashboard' | 'courses' | 'achievements' | 'support' | 'attendance' | 'certificates' | 'doubts' | 'coding' | 'recordings' | 'mocktests' | 'profile' | 'projects' | 'leaderboard'>('referral');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentBatchId, setStudentBatchId] = useState('');
  const [enrollments, setEnrollments] = useState<{ enrollment: Enrollment; course: Course }[]>([]);
  const [batchesList, setBatchesList] = useState<Batch[]>([]);
  const [selectedCurriculumCourse, setSelectedCurriculumCourse] = useState<Course | null>(null);
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [checklist, setChecklist] = useState<OnboardingStep[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketFormData, setTicketFormData] = useState({ category: 'Course Content', description: '' });
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplies, setTicketReplies] = useState<SupportReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [repliesLoading, setRepliesLoading] = useState(false);
  
  // Content Player State
  const [selectedCourseData, setSelectedCourseData] = useState<{ course: Course; enrollment: Enrollment; lessons: Lesson[] } | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(true);

  const navItems = [
    { id: 'referral', label: 'Referral Program', icon: Gift },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'quiz', label: 'Daily Quiz', icon: Brain },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'recordings', label: 'Class Recordings', icon: Video },
    { id: 'mocktests', label: 'Mock Tests', icon: FileText },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'coding', label: 'Daily Practice', icon: Terminal },
    { id: 'leaderboard', label: 'Leaderboard', icon: Globe },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'doubts', label: 'Doubt Wall', icon: MessageSquare },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'support', label: 'Help & Support', icon: Info },
  ];

  useEffect(() => {
    const isAuth = localStorage.getItem('cynexai_student_auth');
    if (isAuth !== 'true') {
      navigate('/login');
      return;
    }

    const name = localStorage.getItem('cynexai_student_name') || 'Student';
    const id = localStorage.getItem('cynexai_student_id') || '';
    setStudentName(name);
    setStudentId(id);

    const loadData = async () => {
      setLoading(true);
      try {
        const [studentEnrollments, allCoursesData, studentTickets, studentChecklist, studentBadges, allUsers, allBatches, allMockTests] = await Promise.all([
          getEnrollmentsByStudent(id),
          getCourses(true),
          getSupportTickets(id),
          getStudentChecklist(id),
          getBadges(id),
          getUsers(),
          getBatches(),
          getMockTests()
        ]);

        setBadges(studentBadges);
        setBatchesList(allBatches);
        setMockTests(allMockTests);

        const currentUser = allUsers.find(u => u.id === id);
        if (currentUser) {
          if (currentUser.batch_id) {
            setStudentBatchId(currentUser.batch_id);
          }
          const complete = !!currentUser.phone;
          setIsProfileComplete(complete);
          if (!complete) {
            setActiveTab('profile');
          }
        }

        const enriched = studentEnrollments.map(enr => {
          const course = allCoursesData.find(c => c.id === enr.course_id);
          return course ? { enrollment: enr, course } : null;
        }).filter(Boolean) as { enrollment: Enrollment; course: Course }[];

        setEnrollments(enriched);
        setTickets(studentTickets);
        setChecklist(studentChecklist);
      } catch (error) {
        console.error("Failed to load portal data", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleUpdateChecklist = async (stepId: string, isDone: boolean) => {
    try {
      await updateChecklistStep(studentId, stepId, isDone);
      setChecklist(prev => {
        const index = prev.findIndex(s => s.step_id === stepId);
        if (index !== -1) {
          const next = [...prev];
          next[index] = { ...next[index], is_done: isDone };
          return next;
        }
        return [...prev, { student_id: studentId, step_id: stepId, is_done: isDone }];
      });
    } catch (error) {
      console.error("Failed to update checklist", error);
    }
  };

  const handleLogout = async () => {
    const studentId = localStorage.getItem('cynexai_student_id');
    const sessionId = localStorage.getItem('cynexai_session_id');
    if (studentId) {
      updateUserOnlineStatus(studentId, false).catch(console.error);
    }
    if (sessionId) {
      await deleteSession(sessionId).catch(console.error);
    }
    localStorage.removeItem('cynexai_student_auth');
    localStorage.removeItem('cynexai_student_id');
    localStorage.removeItem('cynexai_student_name');
    localStorage.removeItem('cynexai_session_id');
    navigate('/login');
  };

  const handleResume = async (course: Course, enrollment: Enrollment) => {
    try {
      setLoading(true);
      const lessons = await getLessonsByCourse(course.id);
      setSelectedCourseData({ course, enrollment, lessons });
      setIsPlayerOpen(true);
    } catch (error) {
      console.error("Failed to load lessons", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTicket: Omit<SupportTicket, 'created_at'> = {
        id: crypto.randomUUID(),
        student_id: studentId,
        category: ticketFormData.category,
        description: ticketFormData.description,
        status: 'open'
      };
      await createSupportTicket(newTicket);
      setTickets([{ ...newTicket, created_at: new Date().toISOString() }, ...tickets]);
      setIsTicketModalOpen(false);
      setTicketFormData({ category: 'Course Content', description: '' });
    } catch (error) {
      alert("Failed to submit ticket. Please try again.");
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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      const newReply = {
        id: crypto.randomUUID(),
        ticket_id: selectedTicket.id,
        sender_id: studentId,
        sender_name: studentName,
        sender_role: 'student' as const,
        message: replyMessage.trim()
      };
      await createSupportReply(newReply);
      setTicketReplies([...ticketReplies, { ...newReply, created_at: new Date().toISOString() }]);
      setReplyMessage('');
    } catch (error) {
      alert("Failed to send message. Please try again.");
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white text-slate-900 flex flex-col lg:flex-row selection:bg-indigo-500/20">
      {/* Sidebar Navigation */}
      <aside className="w-80 bg-gray-50 border-r border-slate-200 hidden lg:flex flex-col sticky top-0 h-screen pt-24 pb-8 shadow-sm">
        <div className="px-6 mb-12">
          <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-200 relative overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h2 className="font-bold text-slate-900 mb-1 relative z-10">{studentName}</h2>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest relative z-10">Student Identity Verified</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isDisabled = !isProfileComplete && item.id !== 'profile';
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isDisabled) {
                    alert("Please update your profile details (phone number) to access this section.");
                    return;
                  }
                  setActiveTab(item.id as any);
                }}
                className={`w-full flex items-center gap-4 px-5 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                  activeTab === item.id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                    : isDisabled
                      ? 'text-slate-400 cursor-not-allowed opacity-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                {item.label}
                {isDisabled && <Lock className="w-3 h-3 ml-auto opacity-50" />}
              </button>
            );
          })}
        </nav>

        <div className="px-4 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-2.5 rounded-lg font-semibold text-sm text-red-600 hover:bg-red-50 transition-all border border-red-100"
          >
            <LogOut className="w-4.5 h-4.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-28 lg:pt-24 pb-24 lg:pb-12 px-3 sm:px-6 lg:px-12 relative bg-white">
        
        {/* Scrolling Banner */}
        <div className="absolute top-0 left-0 right-0 z-30">
          <ScrollingBanner 
            messages={[
              { text: "Ramesh just earned Wireless Earpods by referring 5 people!", icon: "gift" },
              { text: "Priya unlocked an Amazon Gift Voucher!", icon: "award" },
              { text: "Vikram received the Official CynexAI T-Shirt!", icon: "trophy" },
              { text: "Suresh just completed the 3 Admissions milestone!", icon: "gift" }
            ]}
          />
        </div>

        {/* Mobile Top Bar (only visible on mobile) */}
        <div className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Welcome</p>
            <h3 className="font-bold text-slate-900 text-sm truncate max-w-[160px]">{studentName}</h3>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100 transition-all uppercase tracking-wider border border-red-100"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Bottom Navigation for Mobile — horizontally scrollable so all 11 tabs fit */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 pb-safe rounded-t-xl shadow-lg">
            <div className="flex overflow-x-auto no-scrollbar items-center h-16 gap-1 px-2">
              {navItems.map((item) => {
                const isDisabled = !isProfileComplete && item.id !== 'profile';
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (isDisabled) {
                        alert("Please update your profile details (phone number) to access this section.");
                        return;
                      }
                      setActiveTab(item.id as any);
                    }}
                    className={`flex flex-col items-center justify-center gap-0.5 flex-shrink-0 px-3 h-full transition-all relative ${
                      activeTab === item.id ? 'text-indigo-600' : isDisabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400'
                    }`}
                    title={item.label}
                  >
                    <div className={`p-1.5 rounded-md transition-all ${activeTab === item.id ? 'bg-indigo-50' : ''}`}>
                      <item.icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">{item.label.split(' ')[0]}</span>
                    {isDisabled && <Lock className="w-2.5 h-2.5 absolute top-2 right-2 text-slate-300 opacity-50" />}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Academy...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <StudentDashboard 
                    studentId={studentId}
                    studentName={studentName}
                    enrollments={enrollments}
                    checklist={checklist}
                    badges={badges}
                    onUpdateChecklist={handleUpdateChecklist}
                    setActiveTab={setActiveTab}
                    onNavigate={setActiveTab}
                    onPlayCourse={handleResume}
                  />
                </motion.div>
              )}

              {activeTab === 'referral' && (
                <motion.div
                  key="referral"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ReferralDashboard studentId={studentId} studentName={studentName} />
                </motion.div>
              )}

              {activeTab === 'quiz' && (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <DailyQuiz studentId={studentId} />
                </motion.div>
              )}

              {activeTab === 'courses' && (
                <motion.div
                  key="courses"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {enrollments.length === 0 ? (
                    <div className="bg-background-100 border border-secondary/10 rounded-xl p-8 sm:p-20 text-center shadow-sm">
                      <BookOpen className="w-14 h-14 sm:w-20 sm:h-20 text-secondary/20 mx-auto mb-4 sm:mb-6" />
                      <h3 className="text-xl sm:text-2xl font-bold text-secondary mb-2 sm:mb-3">No Active Enrollments</h3>
                      <p className="text-secondary/60 max-w-md mx-auto mb-6 sm:mb-8 text-sm">You are not enrolled in any courses yet. Browse our catalog to find your next breakthrough.</p>
                      <button onClick={() => navigate('/#courses')} className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-indigo-500/10 text-sm">Explore Academy</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {enrollments.map(({ enrollment, course }) => {
                        const courseBatch = batchesList.find(b => b.course_id === course.id && b.id === studentBatchId);
                        const currentSectionName = courseBatch ? courseBatch.name : 'General Section';
                        return (
                          <motion.div
                            key={enrollment.id}
                            className="bg-background-100 border border-secondary/10 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all group shadow-sm hover:shadow-xl hover:shadow-indigo-500/5"
                          >
                            <div className="h-60 relative overflow-hidden">
                              <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              <div className="absolute top-6 left-6 z-20 flex gap-2">
                                <span className="px-3 py-1 bg-background/90 backdrop-blur-md text-secondary text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm">
                                  {course.level}
                                </span>
                                <span className="px-3 py-1 bg-indigo-600 backdrop-blur-md text-white text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm">
                                  {currentSectionName}
                                </span>
                              </div>
                            </div>
                            <div className="p-8">
                              <h3 className="text-2xl font-bold text-secondary mb-3 line-clamp-1">{course.title}</h3>
                              <div className="flex items-center gap-6 text-sm text-secondary/60 mb-8">
                                <div className="flex items-center font-bold">
                                  <Clock className="w-4 h-4 mr-2 text-indigo-400" />
                                  {course.duration}
                                </div>
                                <div className="flex items-center font-bold text-emerald-600">
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  {enrollment.progress_percentage}% Complete
                                </div>
                              </div>
                              
                              <div className="w-full h-2 bg-secondary/10 rounded-full mb-8 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${enrollment.progress_percentage}%` }}
                                  transition={{ duration: 1, ease: 'easeOut' }}
                                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                                />
                              </div>
                              <div className="space-y-3">
                                <button 
                                  onClick={() => handleResume(course, enrollment)} 
                                  className="w-full py-3 bg-secondary text-background hover:opacity-90 font-bold rounded-md transition-all flex items-center justify-center gap-2 group/btn shadow-md shadow-secondary/10 text-sm"
                                >
                                  <PlayCircle className="w-5 h-5" />
                                  Resume Learning
                                </button>
                                <button 
                                  onClick={() => { setSelectedCurriculumCourse(course); setIsCurriculumModalOpen(true); }}
                                  className="w-full py-2.5 border border-secondary/20 hover:border-indigo-500 text-secondary hover:text-indigo-400 font-bold rounded-md hover:bg-secondary/5 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                                >
                                  <FileText className="w-4 h-4" />
                                  Curriculum & Section Info
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'achievements' && (
                <motion.div
                  key="achievements"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Achievements />
                </motion.div>
              )}



              {activeTab === 'support' && (
                <motion.div
                  key="support"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 lg:mb-10">
                    <div>
                      <h3 className="text-2xl lg:text-3xl font-bold text-secondary mb-1 tracking-tight">Support Hub</h3>
                      <p className="text-xs lg:text-sm text-secondary/60 font-medium">Get technical assistance or academic guidance.</p>
                    </div>
                    <button
                      onClick={() => setIsTicketModalOpen(true)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10 text-sm"
                    >
                      <Plus size={16} /> Raise Ticket
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {tickets.map(ticket => (
                      <div 
                        key={ticket.id} 
                        onClick={() => handleOpenTicketChat(ticket)}
                        className="bg-background-100 border border-secondary/10 p-6 rounded-xl hover:border-indigo-500/50 hover:scale-[1.005] cursor-pointer transition-all shadow-sm group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="space-y-2">
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                              {ticket.category}
                            </span>
                            <h4 className="text-lg font-bold text-secondary group-hover:text-indigo-400 transition-colors">{ticket.description}</h4>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                            ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-xs text-secondary/40 font-bold">
                          <div className="flex items-center gap-2">
                            <Clock size={14} /> {new Date(ticket.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <Info size={14} /> Ref: {ticket.id.substring(0, 8)}
                          </div>
                          <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider font-black ml-auto flex items-center gap-1">
                            Open Chat &rarr;
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'attendance' && (
                <motion.div
                  key="attendance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <StudentAttendance 
                    studentId={studentId} 
                    studentName={studentName}
                    enrollments={enrollments} 
                  />
                </motion.div>
              )}

              {activeTab === 'certificates' && (
                <motion.div
                  key="certificates"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CertificateRenderer 
                    studentId={studentId} 
                    studentName={studentName}
                    enrollments={enrollments} 
                  />
                </motion.div>
              )}

              {activeTab === 'doubts' && (
                <motion.div
                  key="doubts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <DoubtWall 
                    studentId={studentId} 
                    studentName={studentName}
                    enrollments={enrollments} 
                  />
                </motion.div>
              )}

              {activeTab === 'coding' && (
                <motion.div
                  key="coding"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CodingPractice 
                    studentId={studentId} 
                    enrollments={enrollments} 
                  />
                </motion.div>
              )}

              {activeTab === 'recordings' && (
                <motion.div
                  key="recordings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <StudentRecordings 
                    enrollments={enrollments} 
                    batchId={studentBatchId} 
                    studentId={studentId}
                    studentName={studentName}
                  />
                </motion.div>
              )}

              {activeTab === 'mocktests' && (
                <motion.div
                  key="mocktests"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <StudentMockTests enrollments={enrollments} batchId={studentBatchId} studentName={studentName} />
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <StudentProfile 
                    studentId={studentId} 
                    onProfileUpdated={() => setIsProfileComplete(true)}
                  />
                </motion.div>
              )}

              {activeTab === 'projects' && (
                <motion.div
                  key="projects"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ProjectSubmissions studentId={studentId} enrollments={enrollments} />
                </motion.div>
              )}

              {activeTab === 'leaderboard' && (
                <motion.div
                  key="leaderboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <GlobalLeaderboard studentId={studentId} studentName={studentName} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Curriculum & Section Info Modal */}
      <AnimatePresence>
        {isCurriculumModalOpen && selectedCurriculumCourse && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsCurriculumModalOpen(false)} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white border border-slate-200 rounded-xl p-6 md:p-8 w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl text-slate-900"
            >
              <button 
                onClick={() => setIsCurriculumModalOpen(false)} 
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-all" 
                title="Close"
              >
                <X size={20} />
              </button>

              <div className="mb-6">
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-indigo-500/20">
                  {batchesList.find(b => b.course_id === selectedCurriculumCourse.id && b.id === studentBatchId)?.name || 'General Section'}
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mt-3 mb-2">{selectedCurriculumCourse.title}</h3>
                <p className="text-xs text-slate-500 font-medium font-sans">Day-by-day schedules, assignments, and allocated resources</p>
              </div>

              {(() => {
                let parsedCurriculum = { days: [], weeklyTests: [], tips: [], tools: [], subConcepts: [] };
                if (selectedCurriculumCourse.curriculum) {
                  try {
                    parsedCurriculum = typeof selectedCurriculumCourse.curriculum === 'string' 
                      ? JSON.parse(selectedCurriculumCourse.curriculum) 
                      : selectedCurriculumCourse.curriculum;
                  } catch (e) {
                    console.error("Failed parsing curriculum", e);
                  }
                }

                const hasSchedule = parsedCurriculum.days && parsedCurriculum.days.length > 0;
                const hasTests = parsedCurriculum.weeklyTests && parsedCurriculum.weeklyTests.length > 0;
                const hasTools = parsedCurriculum.tools && parsedCurriculum.tools.length > 0;
                const hasTips = parsedCurriculum.tips && parsedCurriculum.tips.length > 0;

                if (!hasSchedule && !hasTests && !hasTools && !hasTips) {
                  return (
                    <div className="text-center py-12 bg-slate-50 rounded-[1.5rem] border border-slate-200">
                      <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 italic">No curriculum details allocated for this course yet.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Days Schedule */}
                    {hasSchedule && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Daily Schedule
                        </h4>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {parsedCurriculum.days.map((day: any, i: number) => (
                            <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
                              <div>
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                                  Day {day.dayNumber} {day.date && <span className="ml-2 text-slate-400 font-normal">({day.date})</span>}
                                </span>
                                <h5 className="text-sm font-semibold text-slate-800 mt-0.5">{day.concept || 'TBD'}</h5>
                              </div>
                              <div className="flex flex-wrap gap-4 text-xs font-medium">
                                {day.material && (
                                  <div className="text-slate-600">
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Material</span>
                                    {day.material.startsWith('http') ? (
                                      <a href={day.material} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Link &rarr;</a>
                                    ) : (
                                      <span>{day.material}</span>
                                    )}
                                  </div>
                                )}
                                {day.assignment && (
                                  <div className="text-slate-600">
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Assignment</span>
                                    {(() => {
                                      const linkedTest = mockTests.find(t => t.id === day.assignment);
                                      if (linkedTest) {
                                        return (
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-indigo-600 font-medium truncate max-w-[150px]">{linkedTest.title}</span>
                                            <button
                                              onClick={() => {
                                                setIsCurriculumModalOpen(false);
                                                setActiveTab('mocktests');
                                              }}
                                              className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-black uppercase tracking-wider transition-colors shadow-sm shrink-0"
                                            >
                                              Take
                                            </button>
                                          </div>
                                        );
                                      }
                                      return <span>{day.assignment}</span>;
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tests & Milestones */}
                    {hasTests && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Weekly Tests & Assessments
                        </h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {parsedCurriculum.weeklyTests.map((testIdOrText: string, i: number) => {
                            const linkedTest = mockTests.find(t => t.id === testIdOrText);
                            if (linkedTest) {
                              return (
                                <li key={i} className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-950 flex items-center justify-between gap-2 shadow-sm">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                                    <span className="truncate">{linkedTest.title}</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setIsCurriculumModalOpen(false);
                                      setActiveTab('mocktests');
                                    }}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm shrink-0"
                                  >
                                    Take Test
                                  </button>
                                </li>
                              );
                            }
                            return (
                              <li key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="truncate">{testIdOrText}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Required Tools */}
                      {hasTools && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Required Tools & Software
                          </h4>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                            {parsedCurriculum.tools.map((tool: string, i: number) => (
                              <div key={i} className="text-xs text-slate-700 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-400" />
                                {tool}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tips & Tricks */}
                      {hasTips && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Professional Tips & Hacks
                          </h4>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                            {parsedCurriculum.tips.map((tip: string, i: number) => (
                              <div key={i} className="text-xs text-slate-700 flex items-start gap-2">
                                <span className="text-amber-500 shrink-0">💡</span>
                                <span className="leading-normal">{tip}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Modals & Overlays */}
      <AnimatePresence>
        {isPlayerOpen && selectedCourseData && (
          <CoursePlayer 
            course={selectedCourseData.course}
            lessons={selectedCourseData.lessons}
            enrollment={selectedCourseData.enrollment}
            studentName={studentName}
            onClose={() => setIsPlayerOpen(false)}
            onProgressUpdate={(newProgress) => {
              setEnrollments(enrollments.map(enr => 
                enr.enrollment.id === selectedCourseData.enrollment.id 
                  ? { ...enr, enrollment: { ...enr.enrollment, progress_percentage: newProgress } }
                  : enr
              ));
              setSelectedCourseData({
                ...selectedCourseData,
                enrollment: { ...selectedCourseData.enrollment, progress_percentage: newProgress }
              });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTicketModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-background-100 border border-secondary/10 w-full sm:max-w-xl rounded-t-xl sm:rounded-xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="px-5 sm:px-10 py-5 sm:py-8 border-b border-secondary/10 flex items-center justify-between">
                <h2 className="text-xl sm:text-3xl font-bold text-secondary">New Request</h2>
                <button 
                  onClick={() => setIsTicketModalOpen(false)} 
                  className="p-2.5 bg-secondary/5 text-secondary/40 hover:text-secondary rounded-md transition-all"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleTicketSubmit} className="p-5 sm:p-10 space-y-5 sm:space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-3">Select Category</label>
                  <select
                    value={ticketFormData.category}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, category: e.target.value })}
                    className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-4 focus:border-indigo-500 outline-none text-secondary font-bold appearance-none transition-all cursor-pointer text-sm"
                    title="Category"
                  >
                    <option value="Course Content">Course Content</option>
                    <option value="Payment / EMI">Payment / EMI</option>
                    <option value="Technical Access">Technical Access</option>
                    <option value="Certificate Request">Certificate Request</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-3">Message Details</label>
                  <textarea
                    required
                    rows={4}
                    value={ticketFormData.description}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                    placeholder="Describe your issue in detail..."
                    className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-4 focus:border-indigo-500 outline-none text-secondary font-medium placeholder:text-secondary/20 resize-none transition-all text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-secondary text-background font-bold rounded-md hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-secondary/20"
                >
                  Submit Ticket
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-background-100 border border-secondary/10 w-full sm:max-w-2xl rounded-t-xl sm:rounded-xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-4 sm:px-10 py-4 sm:py-8 border-b border-secondary/10 flex items-center justify-between bg-secondary/5">
                <div className="min-w-0 flex-1 mr-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                      {selectedTicket.category}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                      selectedTicket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-xl font-bold text-secondary truncate">Ref: {selectedTicket.id.substring(0, 12)}</h2>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)} 
                  className="p-2.5 bg-background border border-secondary/10 text-secondary/40 hover:text-secondary rounded-md shadow-sm transition-all flex-shrink-0"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-10 space-y-4 sm:space-y-6 bg-secondary/5">
                {/* Initial Query Bubble */}
                <div className="flex flex-col items-start max-w-[85%]">
                  <div className="text-[9px] font-black text-secondary/40 uppercase tracking-widest mb-1 ml-2">
                    {studentName} (You)
                  </div>
                  <div className="bg-indigo-600 text-white px-4 py-3 rounded-lg rounded-tl-none font-medium shadow-sm leading-relaxed text-sm">
                    {selectedTicket.description}
                  </div>
                  <div className="text-[9px] text-secondary/40 font-bold mt-1 ml-2">
                    {new Date(selectedTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {repliesLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3 text-secondary/40">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider">Loading conversation...</span>
                  </div>
                ) : (
                  ticketReplies.map(reply => {
                    const isSelf = reply.sender_role === 'student';
                    return (
                      <div 
                        key={reply.id} 
                        className={`flex flex-col ${isSelf ? 'items-start max-w-[85%]' : 'items-end ml-auto max-w-[85%]'}`}
                      >
                        <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isSelf ? 'text-secondary/40 ml-2' : 'text-emerald-500 mr-2'}`}>
                          {isSelf ? reply.sender_name : `${reply.sender_name} (Staff)`}
                        </div>
                        <div className={`px-4 py-3 rounded-lg font-medium shadow-sm leading-relaxed text-sm ${
                          isSelf 
                            ? 'bg-indigo-600 text-white rounded-tl-none' 
                            : 'bg-emerald-600 text-white rounded-tr-none'
                        }`}>
                          {reply.message}
                        </div>
                        <div className={`text-[9px] text-secondary/40 font-bold mt-1 ${isSelf ? 'ml-2' : 'mr-2'}`}>
                          {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input */}
              <div className="p-3 sm:p-8 border-t border-secondary/10 bg-background-100">
                <form onSubmit={handleSendReply} className="flex gap-2 sm:gap-4">
                  <input
                    type="text"
                    required
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 bg-secondary/5 border border-secondary/10 rounded-md px-4 py-3 focus:border-indigo-500 outline-none text-secondary font-medium placeholder:text-secondary/20 transition-all text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 sm:px-6 py-3 bg-secondary text-background font-bold rounded-md hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-secondary/10 flex items-center gap-1.5 flex-shrink-0 text-sm"
                  >
                    <Send size={16} /> <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentPortal;
