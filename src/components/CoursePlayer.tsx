import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, ChevronLeft, 
  ChevronRight, Lock, Clock, 
  FileText, Menu, X, PlayCircle 
} from 'lucide-react';
import { Course, Lesson, Enrollment, updateEnrollmentProgress } from '../lib/turso';

interface CoursePlayerProps {
  course: Course;
  lessons: Lesson[];
  enrollment: Enrollment;
  onClose: () => void;
  onProgressUpdate: (newProgress: number) => void;
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({ 
  course, 
  lessons, 
  enrollment, 
  onClose,
  onProgressUpdate
}) => {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  const currentLesson = lessons[currentLessonIndex];

  useEffect(() => {
    // Estimate completed lessons based on progress_percentage
    const completedCount = Math.floor((enrollment.progress_percentage / 100) * lessons.length);
    const completed = new Set(lessons.slice(0, completedCount).map(l => l.id));
    setCompletedLessons(completed);
    
    // Set current lesson to the first incomplete one
    if (completedCount < lessons.length) {
      setCurrentLessonIndex(completedCount);
    }
  }, [lessons, enrollment.progress_percentage]);

  const handleLessonComplete = async () => {
    if (!currentLesson) return;

    const newCompleted = new Set(completedLessons);
    newCompleted.add(currentLesson.id);
    setCompletedLessons(newCompleted);

    const newProgress = Math.round((newCompleted.size / lessons.length) * 100);
    try {
      await updateEnrollmentProgress(enrollment.id, newProgress);
      onProgressUpdate(newProgress);
      
      if (currentLessonIndex < lessons.length - 1) {
        setCurrentLessonIndex(currentLessonIndex + 1);
      }
    } catch (error) {
      console.error("Failed to update progress", error);
    }
  };

  if (!currentLesson && lessons.length > 0) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white">
        <button onClick={onClose} className="p-2 text-slate-400" title="Close Player">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-sm font-black text-slate-900 truncate px-4 tracking-tight">{course.title}</h2>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-[#41c8df]" title="Toggle Curriculum">
          <Menu size={24} />
        </button>
      </div>

      {/* Main Player Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Desktop Top Bar */}
        <div className="hidden md:flex items-center justify-between p-6 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all" title="Back to Portal">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{course.title}</h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{currentLesson?.module_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <p className="text-sm font-black text-[#41c8df]">{enrollment.progress_percentage}% Protocol Complete</p>
            </div>
            <div className="w-40 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-50">
              <motion.div 
                className="bg-[#41c8df] h-full" 
                initial={{ width: 0 }}
                animate={{ width: `${enrollment.progress_percentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Video Container */}
        <div className="flex-1 bg-slate-900 flex items-center justify-center relative overflow-hidden m-4 md:m-8 rounded-[2rem] shadow-2xl border border-slate-800">
          {lessons.length === 0 ? (
            <div className="text-center p-12">
              <Lock size={48} className="text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">Initializing learning protocol...</p>
            </div>
          ) : (
            <div className="w-full aspect-video max-h-full">
              <iframe 
                src={currentLesson?.video_url || "https://www.youtube.com/embed/dQw4w9WgXcQ"}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={currentLesson?.lesson_title}
              />
            </div>
          )}
        </div>

        {/* Lesson Info & Actions */}
        <div className="px-8 py-10 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-3">
              <div className="inline-block px-3 py-1 bg-[#41c8df]/10 text-[#41c8df] text-[10px] font-black rounded-full uppercase tracking-widest">
                Active Module
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{currentLesson?.lesson_title}</h3>
              <div className="flex items-center gap-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-2"><Clock size={14} className="text-[#41c8df]" /> 15m Duration</span>
                <span className="flex items-center gap-2"><FileText size={14} className="text-[#41c8df]" /> Documentation</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentLessonIndex(Math.max(0, currentLessonIndex - 1))}
                disabled={currentLessonIndex === 0}
                className="p-5 border border-slate-200 rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-20 transition-all shadow-sm"
                title="Previous"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={handleLessonComplete}
                className="px-10 py-5 bg-slate-900 text-white font-black rounded-2xl flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
              >
                Complete Mission <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Lesson List */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed md:relative inset-y-0 right-0 w-full md:w-[400px] bg-white border-l border-slate-200 z-[160] flex flex-col shadow-2xl"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-400">Mission Curriculum</h3>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400" title="Close">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {lessons.map((lesson, idx) => (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setCurrentLessonIndex(idx);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`w-full p-6 rounded-3xl text-left transition-all flex items-start gap-4 border ${
                    idx === currentLessonIndex 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20' 
                      : 'bg-white border-slate-100 hover:border-[#41c8df] hover:shadow-sm'
                  }`}
                >
                  <div className={`mt-1 shrink-0 ${
                    completedLessons.has(lesson.id) 
                      ? 'text-emerald-400' 
                      : (idx === currentLessonIndex ? 'text-[#41c8df]' : 'text-slate-200')
                  }`}>
                    {completedLessons.has(lesson.id) ? <CheckCircle2 size={20} /> : <PlayCircle size={20} />}
                  </div>
                  <div>
                    <p className={`text-sm font-black leading-tight ${idx === currentLessonIndex ? 'text-white' : 'text-slate-900'}`}>
                      {lesson.lesson_title}
                    </p>
                    <p className={`text-[10px] font-bold mt-2 uppercase tracking-tight ${idx === currentLessonIndex ? 'text-slate-400' : 'text-slate-400'}`}>
                      {lesson.module_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Protocol Progress</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#41c8df]" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedLessons.size / lessons.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-900">{completedLessons.size}/{lessons.length}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoursePlayer;
