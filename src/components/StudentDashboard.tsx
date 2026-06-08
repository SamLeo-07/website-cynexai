import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, CheckCircle2, Clock, 
  ArrowRight, PlayCircle,
  Target, Zap, Bell, User,
  Trophy, Star, Medal, Sparkles,
  TrendingUp, BookOpen, Flame,
  Award, Gem, BarChart3, AlertTriangle,
  UserCheck, ShieldCheck, GraduationCap, Users, ChevronRight,
  Upload, Camera, Phone, Lock, BadgeCheck, Video, MessageCircle
} from 'lucide-react';
import { 
  Course, Enrollment, OnboardingStep, Badge,
  getNotifications, markNotificationAsRead, getUserProgress,
  Notification, UserProgress
} from '../lib/turso';
import { useToast } from './ToastContext';

interface StudentDashboardProps {
  studentId?: string;
  studentName: string;
  enrollments: { enrollment: Enrollment; course: Course }[];
  checklist: OnboardingStep[];
  badges: Badge[];
  onUpdateChecklist: (stepId: string, isDone: boolean) => void;
  setActiveTab: (tab: any) => void;
  onNavigate: (tab: any) => void;
  onPlayCourse: (course: Course, enrollment: Enrollment) => void;
}

const StudentDashboard = ({ 
  studentId,
  studentName, 
  enrollments, 
  checklist,
  badges,
  onUpdateChecklist,
  setActiveTab,
  onNavigate,
  onPlayCourse
}: StudentDashboardProps) => {
  const { showToast } = useToast();
  const [attendanceWarning, setAttendanceWarning] = useState<boolean>(false);
  const [attendancePercentage, setAttendancePercentage] = useState<number>(100);
  
  // Database State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dbProgress, setDbProgress] = useState<UserProgress | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);

  useEffect(() => {
    const fetchDbData = async () => {
      const activeStudentId = studentId || localStorage.getItem('cynexai_student_id') || '';
      if (!activeStudentId) return;

      setLoadingDb(true);
      try {
        const [notifs, progress] = await Promise.all([
          getNotifications(activeStudentId),
          getUserProgress(activeStudentId)
        ]);
        setNotifications(notifs);
        setDbProgress(progress);
      } catch (err) {
        console.error("Deepmind: Failed to load db data in dashboard", err);
      } finally {
        setLoadingDb(false);
      }
    };

    fetchDbData();
  }, [studentId]);

  const handleMarkAsRead = async (notifId: string) => {
    const activeStudentId = studentId || localStorage.getItem('cynexai_student_id') || '';
    if (!activeStudentId) return;

    try {
      await markNotificationAsRead(notifId, activeStudentId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: 1 } : n));
      showToast('Notification marked as read', 'success');
    } catch (e) {
      console.error("Deepmind: Failed to mark notification as read", e);
    }
  };

  useEffect(() => {
    // Simulate real-time toast notification on mount
    const timer1 = setTimeout(() => {
      showToast(`Welcome back, ${studentName}! Ready to learn?`, 'info');
    }, 1500);

    const timer2 = setTimeout(() => {
      showToast('A new mock test is available for your enrolled course.', 'success');
    }, 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [studentName, showToast]);

  useEffect(() => {
    // Mock logic to calculate attendance percentage based on active courses
    // In a real scenario, this would fetch from getStudentAttendance and getAttendanceSessions
    if (enrollments.length > 0) {
      // Simulate low attendance for demo if they have more than 1 enrollment
      const mockedPercentage = enrollments.length > 1 ? 65 : 85; 
      setAttendancePercentage(mockedPercentage);
      if (mockedPercentage < 75) {
        setAttendanceWarning(true);
      }
    }
  }, [enrollments]);

  const activeCourses = enrollments.filter(e => e.enrollment.progress_percentage > 0 && e.enrollment.progress_percentage < 100);
  const completedCourses = enrollments.filter(e => e.enrollment.progress_percentage === 100);
  const notStartedCourses = enrollments.filter(e => e.enrollment.progress_percentage === 0);
  
  // XP & Level calculation (mirrors Achievements.tsx logic, fallback to dynamic DB value)
  const { totalXp, level, xpProgress, nextLevelXp } = useMemo(() => {
    let xp = 0;
    if (dbProgress && dbProgress.xpPoints > 0) {
      xp = dbProgress.xpPoints;
    } else {
      const sandboxXp = parseInt(localStorage.getItem('cynexai_sandbox_xp') || '0', 10);
      const mockTestXp = parseInt(localStorage.getItem('cynexai_mock_test_xp') || '0', 10);
      xp = enrollments.length * 100 + sandboxXp + mockTestXp;
      enrollments.forEach(enr => {
        xp += Math.floor((enr.enrollment.progress_percentage || 0) * 10);
      });
    }
    const lvl = Math.floor(xp / 1000) + 1;
    const currentLevelXp = xp % 1000;
    const progressToNext = (currentLevelXp / 1000) * 100;
    return { totalXp: xp, level: lvl, xpProgress: progressToNext, nextLevelXp: currentLevelXp };
  }, [enrollments, dbProgress]);

  // Combine database badges with custom unlocked badges from local storage
  const allBadges = useMemo(() => {
    const customBadgesJson = localStorage.getItem('cynexai_custom_badges');
    let customBadges: Badge[] = [];
    if (customBadgesJson) {
      try {
        customBadges = JSON.parse(customBadgesJson);
      } catch (e) {
        console.error(e);
      }
    }
    const combined = [...badges, ...customBadges];
    const unique = combined.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);
    return unique;
  }, [badges]);

  // Streak calculation (falls back to DB progress if configured)
  const streakDays = useMemo(() => {
    if (dbProgress && dbProgress.currentStreak > 0) {
      return dbProgress.currentStreak;
    }
    const base = completedCourses.length * 3;
    const active = activeCourses.length * 2;
    return Math.min(base + active + 1, 30); // Cap at 30 days
  }, [activeCourses.length, completedCourses.length, dbProgress]);

  const overallProgress = useMemo(() => {
    if (enrollments.length === 0) return 0;
    const total = enrollments.reduce((sum, e) => sum + e.enrollment.progress_percentage, 0);
    return Math.round(total / enrollments.length);
  }, [enrollments]);

  const onboardingSteps = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your personal details, photo, and contact information to unlock personalized learning recommendations.',
      icon: UserCheck,
      color: '#6366f1',
      bg: 'bg-indigo-500/8',
      border: 'border-indigo-500/20',
      xpReward: 50,
      timeEstimate: '2 min',
      bullets: [
        'Upload a clear profile photo',
        'Add your phone number & LinkedIn',
        'Set your learning goals & timezone',
        'Choose your preferred notification method',
      ],
      actionLabel: 'Go to Profile',
      done: checklist.find(s => s.step_id === 'profile')?.is_done ?? false,
      navigateTo: 'profile' as const,
    },
    {
      id: 'identity',
      title: 'Identity Verification',
      description: 'Verify your identity with a government-issued ID to unlock certificates, placement support, and community trust badge.',
      icon: ShieldCheck,
      color: '#a855f7',
      bg: 'bg-purple-500/8',
      border: 'border-purple-500/20',
      xpReward: 100,
      timeEstimate: '5 min',
      bullets: [
        'Upload Aadhaar / Passport / PAN card',
        'Take a live selfie for facial matching',
        'Verification processed within 24 hours',
        'Unlocks digital certificate & badge',
      ],
      actionLabel: 'Verify Identity',
      done: checklist.find(s => s.step_id === 'identity')?.is_done ?? false,
      navigateTo: 'profile' as const,
    },
    {
      id: 'first_lesson',
      title: 'Start Your First Lesson',
      description: 'Jump into your enrolled course and complete your first module. Each lesson brings you closer to certification and placement.',
      icon: GraduationCap,
      color: '#10b981',
      bg: 'bg-emerald-500/8',
      border: 'border-emerald-500/20',
      xpReward: 150,
      timeEstimate: '45 min',
      bullets: [
        'Watch the intro lecture video',
        'Complete hands-on code exercises',
        'Pass the module quiz (70% required)',
        'Earn your first XP and course badge',
      ],
      actionLabel: 'Start Learning',
      done: enrollments.some(e => e.enrollment.progress_percentage > 0),
      navigateTo: 'courses' as const,
    },
    {
      id: 'community',
      title: 'Join the Student Hub',
      description: 'Connect with 2,000+ students and industry mentors. Ask doubts, share projects, and find your study group.',
      icon: Users,
      color: '#f97316',
      bg: 'bg-orange-500/8',
      border: 'border-orange-500/20',
      xpReward: 75,
      timeEstimate: '3 min',
      bullets: [
        'Post your first question in Doubt Wall',
        'Join your batch WhatsApp / Discord group',
        'Follow 3 mentors in your field',
        'Introduce yourself to your cohort',
      ],
      actionLabel: 'Open Hub',
      done: checklist.find(s => s.step_id === 'community')?.is_done ?? false,
      navigateTo: 'doubts' as const,
    },
  ];

  const handleStepAction = (step: typeof onboardingSteps[0]) => {
    if (step.navigateTo === 'courses') {
      onNavigate('courses');
    } else if (step.navigateTo === 'doubts') {
      // Navigate to doubts/support tab
      (onNavigate as any)('doubts');
      if (!step.done) onUpdateChecklist(step.id, true);
    } else if (step.navigateTo === 'profile') {
      (onNavigate as any)('profile');
    } else {
      if (!step.done) onUpdateChecklist(step.id, true);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  // Badge icon mapping
  const BadgeIcon = ({ iconName }: { iconName: string }) => {
    switch (iconName) {
      case 'Zap': return <Zap size={24} />;
      case 'Rocket': return <Rocket size={24} />;
      case 'Star': return <Star size={24} />;
      case 'Medal': return <Medal size={24} />;
      case 'Award': return <Award size={24} />;
      default: return <Trophy size={24} />;
    }
  };

  return (
    <motion.div 
      className="space-y-6 sm:space-y-10 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Attendance Warning Banner */}
      <AnimatePresence>
        {attendanceWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl shadow-sm flex items-start gap-4"
          >
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-red-800 font-bold text-sm">Attendance Warning</h4>
              <p className="text-red-700 text-xs mt-1 font-medium">
                Your overall attendance is currently at <span className="font-black">{attendancePercentage}%</span>. 
                It must be maintained above 75% to remain eligible for placement support.
              </p>
            </div>
            <button 
              onClick={() => setAttendanceWarning(false)}
              className="p-1 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
            >
              <Target className="w-4 h-4 opacity-0" /> {/* Spacer or close logic */}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Row 1: Welcome Hero + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome Hero - Enhanced */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-gradient-to-br from-indigo-500/10 to-emerald-500/5 dark:to-emerald-950/10 border border-secondary/10 rounded-xl p-6 lg:p-10 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-indigo-500/10 transition-all duration-700" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/5 blur-[60px] rounded-full -ml-10 -mb-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-indigo-400" size={18} />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-md">
                Level {level} Learner
              </span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-secondary mb-4 tracking-tight">
              Welcome back, <br className="sm:hidden" /> <span className="text-indigo-400">{studentName}</span>!
            </h2>
            <p className="text-sm lg:text-base text-secondary/60 max-w-md mb-6 leading-relaxed font-medium">
              You are currently mastering <span className="text-secondary font-bold">{enrollments.length} skills</span>. 
              Keep up the momentum to reach your certification goals.
            </p>
            
            {/* XP Progress Bar - Inline */}
            <div className="mb-6 bg-background-100/60 backdrop-blur-sm rounded-lg p-4 border border-secondary/10 max-w-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-secondary/60">
                  <Zap size={14} className="text-yellow-500" fill="currentColor" />
                  <span>{totalXp.toLocaleString()} / {level * 1000} XP</span>
                </div>
                <span className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Level {level + 1}</span>
              </div>
              <div className="w-full bg-secondary/10 rounded-full h-2.5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-yellow-400 rounded-full relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                </motion.div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setActiveTab('courses')}
                className="w-full sm:w-auto px-8 lg:px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md flex items-center justify-center gap-3 transition-all shadow-md shadow-indigo-500/10 active:scale-95"
              >
                Continue Learning <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => setActiveTab('achievements')}
                className="w-full sm:w-auto px-8 lg:px-10 py-4 bg-background-100 text-secondary font-bold rounded-md flex items-center justify-center gap-3 hover:bg-secondary/5 transition-all shadow-sm border border-secondary/10 active:scale-95"
              >
                <Trophy size={18} className="text-indigo-400" />
                View Badges
              </button>
            </div>
          </div>
        </motion.div>

        {/* Training Pulse - Enhanced Stats Card */}
        <motion.div variants={itemVariants} className="bg-background-100 border border-secondary/10 rounded-xl p-5 lg:p-8 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all">
          <div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-secondary flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-400" />
                Training Pulse
              </h3>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-md text-[10px] font-black text-orange-400">
                <Flame size={12} /> {streakDays}d
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/5 border border-secondary/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-md flex items-center justify-center text-indigo-400">
                    <PlayCircle size={18} />
                  </div>
                  <span className="text-xs text-secondary/60 font-bold uppercase tracking-wider">Active</span>
                </div>
                <span className="text-xl font-black text-secondary">{activeCourses.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-md flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={18} />
                  </div>
                  <span className="text-xs text-secondary/60 font-bold uppercase tracking-wider">Finished</span>
                </div>
                <span className="text-xl font-black text-emerald-400">{completedCourses.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-md flex items-center justify-center text-blue-400">
                    <BookOpen size={18} />
                  </div>
                  <span className="text-xs text-secondary/60 font-bold uppercase tracking-wider">Enrolled</span>
                </div>
                <span className="text-xl font-black text-blue-400">{enrollments.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500/10 rounded-md flex items-center justify-center text-yellow-400">
                    <Zap size={18} />
                  </div>
                  <span className="text-xs text-secondary/60 font-bold uppercase tracking-wider">Total XP</span>
                </div>
                <span className="text-xl font-black text-yellow-400">{totalXp.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          {/* Overall Certification Progress */}
          <div className="pt-6 mt-6 border-t border-secondary/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Overall Progress</span>
              <span className="text-xs font-black text-indigo-400">{overallProgress}%</span>
            </div>
            <div className="w-full bg-secondary/10 rounded-full h-3 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-indigo-600 to-emerald-400 relative"
              >
                <div className="absolute inset-0 bg-white/10 animate-pulse rounded-full" />
              </motion.div>
            </div>
            <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mt-2 text-center">Certification Path</p>
          </div>
        </motion.div>
      </div>

      {/* Row 2: All Courses Progress Overview */}
      {enrollments.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-secondary flex items-center gap-3">
              <BarChart3 className="text-indigo-400" size={28} />
              Course Progress
            </h3>
            <span className="px-4 py-1.5 bg-secondary/5 text-secondary/60 rounded-full text-[10px] font-black uppercase tracking-widest">
              {completedCourses.length}/{enrollments.length} COMPLETE
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {enrollments.map(({ enrollment, course }, idx) => {
              const progress = enrollment.progress_percentage;
              const isComplete = progress === 100;
              const isNotStarted = progress === 0;
              
              // Milestone markers
              const milestones = [25, 50, 75, 100];
              
              return (
                <motion.div
                  key={enrollment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`bg-background-100 border transition-all group hover:shadow-xl rounded-xl p-5 sm:p-8 ${
                    isComplete 
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' 
                      : 'border-secondary/10 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 rounded-md overflow-hidden shrink-0 shadow-md shadow-slate-200/50">
                      <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-secondary text-sm leading-tight truncate">{course.title}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isComplete ? 'bg-emerald-100 text-emerald-700' : 
                          isNotStarted ? 'bg-secondary/10 text-secondary/60' : 
                          'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {isComplete ? 'Completed' : isNotStarted ? 'Not Started' : 'In Progress'}
                        </span>
                        <span className="text-[10px] text-secondary/40 font-bold">{course.level}</span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Progress Bar with Milestones */}
                  <div className="relative mb-2">
                    <div className="w-full bg-secondary/10 rounded-full h-3 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                        className={`h-full rounded-full relative ${
                          isComplete 
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                            : 'bg-gradient-to-r from-indigo-600 to-indigo-400'
                        }`}
                      >
                        <div className="absolute inset-0 bg-white/15 animate-pulse rounded-full" />
                      </motion.div>
                    </div>
                    
                    {/* Milestone Dots */}
                    <div className="flex justify-between px-[2px] mt-1">
                      {milestones.map((m) => (
                        <div key={m} className="relative flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full border transition-colors ${
                            progress >= m 
                              ? 'bg-emerald-400 border-emerald-300' 
                              : 'bg-secondary/20 border-secondary/10'
                          }`} />
                          <span className={`text-[7px] font-black mt-0.5 ${
                            progress >= m ? 'text-emerald-500' : 'text-slate-300'
                          }`}>{m}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm font-black text-secondary">{progress}%</span>
                    <button 
                      onClick={() => onPlayCourse(course, enrollment)}
                      className={`px-5 py-2.5 rounded-md text-[10px] font-black flex items-center gap-2 transition-all active:scale-95 ${
                        isComplete
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : isNotStarted
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/10'
                            : 'bg-secondary text-background hover:opacity-90 shadow-md shadow-secondary/10'
                      }`}
                    >
                      {isComplete ? <CheckCircle2 size={14} /> : <PlayCircle size={14} />}
                      {isComplete ? 'Review' : isNotStarted ? 'Start' : 'Resume'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Row 3: Checklist + Achievements Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Start Cards - Enhanced */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-black text-secondary flex items-center gap-3">
              <Rocket className="text-indigo-400" size={28} />
              Quick Start
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {onboardingSteps.map(s => (
                  <div key={s.id} className={`w-2 h-2 rounded-full transition-all ${s.done ? 'bg-indigo-500' : 'bg-secondary/15'}`} />
                ))}
              </div>
              <span className="px-3 py-1.5 bg-secondary/5 text-secondary/60 rounded-full text-[10px] font-black uppercase tracking-widest">
                {onboardingSteps.filter(s => s.done).length}/{onboardingSteps.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {onboardingSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`relative flex flex-col p-5 sm:p-6 rounded-xl border transition-all group/step hover:shadow-xl overflow-hidden ${
                    step.done
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : `bg-background-100 ${step.border} hover:border-opacity-80 shadow-sm`
                  }`}
                >
                  {/* Background accent */}
                  {!step.done && (
                    <div
                      className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover/step:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{ background: `${step.color}15`, transform: 'translate(30%,-30%)' }}
                    />
                  )}

                  {/* Top row: icon + action/done button */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 transition-all border ${
                        step.done
                          ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400'
                          : `${step.bg} border-transparent group-hover/step:scale-110`
                      }`}
                      style={!step.done ? { color: step.color } : {}}
                    >
                      {step.done ? <CheckCircle2 size={20} /> : <StepIcon size={20} />}
                    </div>

                    {step.done ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 size={10} /> Done
                      </span>
                    ) : (
                      <button
                        onClick={() => handleStepAction(step)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-background text-[10px] font-black uppercase tracking-wider rounded-md transition-all hover:scale-105 active:scale-95 shadow-md"
                        style={{ background: step.color, boxShadow: `0 4px 14px ${step.color}40` }}
                      >
                        {step.actionLabel} <ChevronRight size={11} />
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <h4
                    className={`font-black text-base mb-1.5 transition-colors ${
                      step.done ? 'text-emerald-500' : 'text-secondary'
                    }`}
                    style={!step.done ? { color: undefined } : {}}
                  >
                    {step.title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-secondary/55 leading-relaxed font-medium mb-4">
                    {step.description}
                  </p>

                  {/* Bullet points */}
                  <ul className="space-y-1.5 mb-4 flex-1">
                    {step.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-secondary/60 font-medium">
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                          style={{ background: step.done ? '#10b981' : step.color }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>

                  {/* Footer: XP reward + time estimate */}
                  <div className="flex items-center justify-between pt-3 border-t border-secondary/8">
                    <div className="flex items-center gap-1.5">
                      <Zap size={11} className="text-yellow-500" />
                      <span className="text-[10px] font-black text-yellow-500">+{step.xpReward} XP</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-secondary/30" />
                      <span className="text-[10px] font-bold text-secondary/30">{step.timeEstimate}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Achievements Spotlight - Right */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* XP Level Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 blur-[60px] rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-indigo-950 flex items-center gap-3">
                  <Gem size={20} className="text-indigo-600" />
                  Level {level}
                </h3>
                <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center border-2 border-indigo-500/20">
                  <span className="text-2xl font-black text-indigo-600">{level}</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-[10px] text-indigo-950/40 font-black uppercase tracking-widest">
                  <span>XP to next level</span>
                  <span>{1000 - nextLevelXp} XP needed</span>
                </div>
                <div className="w-full bg-indigo-950/10 rounded-full h-2.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-yellow-400 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[9px] text-indigo-950/60 font-bold">
                  <span>Level {level}</span>
                  <span>Level {level + 1}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex-1 bg-indigo-500/5 rounded-lg p-4 text-center border border-indigo-500/10">
                  <TrendingUp size={18} className="text-indigo-600 mx-auto mb-1" />
                  <p className="text-lg font-black text-indigo-950">{totalXp.toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-indigo-950/40 uppercase tracking-widest mt-0.5">Total XP</p>
                </div>
                <div className="flex-1 bg-indigo-500/5 rounded-lg p-4 text-center border border-indigo-500/10">
                  <Flame size={18} className="text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-black text-indigo-950">{streakDays}</p>
                  <p className="text-[9px] font-bold text-indigo-950/40 uppercase tracking-widest mt-0.5">Day Streak</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Badges */}
          <div className="bg-background-100 border border-secondary/10 rounded-xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-secondary flex items-center gap-3">
                <Award size={20} className="text-indigo-400" />
                Recent Badges
              </h3>
              <button 
                onClick={() => setActiveTab('achievements')}
                className="text-[10px] font-black text-indigo-400 hover:underline uppercase tracking-widest"
              >
                View All
              </button>
            </div>
            
            {allBadges.length === 0 ? (
              <div className="text-center py-8">
                <Trophy size={40} className="text-slate-200 mx-auto mb-4" />
                <p className="text-xs text-secondary/40 font-bold">Complete modules to earn badges</p>
                <button 
                  onClick={() => setActiveTab('achievements')}
                  className="mt-4 px-5 py-2.5 bg-secondary text-background rounded-md text-[10px] font-black hover:opacity-90 transition-all"
                >
                  Explore Achievements
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allBadges.slice(0, 6).map((badge) => (
                  <motion.div
                    key={badge.id}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="p-4 bg-secondary/5 rounded-lg text-center border border-secondary/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer group"
                    onClick={() => setActiveTab('achievements')}
                  >
                    <div className={`w-12 h-12 mx-auto rounded-md flex items-center justify-center mb-3 bg-background border border-secondary/10 shadow-sm text-indigo-400 group-hover:text-emerald-500 transition-colors`}>
                      <BadgeIcon iconName={badge.icon} />
                    </div>
                    <p className="text-[11px] font-black text-secondary leading-tight truncate">{badge.title}</p>
                    <p className="text-[8px] text-secondary/40 font-bold mt-1 uppercase tracking-wider">
                      {new Date(badge.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Badge count */}
            {allBadges.length > 0 && (
              <div className="mt-6 pt-4 border-t border-secondary/10 text-center">
                <span className="text-[10px] font-black text-secondary/40 uppercase tracking-wider">
                  {allBadges.length} Badge{allBadges.length !== 1 ? 's' : ''} Unlocked
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Row 4: Current Progress / Active Course Card */}
      {enrollments.length > 0 && (
        <motion.div variants={itemVariants} className="bg-background-100 border border-secondary/10 rounded-xl p-6 lg:p-10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors hidden sm:block">
            <Clock size={40} />
          </div>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg lg:text-xl font-black text-secondary flex items-center gap-3">
              <PlayCircle size={24} className="text-indigo-400" />
              Current Focus
            </h3>
            <button 
              onClick={() => setActiveTab('courses')}
              className="text-[10px] font-black text-indigo-400 hover:underline uppercase tracking-widest"
            >
              All Courses &rarr;
            </button>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-8 relative z-10">
            <div className="w-full sm:w-32 h-48 sm:h-32 rounded-lg overflow-hidden shrink-0 shadow-xl shadow-slate-200">
              <img src={enrollments[0].course.image} alt={enrollments[0].course.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-center md:text-left w-full">
              <h4 className="text-xl lg:text-2xl font-black text-secondary mb-1 lg:mb-2">{enrollments[0].course.title}</h4>
              <p className="text-xs lg:text-sm text-secondary/60 font-medium mb-4 lg:mb-6 uppercase tracking-widest">Level: {enrollments[0].course.level}</p>
              <div className="w-full bg-secondary/10 rounded-full h-3 mb-2 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${enrollments[0].enrollment.progress_percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black text-secondary/40 uppercase tracking-widest mt-1">
                <span>Progress</span>
                <span>{enrollments[0].enrollment.progress_percentage}%</span>
              </div>
            </div>
            <button 
              onClick={() => onPlayCourse(enrollments[0].course, enrollments[0].enrollment)}
              className="w-full md:w-auto px-8 py-4 lg:py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-3"
            >
              <PlayCircle size={24} />
              Resume
            </button>
          </div>
        </motion.div>
      )}

      {/* Sidebar: Notifications & Mentor - on large screens, inline */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Notifications / Announcements */}
        <div className="bg-background-100 border border-secondary/10 rounded-xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-secondary flex items-center gap-3">
              <Bell size={20} className="text-indigo-400" />
              Latest Hub (Notifications)
            </h3>
          </div>
          <div className="space-y-6 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {notifications.length === 0 ? (
              <p className="text-xs text-secondary/40 font-bold italic">No new notifications</p>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className={`relative pl-6 border-l-2 ${notif.is_read ? 'border-secondary/15 opacity-65' : 'border-indigo-500'} flex items-start justify-between gap-3`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-secondary mb-1 leading-tight">{notif.title}</p>
                    <p className="text-xs text-secondary/60 font-medium leading-relaxed">{notif.message}</p>
                    <span className="text-[9px] text-secondary/30 mt-1 block font-bold">{new Date(notif.created_at).toLocaleString()}</span>
                  </div>
                  {!notif.is_read && (
                    <button 
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-md text-[9px] font-black uppercase tracking-wider transition-all shadow-sm shrink-0"
                    >
                      Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Assigned Mentor */}
        <div className="bg-background-100 border border-secondary/10 rounded-xl p-8 shadow-sm">
          <h3 className="font-black text-secondary mb-8 flex items-center gap-3">
            <User size={20} className="text-indigo-400" />
            Your Expert
          </h3>
          <div className="flex items-center gap-5 mb-8">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center font-black text-indigo-400 text-xl border-2 border-background shadow-sm">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-black text-secondary">Cynex Mentor</p>
              <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Advanced Training Division</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('support')}
            className="w-full py-4 bg-secondary/5 text-secondary border border-secondary/10 rounded-md text-xs font-black hover:bg-secondary/10 transition-all uppercase tracking-widest active:scale-95"
          >
            Contact Mentor
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StudentDashboard;
