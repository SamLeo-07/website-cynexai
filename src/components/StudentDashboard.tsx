import { motion } from 'framer-motion';
import { 
  Rocket, CheckCircle2, Clock, 
  ArrowRight, PlayCircle,
  Target, Zap, Bell, User 
} from 'lucide-react';
import { Course, Enrollment, OnboardingStep } from '../lib/turso';

interface StudentDashboardProps {
  studentName: string;
  enrollments: { enrollment: Enrollment; course: Course }[];
  checklist: OnboardingStep[];
  onUpdateChecklist: (stepId: string, isDone: boolean) => void;
  setActiveTab: (tab: 'dashboard' | 'courses' | 'achievements' | 'finance' | 'support') => void;
  onNavigate: (tab: 'dashboard' | 'courses' | 'achievements' | 'finance' | 'support' | 'explore') => void;
  onPlayCourse: (course: Course, enrollment: Enrollment) => void;
}

const StudentDashboard = ({ 
  studentName, 
  enrollments, 
  checklist,
  onUpdateChecklist,
  setActiveTab,
  onNavigate,
  onPlayCourse
}: StudentDashboardProps) => {
  const activeCourses = enrollments.filter(e => e.enrollment.progress_percentage > 0 && e.enrollment.progress_percentage < 100);
  const completedCourses = enrollments.filter(e => e.enrollment.progress_percentage === 100);
  
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

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-[#41c8df]/10 to-emerald-50/50 border border-slate-200 rounded-[3rem] p-10 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#41c8df]/5 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-[#41c8df]/10 transition-all duration-700" />
          <div className="relative z-10">
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
              Welcome back, <span className="text-[#41c8df]">{studentName}</span>!
            </h2>
            <p className="text-slate-600 max-w-md mb-8 leading-relaxed font-medium">
              You are currently mastering <span className="text-slate-900 font-bold">{enrollments.length} skills</span>. 
              Keep up the momentum to reach your certification goals.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setActiveTab('courses')}
                className="px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
              >
                Continue Learning <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[3rem] p-8 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-slate-900">Training Pulse</h3>
              <Zap className="text-[#41c8df]" size={20} />
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-bold uppercase tracking-wider text-[10px]">Active</span>
                <span className="text-xl font-black text-slate-900">{activeCourses.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-bold uppercase tracking-wider text-[10px]">Finished</span>
                <span className="text-xl font-black text-emerald-600">{completedCourses.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-bold uppercase tracking-wider text-[10px]">Target</span>
                <span className="text-sm font-black text-[#41c8df]">AI ARCHITECT</span>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                className="h-full bg-gradient-to-r from-[#41c8df] to-emerald-400"
              />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 text-center">Certification: 65%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Onboarding Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Rocket className="text-[#41c8df]" size={28} />
              Quick Start
            </h3>
            <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
              {onboardingSteps.filter(s => s.done).length}/{onboardingSteps.length} TASK DONE
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {onboardingSteps.map((step) => (
              <div 
                key={step.id}
                className={`p-8 rounded-[2.5rem] border transition-all text-left group/step ${
                  step.done 
                    ? 'bg-emerald-50 border-emerald-100' 
                    : 'bg-white border-slate-200 hover:border-[#41c8df] shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    step.done ? 'bg-white text-emerald-500 shadow-sm' : 'bg-slate-50 text-slate-300 group-hover/step:bg-[#41c8df]/10 group-hover/step:text-[#41c8df]'
                  }`}>
                    {step.done ? <CheckCircle2 size={24} /> : <Target size={24} />}
                  </div>
                  <button 
                    onClick={() => handleStepAction(step.id)}
                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                      step.done 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {step.done ? 'COMPLETED' : 'ACTION'}
                  </button>
                </div>
                <h4 className={`font-black text-lg mb-2 transition-colors ${step.done ? 'text-emerald-700' : 'text-slate-900 group-hover/step:text-[#41c8df]'}`}>{step.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{step.description}</p>
              </div>
            ))}
          </div>

          {/* Recent Course Card */}
          {enrollments.length > 0 && (
            <div className="mt-12 bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 text-slate-100 group-hover:text-slate-200 transition-colors">
                <Clock size={40} />
              </div>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900">Current Progress</h3>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                <div className="w-32 h-32 rounded-3xl overflow-hidden shrink-0 shadow-xl shadow-slate-200">
                  <img src={enrollments[0].course.image} alt={enrollments[0].course.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-2xl font-black text-slate-900 mb-2">{enrollments[0].course.title}</h4>
                  <p className="text-slate-500 font-medium mb-6">Level: {enrollments[0].course.level}</p>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                    <motion.div 
                      className="bg-[#41c8df] h-full" 
                      initial={{ width: 0 }}
                      animate={{ width: `${enrollments[0].enrollment.progress_percentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <button 
                  onClick={() => onPlayCourse(enrollments[0].course, enrollments[0].enrollment)}
                  className="px-8 py-5 bg-slate-900 text-white font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10 flex items-center gap-3"
                >
                  <PlayCircle size={24} />
                  Resume
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Items */}
        <div className="space-y-8">
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
            </div>
          </div>

          {/* Assigned Mentor */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm">
            <h3 className="font-black text-slate-900 mb-8 flex items-center gap-3">
              <User size={20} className="text-[#41c8df]" />
              Your Expert
            </h3>
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center font-black text-[#41c8df] text-xl border-2 border-white shadow-sm">
                CY
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">Cynex Mentor</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Advanced Training Division</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('support')}
              className="w-full py-4 bg-slate-50 text-slate-900 border border-slate-100 rounded-2xl text-xs font-black hover:bg-slate-100 transition-all uppercase tracking-widest"
            >
              Contact Mentor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
