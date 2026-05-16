import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, BookOpen, Clock, PlayCircle, 
  CreditCard, Info, CheckCircle2, 
  Calendar, Wallet, LayoutDashboard,
  Trophy, ShieldCheck, Plus, X, Compass, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  getEnrollmentsByStudent, getCourses, 
  getPaymentsByStudent, getSupportTickets,
  createSupportTicket, getLessonsByCourse,
  getStudentChecklist, updateChecklistStep,
  Course, Enrollment, Payment, SupportTicket, Lesson, OnboardingStep
} from '../lib/turso';
import StudentDashboard from './StudentDashboard';
import CoursePlayer from './CoursePlayer';
import Achievements from './Achievements';

const StudentPortal = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'achievements' | 'finance' | 'support' | 'explore'>('dashboard');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [enrollments, setEnrollments] = useState<{ enrollment: Enrollment; course: Course }[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [checklist, setChecklist] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketFormData, setTicketFormData] = useState({ category: 'Course Content', description: '' });
  
  // Content Player State
  const [selectedCourseData, setSelectedCourseData] = useState<{ course: Course; enrollment: Enrollment; lessons: Lesson[] } | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'explore', label: 'Explore Programs', icon: Compass },
    { id: 'finance', label: 'Finance & Payments', icon: CreditCard },
    { id: 'support', label: 'Help & Support', icon: Info },
  ];

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount_paid, 0);
  const totalDue = payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount_paid, 0);

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
        const [studentEnrollments, allCoursesData, studentPayments, studentTickets, studentChecklist] = await Promise.all([
          getEnrollmentsByStudent(id),
          getCourses(true),
          getPaymentsByStudent(id),
          getSupportTickets(id),
          getStudentChecklist(id)
        ]);

        setAllCourses(allCoursesData);

        const enriched = studentEnrollments.map(enr => {
          const course = allCoursesData.find(c => c.id === enr.course_id);
          return course ? { enrollment: enr, course } : null;
        }).filter(Boolean) as { enrollment: Enrollment; course: Course }[];

        setEnrollments(enriched);
        setPayments(studentPayments);
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

  const handleLogout = () => {
    localStorage.removeItem('cynexai_student_auth');
    localStorage.removeItem('cynexai_student_id');
    localStorage.removeItem('cynexai_student_name');
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

  return (
    <div className="min-h-screen bg-[#f8fafc] flex selection:bg-[#41c8df]/20">
      {/* Sidebar Navigation */}
      <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col sticky top-0 h-screen pt-24 pb-8">
        <div className="px-6 mb-12">
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[#41c8df]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h2 className="font-bold text-slate-900 mb-1 relative z-10">{studentName}</h2>
            <p className="text-[10px] font-black text-[#41c8df] uppercase tracking-widest relative z-10">Student Identity Verified</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
                activeTab === item.id 
                  ? 'bg-[#41c8df] text-black shadow-lg shadow-[#41c8df]/20' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-4 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-12 relative">
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Mobile Tab Navigation */}
          <div className="lg:hidden overflow-x-auto pb-6 mb-8 no-scrollbar">
            <div className="flex gap-2 w-max">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`px-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === item.id ? 'bg-[#41c8df] text-black shadow-lg shadow-[#41c8df]/20' : 'bg-white text-slate-500 border border-slate-200'
                  }`}
                >
                  <item.icon className="w-4 h-4" /> {item.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-[#41c8df] rounded-full animate-spin" />
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
                    studentName={studentName}
                    enrollments={enrollments}
                    checklist={checklist}
                    onUpdateChecklist={handleUpdateChecklist}
                    setActiveTab={setActiveTab}
                    onNavigate={setActiveTab}
                    onPlayCourse={handleResume}
                  />
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
                    <div className="bg-white border border-slate-200 rounded-[3rem] p-20 text-center shadow-sm">
                      <BookOpen className="w-20 h-20 text-slate-200 mx-auto mb-6" />
                      <h3 className="text-2xl font-bold text-slate-900 mb-3">No Active Enrollments</h3>
                      <p className="text-slate-500 max-w-md mx-auto mb-8">You are not enrolled in any courses yet. Browse our catalog to find your next breakthrough.</p>
                      <button onClick={() => navigate('/#courses')} className="px-10 py-4 bg-[#41c8df] text-black font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-[#41c8df]/20">Explore Academy</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {enrollments.map(({ enrollment, course }) => (
                        <motion.div
                          key={enrollment.id}
                          className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden hover:border-[#41c8df] transition-all group shadow-sm hover:shadow-xl hover:shadow-[#41c8df]/5"
                        >
                          <div className="h-60 relative overflow-hidden">
                            <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute top-6 left-6 z-20">
                              <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm">
                                {course.level}
                              </span>
                            </div>
                          </div>
                          <div className="p-8">
                            <h3 className="text-2xl font-bold text-slate-900 mb-3 line-clamp-1">{course.title}</h3>
                            <div className="flex items-center gap-6 text-sm text-slate-500 mb-8">
                              <div className="flex items-center font-bold">
                                <Clock className="w-4 h-4 mr-2 text-[#41c8df]" />
                                {course.duration}
                              </div>
                              <div className="flex items-center font-bold text-emerald-600">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {enrollment.progress_percentage}% Complete
                              </div>
                            </div>
                            
                            <div className="w-full h-2 bg-slate-100 rounded-full mb-8 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${enrollment.progress_percentage}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="h-full bg-gradient-to-r from-[#41c8df] to-emerald-400"
                              />
                            </div>
                            <button 
                              onClick={() => handleResume(course, enrollment)} 
                              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group/btn shadow-lg shadow-slate-900/10"
                            >
                              <PlayCircle className="w-5 h-5" />
                              Resume Learning
                            </button>
                          </div>
                        </motion.div>
                      ))}
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

              {activeTab === 'finance' && (
                <motion.div
                  key="finance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem]">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-500 mb-6 shadow-sm border border-emerald-50">
                        <Wallet size={28} />
                      </div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Total Paid</p>
                      <h4 className="text-4xl font-black text-slate-900">${totalPaid}</h4>
                    </div>
                    <div className="bg-orange-50 border border-orange-100 p-8 rounded-[2.5rem]">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-orange-500 mb-6 shadow-sm border border-orange-50">
                        <Calendar size={28} />
                      </div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Upcoming EMI</p>
                      <h4 className="text-4xl font-black text-slate-900">${totalDue}</h4>
                    </div>
                    <div className="bg-[#41c8df]/5 border border-[#41c8df]/10 p-8 rounded-[2.5rem]">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#41c8df] mb-6 shadow-sm border-[#41c8df]/10">
                        <ShieldCheck className="w-7 h-7" />
                      </div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Payment Status</p>
                      <h4 className="text-4xl font-black text-slate-900">VERIFIED</h4>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm">
                    <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-xl text-slate-900">Transaction History</h3>
                      <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">End-to-End Encrypted</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference ID</th>
                            <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                            <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Due Date</th>
                            <th className="px-10 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {payments.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-10 py-6 text-sm font-mono text-slate-400">{p.id.substring(0, 16)}</td>
                              <td className="px-10 py-6 text-sm font-black text-slate-900">${p.amount_paid}</td>
                              <td className="px-10 py-6 text-sm text-slate-500">{new Date(p.due_date).toLocaleDateString()}</td>
                              <td className="px-10 py-6 text-right">
                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                  p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'support' && (
                <motion.div
                  key="support"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-3xl font-bold text-slate-900">Support Desk</h3>
                      <p className="text-slate-500 text-sm mt-1">Direct communication with your learning mentors</p>
                    </div>
                    <button
                      onClick={() => setIsTicketModalOpen(true)}
                      className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:scale-105 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/20"
                    >
                      <Plus size={20} /> Raise Ticket
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] hover:border-[#41c8df] transition-all shadow-sm">
                        <div className="flex items-start justify-between mb-6">
                          <div className="space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#41c8df] bg-[#41c8df]/10 px-3 py-1.5 rounded-lg border border-[#41c8df]/20">
                              {ticket.category}
                            </span>
                            <h4 className="text-xl font-bold text-slate-900">{ticket.description}</h4>
                          </div>
                          <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-xs text-slate-400 font-bold">
                          <div className="flex items-center gap-2">
                            <Clock size={14} /> {new Date(ticket.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <Info size={14} /> Ref: {ticket.id.substring(0, 8)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'explore' && (
                <motion.div
                  key="explore"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="mb-12">
                    <h3 className="text-4xl font-black text-slate-900 mb-2">Explore Our Programs</h3>
                    <p className="text-slate-500 text-lg">Master the world's most advanced technologies with industry-led certifications.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {allCourses.filter((c: Course) => !enrollments.some((e: { enrollment: Enrollment; course: Course }) => e.course.id === c.id)).map((course: Course) => (
                      <motion.div 
                        key={course.id}
                        whileHover={{ y: -5 }}
                        className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden hover:border-[#41c8df] transition-all group shadow-sm"
                      >
                        <div className="h-48 relative overflow-hidden">
                          <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute top-4 left-4">
                            <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm">
                              {course.level}
                            </span>
                          </div>
                        </div>
                        <div className="p-8">
                          <h4 className="text-xl font-bold text-slate-900 mb-2">{course.title}</h4>
                          <p className="text-slate-500 text-sm line-clamp-2 mb-6">{course.description}</p>
                          <div className="flex items-center justify-between mb-8">
                             <div className="flex items-center text-xs font-bold text-slate-400">
                               <Clock className="w-3.5 h-3.5 mr-1.5 text-[#41c8df]" />
                               {course.duration}
                             </div>
                             <div className="flex items-center text-xs font-bold text-emerald-600">
                               <Star className="w-3.5 h-3.5 mr-1.5 fill-current" />
                               {course.rating} Rating
                             </div>
                          </div>
                          <button className="w-full py-4 bg-slate-50 text-slate-900 font-bold rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                            View Details
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Global Modals & Overlays */}
      <AnimatePresence>
        {isPlayerOpen && selectedCourseData && (
          <CoursePlayer 
            course={selectedCourseData.course}
            lessons={selectedCourseData.lessons}
            enrollment={selectedCourseData.enrollment}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTicketModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white border border-slate-200 w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-3xl font-bold text-slate-900">New Request</h2>
                <button 
                  onClick={() => setIsTicketModalOpen(false)} 
                  className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleTicketSubmit} className="p-10 space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Select Category</label>
                  <select
                    value={ticketFormData.category}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 focus:border-[#41c8df] outline-none text-slate-900 font-bold appearance-none transition-all cursor-pointer"
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
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Message Details</label>
                  <textarea
                    required
                    rows={4}
                    value={ticketFormData.description}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                    placeholder="Describe your issue in detail..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-6 py-6 focus:border-[#41c8df] outline-none text-slate-900 font-medium placeholder:text-slate-300 resize-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-slate-900 text-white font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-slate-900/20 text-lg"
                >
                  Submit Ticket
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentPortal;
