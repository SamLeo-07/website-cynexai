import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Rocket, CheckCircle2, Clock, 
  ArrowRight, PlayCircle,
  Target, Zap, Bell, User,
  Trophy, Star, Medal, Sparkles,
  TrendingUp, BookOpen, Flame,
  Award, Gem, BarChart3
} from 'lucide-react';
import { Course, Enrollment, OnboardingStep, Badge } from '../lib/turso';

interface StudentDashboardProps {
  studentName: string;
  enrollments: { enrollment: Enrollment; course: Course }[];
  checklist: OnboardingStep[];
  badges: Badge[];
  onUpdateChecklist: (stepId: string, isDone: boolean) => void;
  setActiveTab: (tab: 'dashboard' | 'courses' | 'achievements' | 'finance' | 'support') => void;
  onNavigate: (tab: 'dashboard' | 'courses' | 'achievements' | 'finance' | 'support') => void;
  onPlayCourse: (course: Course, enrollment: Enrollment) => void;
}

const StudentDashboard = ({ 
  studentName, 
  enrollments, 
  checklist,
  badges,
  onUpdateChecklist,
  setActiveTab,
  onNavigate,
  onPlayCourse
}: StudentDashboardProps) => {
  const activeCourses = enrollments.filter(e => e.enrollment.progress_percentage > 0 && e.enrollment.progress_percentage < 100);
  const completedCourses = enrollments.filter(e => e.enrollment.progress_percentage === 100);
  const notStartedCourses = enrollments.filter(e => e.enrollment.progress_percentage === 0);
  
  // XP & Level calculation (mirrors Achievements.tsx logic)
  const { totalXp, level, xpProgress, nextLevelXp } = useMemo(() => {
    let xp = enrollments.length * 100;
    enrollments.forEach(enr => {
      xp += Math.floor((enr.enrollment.progress_percentage || 0) * 10);
    });
    const lvl = Math.floor(xp / 1000) + 1;
    const currentLevelXp = xp % 1000;
    const progressToNext = (currentLevelXp / 1000) * 100;
    return { totalXp: xp, level: lvl, xpProgress: progressToNext, nextLevelXp: currentLevelXp };
  }, [enrollments]);

  // Streak calculation (estimated from completed courses activity)
  const streakDays = useMemo(() => {
    // Simple heuristic: completed courses + active engagement
    const base = completedCourses.length * 3;
    const active = activeCourses.length * 2;
    return Math.min(base + active + 1, 30); // Cap at 30 days
  }, [activeCourses.length, completedCourses.length]);

  const overallProgress = useMemo(() => {
    if (enrollments.length === 0) return 0;
    const total = enrollments.reduce((sum, e) => sum + e.enrollment.progress_percentage, 0);
    return Math.round(total / enrollments.length);
  }, [enrollments]);

  const onboardingSteps = [
    { id: 'profile', title: 'Complete Profile', description: 'Update your contact details and photo.', done: checklist.find(s => s.step_id === 'profile')?.is_done ?? false },
    { id: 'identity', title: 'Identity Verification', description: 'Upload your ID for certification.', done: checklist.find(s => s.step_id === 'identity')?.is_done ?? false },
    { id: 'first_lesson', title: 'First Lesson', description: 'Complete your first course module.', done: enrollments.some(e => e.enrollment.progress_percentage > 0) },
    { id: 'community', title: 'Join Hub', description: 'Access the support hub for networking.', done: checklist.find(s => s.step_id === 'community')?.is_done ?? false },
  ];

  const handleStepAction = (stepId: string) => {
    if (stepId === 'first_lesson') {
      onNavigate('courses');
    } else {
      const isDone = onboardingSteps.find(s => s.id === stepId)?.done ?? false;
      onUpdateChecklist(stepId, !isDone);
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
      className="space-y-10 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Row 1: Welcome Hero + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome Hero - Enhanced */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-gradient-to-br from-[#41c8df]/10 to-emerald-50/50 border border-slate-200 rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#41c8df]/5 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-[#41c8df]/10 transition-all duration-700" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/5 blur-[60px] rounded-full -ml-10 -mb-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-[#41c8df]" size={18} />
              <span className="text-[10px] font-black text-[#41c8df] uppercase tracking-widest bg-[#41c8df]/10 px-3 py-1 rounded-full">
                Level {level} Learner
              </span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-4 tracking-tight">
              Welcome back, <br className="sm:hidden" /> <span className="text-[#41c8df]">{studentName}</span>!
            </h2>
            <p className="text-sm lg:text-base text-slate-600 max-w-md mb-6 leading-relaxed font-medium">
              You are currently mastering <span className="text-slate-900 font-bold">{enrollments.length} skills</span>. 
              Keep up the momentum to reach your certification goals.
            </p>
            
            {/* XP Progress Bar - Inline */}
            <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 max-w-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Zap size={14} className="text-yellow-500" fill="currentColor" />
                  <span>{totalXp.toLocaleString()} / {level * 1000} XP</span>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level {level + 1}</span>
              </div>
              <div className="w-full bg-slate-200/60 rounded-full h-2.5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-[#41c8df] via-emerald-400 to-yellow-400 rounded-full relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                </motion.div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setActiveTab('courses')}
                className="w-full sm:w-auto px-8 lg:px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
              >
                Continue Learning <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => setActiveTab('achievements')}
                className="w-full sm:w-auto px-8 lg:px-10 py-4 bg-white text-slate-900 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm border border-slate-200 active:scale-95"
              >
                <Trophy size={18} className="text-[#41c8df]" />
                View Badges
              </button>
            </div>
          </div>
        </motion.div>

        {/* Training Pulse - Enhanced Stats Card */}
        <motion.div variants={itemVariants} className="bg-white border border-slate-200 rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-8 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 size={18} className="text-[#41c8df]" />
                Training Pulse
              </h3>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-xl text-[10px] font-black text-orange-600">
                <Flame size={12} /> {streakDays}d
              </div>
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#41c8df]/10 rounded-xl flex items-center justify-center">
                    <PlayCircle className="text-[#41c8df]" size={16} />
                  </div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active</span>
                </div>
                <span className="text-xl font-black text-slate-900">{activeCourses.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="text-emerald-600" size={16} />
                  </div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Finished</span>
                </div>
                <span className="text-xl font-black text-emerald-600">{completedCourses.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="text-slate-500" size={16} />
                  </div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Enrolled</span>
                </div>
                <span className="text-xl font-black text-slate-900">{enrollments.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Zap className="text-yellow-600" size={16} />
                  </div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total XP</span>
                </div>
                <span className="text-xl font-black text-yellow-600">{totalXp.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          {/* Overall Certification Progress */}
          <div className="pt-6 mt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Progress</span>
              <span className="text-xs font-black text-[#41c8df]">{overallProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-[#41c8df] to-emerald-400 relative"
              >
                <div className="absolute inset-0 bg-white/10 animate-pulse rounded-full" />
              </motion.div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 text-center">Certification Path</p>
          </div>
        </motion.div>
      </div>

      {/* Row 2: All Courses Progress Overview */}
      {enrollments.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <BarChart3 className="text-[#41c8df]" size={28} />
              Course Progress
            </h3>
            <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
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
                  className={`bg-white border rounded-[2rem] p-6 transition-all group hover:shadow-lg ${
                    isComplete 
                      ? 'border-emerald-200 bg-emerald-50/30' 
                      : isNotStarted 
                        ? 'border-slate-200 hover:border-[#41c8df]' 
                        : 'border-slate-200 hover:border-[#41c8df]'
                  }`}
                >
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-md shadow-slate-200/50">
                      <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">{course.title}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isComplete ? 'bg-emerald-100 text-emerald-700' : 
                          isNotStarted ? 'bg-slate-100 text-slate-500' : 
                          'bg-[#41c8df]/10 text-[#41c8df]'
                        }`}>
                          {isComplete ? 'Completed' : isNotStarted ? 'Not Started' : 'In Progress'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{course.level}</span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Progress Bar with Milestones */}
                  <div className="relative mb-2">
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                        className={`h-full rounded-full relative ${
                          isComplete 
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                            : 'bg-gradient-to-r from-[#41c8df] to-emerald-400'
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
                              : 'bg-slate-200 border-slate-200'
                          }`} />
                          <span className={`text-[7px] font-black mt-0.5 ${
                            progress >= m ? 'text-emerald-500' : 'text-slate-300'
                          }`}>{m}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm font-black text-slate-900">{progress}%</span>
                    <button 
                      onClick={() => onPlayCourse(course, enrollment)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all active:scale-95 ${
                        isComplete
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : isNotStarted
                            ? 'bg-[#41c8df] text-black hover:bg-[#38b2c7] shadow-md shadow-[#41c8df]/20'
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/10'
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Onboarding Checklist - Left (col-span-2) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Rocket className="text-[#41c8df]" size={28} />
              Quick Start
            </h3>
            <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
              {onboardingSteps.filter(s => s.done).length}/{onboardingSteps.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {onboardingSteps.map((step) => (
              <div 
                key={step.id}
                className={`p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border transition-all text-left group/step ${
                  step.done 
                    ? 'bg-emerald-50 border-emerald-100' 
                    : 'bg-white border-slate-200 hover:border-[#41c8df] shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center transition-all ${
                    step.done ? 'bg-white text-emerald-500 shadow-sm' : 'bg-slate-50 text-slate-300 group-hover/step:bg-[#41c8df]/10 group-hover/step:text-[#41c8df]'
                  }`}>
                    {step.done ? <CheckCircle2 size={20} /> : <Target size={20} />}
                  </div>
                  <button 
                    onClick={() => handleStepAction(step.id)}
                    className={`px-4 lg:px-6 py-2 rounded-xl text-[10px] lg:text-xs font-black transition-all ${
                      step.done 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {step.done ? 'COMPLETED' : 'ACTION'}
                  </button>
                </div>
                <h4 className={`font-black text-base lg:text-lg mb-2 transition-colors ${step.done ? 'text-emerald-700' : 'text-slate-900 group-hover/step:text-[#41c8df]'}`}>{step.title}</h4>
                <p className="text-xs lg:text-sm text-slate-500 leading-relaxed font-medium">{step.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Achievements Spotlight - Right */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* XP Level Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[3rem] p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#41c8df]/10 blur-[60px] rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-white flex items-center gap-3">
                  <Gem size={20} className="text-[#41c8df]" />
                  Level {level}
                </h3>
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center border-2 border-[#41c8df]/30">
                  <span className="text-2xl font-black text-[#41c8df]">{level}</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  <span>XP to next level</span>
                  <span>{1000 - nextLevelXp} XP needed</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-[#41c8df] via-emerald-400 to-yellow-400 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                  <span>Level {level}</span>
                  <span>Level {level + 1}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex-1 bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                  <TrendingUp size={18} className="text-[#41c8df] mx-auto mb-1" />
                  <p className="text-lg font-black text-white">{totalXp.toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total XP</p>
                </div>
                <div className="flex-1 bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                  <Flame size={18} className="text-orange-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-white">{streakDays}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Day Streak</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Badges */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-900 flex items-center gap-3">
                <Award size={20} className="text-[#41c8df]" />
                Recent Badges
              </h3>
              <button 
                onClick={() => setActiveTab('achievements')}
                className="text-[10px] font-black text-[#41c8df] hover:underline uppercase tracking-widest"
              >
                View All
              </button>
            </div>
            
            {badges.length === 0 ? (
              <div className="text-center py-8">
                <Trophy size={40} className="text-slate-200 mx-auto mb-4" />
                <p className="text-xs text-slate-400 font-bold">Complete modules to earn badges</p>
                <button 
                  onClick={() => setActiveTab('achievements')}
                  className="mt-4 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all"
                >
                  Explore Achievements
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {badges.slice(0, 6).map((badge) => (
                  <motion.div
                    key={badge.id}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="p-4 bg-slate-50 rounded-2xl text-center border border-slate-100 hover:border-[#41c8df] hover:bg-[#41c8df]/5 transition-all cursor-pointer group"
                    onClick={() => setActiveTab('achievements')}
                  >
                    <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 bg-white border border-slate-200 shadow-sm text-[#41c8df] group-hover:text-emerald-500 transition-colors`}>
                      <BadgeIcon iconName={badge.icon} />
                    </div>
                    <p className="text-[11px] font-black text-slate-900 leading-tight truncate">{badge.title}</p>
                    <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                      {new Date(badge.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Badge count */}
            {badges.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {badges.length} Badge{badges.length !== 1 ? 's' : ''} Unlocked
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Row 4: Current Progress / Active Course Card */}
      {enrollments.length > 0 && (
        <motion.div variants={itemVariants} className="bg-white border border-slate-200 rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-slate-100 group-hover:text-slate-200 transition-colors hidden sm:block">
            <Clock size={40} />
          </div>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg lg:text-xl font-black text-slate-900 flex items-center gap-3">
              <PlayCircle size={24} className="text-[#41c8df]" />
              Current Focus
            </h3>
            <button 
              onClick={() => setActiveTab('courses')}
              className="text-[10px] font-black text-[#41c8df] hover:underline uppercase tracking-widest"
            >
              All Courses &rarr;
            </button>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-8 relative z-10">
            <div className="w-full sm:w-32 h-48 sm:h-32 rounded-2xl lg:rounded-3xl overflow-hidden shrink-0 shadow-xl shadow-slate-200">
              <img src={enrollments[0].course.image} alt={enrollments[0].course.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-center md:text-left w-full">
              <h4 className="text-xl lg:text-2xl font-black text-slate-900 mb-1 lg:mb-2">{enrollments[0].course.title}</h4>
              <p className="text-xs lg:text-sm text-slate-500 font-medium mb-4 lg:mb-6 uppercase tracking-widest">Level: {enrollments[0].course.level}</p>
              <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#41c8df] to-emerald-400 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${enrollments[0].enrollment.progress_percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                <span>Progress</span>
                <span>{enrollments[0].enrollment.progress_percentage}%</span>
              </div>
            </div>
            <button 
              onClick={() => onPlayCourse(enrollments[0].course, enrollments[0].enrollment)}
              className="w-full md:w-auto px-8 py-4 lg:py-5 bg-slate-900 text-white font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3"
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
        <div className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-900 flex items-center gap-3">
              <Bell size={20} className="text-[#41c8df]" />
              Latest Hub
            </h3>
          </div>
          <div className="space-y-8">
            <div className="relative pl-6 border-l-2 border-[#41c8df]">
              <p className="text-sm font-black text-slate-900 mb-1">Weekly AI Briefing</p>
              <p className="text-xs text-slate-500 font-medium">New resources added to module 4</p>
            </div>
            <div className="relative pl-6 border-l-2 border-slate-100">
              <p className="text-sm font-black text-slate-900 mb-1">Certification Drive</p>
              <p className="text-xs text-slate-500 font-medium">Exam slots opening next Monday</p>
            </div>
            <div className="relative pl-6 border-l-2 border-slate-100">
              <p className="text-sm font-black text-slate-900 mb-1">Community Meetup</p>
              <p className="text-xs text-slate-500 font-medium">Virtual networking session this Friday</p>
            </div>
          </div>
        </div>

        {/* Assigned Mentor */}
        <div className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm">
          <h3 className="font-black text-slate-900 mb-8 flex items-center gap-3">
            <User size={20} className="text-[#41c8df]" />
            Your Expert
          </h3>
          <div className="flex items-center gap-5 mb-8">
            <div className="w-16 h-16 rounded-full bg-[#41c8df]/10 flex items-center justify-center font-black text-[#41c8df] text-xl border-2 border-white shadow-sm">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-black text-slate-900">Cynex Mentor</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Advanced Training Division</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('support')}
            className="w-full py-4 bg-slate-50 text-slate-900 border border-slate-100 rounded-2xl text-xs font-black hover:bg-slate-100 transition-all uppercase tracking-widest active:scale-95"
          >
            Contact Mentor
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StudentDashboard;
