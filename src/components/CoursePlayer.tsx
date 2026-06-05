import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, ChevronLeft, 
  ChevronRight, Lock, Clock, 
  FileText, Menu, X, PlayCircle,
  Download, Code, Link2, BookOpen, Bookmark, Play, AlertCircle, Award, Check, Sparkles
} from 'lucide-react';
import { 
  Course, Lesson, Enrollment, updateEnrollmentProgress,
  getLessonResources, getActiveAttendanceSession, checkInAttendance,
  getStudentLessonProgress, updateStudentLessonProgress, logAnalyticsEvent,
  LessonResource, LessonAttendanceSession, StudentLessonProgress,
  StudentNote, getStudentNotes, createStudentNote, deleteStudentNote,
  AILessonContent, getAILessonContent, createAILessonContent
} from '../lib/turso';
import { generateLessonSummaryAndChapters } from '../lib/gemini';

interface CoursePlayerProps {
  course: Course;
  lessons: Lesson[];
  enrollment: Enrollment;
  studentName: string;
  onClose: () => void;
  onProgressUpdate: (newProgress: number) => void;
}



const CoursePlayer: React.FC<CoursePlayerProps> = ({ 
  course, 
  lessons, 
  enrollment,
  studentName, 
  onClose,
  onProgressUpdate
}) => {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  // Custom interactive features state
  const [activeTab, setActiveTab] = useState<'resources' | 'sandbox' | 'downloads' | 'notes' | 'ai_summary'>('resources');
  
  // AI summary
  const [aiContent, setAiContent] = useState<AILessonContent | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [activeSession, setActiveSession] = useState<LessonAttendanceSession | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);
  
  // Video Resume & Progress Tracking
  const [savedProgress, setSavedProgress] = useState<StudentLessonProgress | null>(null);
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  
  // Timestamped Notes
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  
  // Inline Quiz State
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  const currentLesson = lessons[currentLessonIndex];
  
  // YT Player Ref and script tracking
  const playerRef = useRef<any>(null);
  const playTimeIntervalRef = useRef<any>(null);
  const ytApiLoadedRef = useRef<boolean>(false);

  // Parse YouTube video ID
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = currentLesson ? getYouTubeId(currentLesson.video_url || '') : null;

  // 1. Initial configuration & load completion list
  useEffect(() => {
    const completedCount = Math.floor((enrollment.progress_percentage / 100) * lessons.length);
    const completed = new Set(lessons.slice(0, completedCount).map(l => l.id));
    setCompletedLessons(completed);
    
    if (completedCount < lessons.length) {
      setCurrentLessonIndex(completedCount);
    }
  }, [lessons, enrollment.progress_percentage]);

  // 2. Fetch resources, attendance session, progress and notes when current lesson changes
  useEffect(() => {
    if (!currentLesson) return;
    setIsCheckedIn(false);
    setPinCode('');
    setPinError(null);
    setPinSuccess(false);
    setQuizAnswered(false);
    setShowQuiz(false);
    setQuizAnswers({});
    setQuizScore(null);
    setQuizError(null);
    setShowResumeOverlay(false);
    setResumeTime(null);

    // Fetch resources vault items
    const fetchLessonResourcesData = async () => {
      try {
        const res = await getLessonResources(currentLesson.id);
        setResources(res);
      } catch (e) {
        console.error("Failed to load resources vault", e);
      }
    };

    // Fetch active live attendance session
    const fetchAttendanceSessionData = async () => {
      try {
        const sess = await getActiveAttendanceSession(currentLesson.id);
        if (sess && sess.is_active === 1) {
          setActiveSession(sess);
        } else {
          setActiveSession(null);
        }
      } catch (e) {
        console.error("Failed to load active attendance session", e);
      }
    };

    // Fetch student progress for resume
    const fetchStudentLessonProgressData = async () => {
      try {
        const progress = await getStudentLessonProgress(enrollment.student_id, currentLesson.id);
        if (progress) {
          setSavedProgress(progress);
          if (progress.last_watched_timestamp > 5) {
            setResumeTime(progress.last_watched_timestamp);
            setShowResumeOverlay(true);
          }
          if (progress.quiz_score >= 70) {
            setQuizAnswered(true);
          }
        } else {
          setSavedProgress(null);
        }
      } catch (e) {
        console.error("Failed to load student progress", e);
      }
    };

    // Load notes from Turso for this student & lesson
    const loadNotes = async () => {
      try {
        const studentNotes = await getStudentNotes(enrollment.student_id, currentLesson.id);
        setNotes(studentNotes);
      } catch (e) {
        console.error("Failed to load notes", e);
        setNotes([]);
      }
    };

    // Load AI Content
    const loadAIContent = async () => {
      try {
        const content = await getAILessonContent(currentLesson.id);
        setAiContent(content);
      } catch (e) {
        console.error("Failed to load AI content", e);
        setAiContent(null);
      }
    };

    fetchLessonResourcesData();
    fetchAttendanceSessionData();
    fetchStudentLessonProgressData();
    loadNotes();
    loadAIContent();
    
    // Log analytical start event
    logAnalyticsEvent(enrollment.student_id, 'LESSON_STARTED', currentLesson.id);
  }, [currentLessonIndex, currentLesson, enrollment.student_id]);

  // 3. YouTube Player API loading & initializing
  useEffect(() => {
    if (!videoId) return;

    const setupPlayer = () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
      }

      playerRef.current = new (window as any).YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          showinfo: 0,
          controls: 1
        },
        events: {
          onReady: (event: any) => {
            // Player is ready
          },
          onStateChange: (event: any) => {
            // Can listen to video playing states
          }
        }
      });

      // Periodic progress tracking and quiz trigger every 5 seconds
      if (playTimeIntervalRef.current) clearInterval(playTimeIntervalRef.current);
      playTimeIntervalRef.current = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          if (duration > 0) {
            const pct = (currentTime / duration) * 100;
            savePlaybackProgress(currentTime, pct);

            // Trigger quiz halfway through
            if (currentTime >= (duration / 2) && !quizAnswered && !showQuiz) {
              playerRef.current.pauseVideo();
              setShowQuiz(true);
            }
          }
        }
      }, 5000);
    };

    // Load YouTube iframe script if not present
    if (!(window as any).YT) {
      if (!ytApiLoadedRef.current) {
        ytApiLoadedRef.current = true;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
      (window as any).onYouTubeIframeAPIReady = () => {
        setupPlayer();
      };
    } else {
      setupPlayer();
    }

    return () => {
      if (playTimeIntervalRef.current) clearInterval(playTimeIntervalRef.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // Save progress helper
  const savePlaybackProgress = async (timestamp: number, percentage: number) => {
    try {
      const payload: StudentLessonProgress = {
        id: savedProgress?.id || `progress_${enrollment.student_id}_${currentLesson.id}`,
        student_id: enrollment.student_id,
        lesson_id: currentLesson.id,
        watch_percentage: Math.max(savedProgress?.watch_percentage || 0, Math.round(percentage)),
        quiz_score: savedProgress?.quiz_score || 0,
        completed: (savedProgress?.completed || (percentage >= 90 ? 1 : 0)) ? 1 : 0,
        last_watched_timestamp: Math.round(timestamp)
      };
      await updateStudentLessonProgress(payload);
      setSavedProgress(payload);
    } catch (e) {
      console.error("Failed to save progress", e);
    }
  };

  // Resume playback handler
  const handleResumePlayback = (shouldResume: boolean) => {
    setShowResumeOverlay(false);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      if (shouldResume && resumeTime) {
        // Seek to 5 seconds before they left off to re-orient
        const seek = Math.max(0, resumeTime - 5);
        playerRef.current.seekTo(seek, true);
        playerRef.current.playVideo();
        logAnalyticsEvent(enrollment.student_id, 'VIDEO_REPLAYED', currentLesson.id, { seek_timestamp: seek });
      } else {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
      }
    }
  };

  // MCQ quiz configuration based on lesson
  const mockQuizQuestions = [
    {
      question: "What is the best practice to avoid passive learning and build dynamic memory during this bootcamp?",
      options: [
        "Read notes and memorize definitions without writing code.",
        "Take active timestamped notes, attempt micro-quizzes, and immediately practice in the Sandbox Vault.",
        "Wait until the end of the semester to write your first program.",
        "Watch all lectures in 2x speed without stopping."
      ],
      correct: 1
    },
    {
      question: "To verify your live attendance session successfully, what protocol must be fulfilled?",
      options: [
        "Submit a course completion certificate at the end.",
        "Input the active 4-digit session passcode check-in PIN shared by the instructor.",
        "Email the support desk directly with your login details.",
        "Wait for the system to automatically mark you present without doing anything."
      ],
      correct: 1
    }
  ];

  // Submit MCQ Answers
  const handleQuizSubmit = async () => {
    let scoreCount = 0;
    mockQuizQuestions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) scoreCount++;
    });
    const finalScore = Math.round((scoreCount / mockQuizQuestions.length) * 100);
    setQuizScore(finalScore);

    if (finalScore >= 70) {
      setQuizAnswered(true);
      setQuizError(null);
      
      // Update score in progress database
      try {
        const payload: StudentLessonProgress = {
          id: savedProgress?.id || `progress_${enrollment.student_id}_${currentLesson.id}`,
          student_id: enrollment.student_id,
          lesson_id: currentLesson.id,
          watch_percentage: savedProgress?.watch_percentage || 50,
          quiz_score: finalScore,
          completed: 1, // Auto-mark lesson as complete since they passed quiz
          last_watched_timestamp: savedProgress?.last_watched_timestamp || 0
        };
        await updateStudentLessonProgress(payload);
        setSavedProgress(payload);
        
        // Log analytical success
        logAnalyticsEvent(enrollment.student_id, 'LESSON_COMPLETED', currentLesson.id, { score: finalScore });
      } catch (e) {
        console.error(e);
      }

      // Hide quiz overlay and resume playback
      setTimeout(() => {
        setShowQuiz(false);
        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
      }, 2000);
    } else {
      setQuizError("Quiz Score failed! Please score at least 70% (2/2 correct) to continue this lesson.");
      logAnalyticsEvent(enrollment.student_id, 'QUIZ_FAILED', currentLesson.id, { score: finalScore });
    }
  };

  // Save Bookmark Note
  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;

    let time = 0;
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      time = Math.round(playerRef.current.getCurrentTime());
    }

    const newNote: StudentNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      student_id: enrollment.student_id,
      lesson_id: currentLesson.id,
      timestamp: time,
      note_text: newNoteText.trim(),
      created_at: new Date().toISOString()
    };

    const updatedNotes = [...notes, newNote].sort((a, b) => a.timestamp - b.timestamp);
    setNotes(updatedNotes);
    setNewNoteText('');
    
    try {
      await createStudentNote(newNote);
    } catch (e) {
      console.error("Failed to save note to DB", e);
    }
  };

  const handleSeekToNote = (time: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(time, true);
      playerRef.current.playVideo();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // PIN Attendance Verification Check-in
  const handlePinCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !pinCode.trim()) return;
    setPinError(null);
    setPinSuccess(false);

    try {
      const check = await checkInAttendance(enrollment.student_id, activeSession.id, pinCode.trim());
      if (check.success) {
        setIsCheckedIn(true);
        setPinSuccess(true);
        logAnalyticsEvent(enrollment.student_id, 'PIN_VERIFIED', currentLesson.id, { session_id: activeSession.id });
      } else {
        setPinError(check.error || "Incorrect Passcode PIN code. Please check with your instructor.");
      }
    } catch (err) {
      setPinError("Database check-in failed.");
    }
  };

  const handleLessonComplete = async () => {
    if (!currentLesson) return;

    const newCompleted = new Set(completedLessons);
    newCompleted.add(currentLesson.id);
    setCompletedLessons(newCompleted);

    const newProgress = Math.round((newCompleted.size / lessons.length) * 100);
    try {
      // Save progress object fully
      const payload: StudentLessonProgress = {
        id: savedProgress?.id || `progress_${enrollment.student_id}_${currentLesson.id}`,
        student_id: enrollment.student_id,
        lesson_id: currentLesson.id,
        watch_percentage: 100,
        quiz_score: savedProgress?.quiz_score || 100,
        completed: 1
      };
      await updateStudentLessonProgress(payload);
      
      await updateEnrollmentProgress(enrollment.id, newProgress);
      onProgressUpdate(newProgress);
      
      if (currentLessonIndex < lessons.length - 1) {
        setCurrentLessonIndex(currentLessonIndex + 1);
      } else {
        alert("Congratulations! You have completed all lessons in this curriculum blueprint.");
      }
    } catch (error) {
      console.error("Failed to update progress", error);
    }
  };

  // Check if current lesson is locked by a prerequisite lesson
  const currentPrereqId = currentLesson?.prerequisite_lesson_id;
  const isLessonLocked = currentPrereqId && !completedLessons.has(currentPrereqId);
  const prereqTitle = currentPrereqId 
    ? lessons.find(l => l.id === currentPrereqId)?.lesson_title 
    : '';

  if (!currentLesson && lessons.length > 0) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-3 border-b border-slate-200 bg-white sticky top-0 z-[170]">
        <button onClick={onClose} className="p-2 text-slate-400" title="Close Player">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xs font-black text-slate-900 truncate px-2 tracking-tight flex-1 text-center">{course.title}</h2>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-[#41c8df]" title="Toggle Curriculum">
          <Menu size={24} />
        </button>
      </div>

      {/* Main Player Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
        {/* Desktop Top Bar */}
        <div className="hidden md:flex items-center justify-between p-6 border-b border-slate-200 bg-white/80 backdrop-blur-xl shrink-0">
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

        {/* Video Player Section with locks & quizzes */}
        <div className="flex-1 min-h-[400px] bg-slate-900 flex items-center justify-center relative overflow-hidden m-4 md:m-8 rounded-[2rem] shadow-2xl border border-slate-800">
          {isLessonLocked ? (
            /* Prerequisite Locking Warning Screen */
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-8 z-40 backdrop-blur-sm">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-500 mb-4 animate-bounce">
                <Lock size={32} />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">Lesson Locked</h3>
              <p className="text-sm text-slate-400 max-w-md mt-2 leading-relaxed">
                Complete the prerequisite lesson <span className="text-[#41c8df] font-bold">"{prereqTitle}"</span> first to unlock this next section of the blueprint.
              </p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center p-12">
              <Lock size={48} className="text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">Initializing learning protocol...</p>
            </div>
          ) : (
            <div className="w-full h-full relative flex flex-col justify-between">
              {/* Playback Container */}
              <div id="youtube-player" className="w-full h-full border-0 flex-1" />

              {/* YouTube video API fallback placeholder (if not loaded or simple mp4/no id) */}
              {!videoId && currentLesson?.video_url && (
                <iframe 
                  src={`${currentLesson.video_url}?rel=0&modestbranding=1&showinfo=0`}
                  className="w-full h-full border-0 flex-1"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={currentLesson?.lesson_title}
                />
              )}

              {/* Video Playback Resume Overlay */}
              {showResumeOverlay && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 z-40 backdrop-blur-xs">
                  <PlayCircle className="w-12 h-12 text-[#41c8df] mb-3" />
                  <h4 className="text-md font-bold text-white uppercase tracking-wider">Resume from last checkpoint?</h4>
                  <p className="text-xs text-slate-400 mt-1">You previously watched up to {formatTime(resumeTime || 0)}</p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleResumePlayback(true)}
                      className="px-6 py-2.5 bg-[#41c8df] hover:bg-[#41c8df]/90 text-black text-xs font-black uppercase rounded-lg transition-all"
                    >
                      Resume Playback
                    </button>
                    <button
                      onClick={() => handleResumePlayback(false)}
                      className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase rounded-lg border border-slate-700 transition-all"
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              )}

              {/* Inline Quiz Question Sheet */}
              {showQuiz && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-50 overflow-y-auto">
                  <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-widest border-b border-slate-800 pb-3">
                      <Award size={16} />
                      Active Recall Micro-Quiz Check
                    </div>
                    <p className="text-xs text-slate-400">
                      Answer these questions correctly to verify conceptual understanding and continue playback.
                    </p>

                    {quizError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold">
                        {quizError}
                      </div>
                    )}

                    <div className="space-y-4">
                      {mockQuizQuestions.map((q, idx) => (
                        <div key={idx} className="space-y-2">
                          <p className="text-xs font-bold text-slate-200">
                            {idx + 1}. {q.question}
                          </p>
                          <div className="space-y-1.5 pl-2">
                            {q.options.map((opt, oIdx) => (
                              <button
                                key={oIdx}
                                onClick={() => setQuizAnswers({ ...quizAnswers, [idx]: oIdx })}
                                className={`w-full text-left p-2.5 rounded-lg text-[11px] font-medium border transition-all ${
                                  quizAnswers[idx] === oIdx
                                    ? 'bg-[#41c8df]/15 border-[#41c8df] text-[#41c8df]'
                                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                      <button
                        onClick={handleQuizSubmit}
                        className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-black font-black uppercase text-xs rounded-lg transition-all"
                      >
                        Submit Answers
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Attendance Passcode Widget (Inline Card) */}
        {activeSession && !isLessonLocked && (
          <div className="mx-4 md:mx-8 mb-4">
            <div className="bg-gradient-to-r from-[#41c8df]/10 to-indigo-500/10 border border-[#41c8df]/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black bg-[#41c8df] text-black px-2 py-0.5 rounded uppercase tracking-wider">Required Check-In</span>
                <h4 className="text-sm font-bold text-slate-900 mt-1">Live PIN Attendance Session Active</h4>
                <p className="text-xs text-slate-500">Input the 4-digit passcode session code shared by your instructor to check in.</p>
              </div>

              {pinSuccess || isCheckedIn ? (
                <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-wider bg-green-500/10 px-3 py-2 rounded-xl border border-green-500/20">
                  <Check size={16} /> Attendance Checked In
                </div>
              ) : (
                <form onSubmit={handlePinCheckIn} className="flex gap-2 items-center">
                  <input
                    type="text"
                    maxLength={4}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="PIN Code"
                    className="w-24 px-3 py-2 border border-slate-200 focus:border-[#41c8df] outline-none rounded-lg text-center font-mono tracking-widest text-slate-800 text-xs font-bold"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase rounded-lg transition-colors"
                  >
                    Verify
                  </button>
                </form>
              )}

              {pinError && (
                <div className="text-xs text-red-500 font-semibold pl-2">{pinError}</div>
              )}
            </div>
          </div>
        )}

        {/* Resource Vault Tabs & Bookmarks section */}
        <div className="mx-4 md:mx-8 mb-8 border border-slate-200 bg-white rounded-3xl overflow-hidden shadow-sm">
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto gap-4 px-6 pt-4 shrink-0">
            {[
              { id: 'resources', label: 'Study Resources', icon: FileText },
              { id: 'sandbox', label: 'Coding Sandbox', icon: Code },
              { id: 'downloads', label: 'Exercise Vault', icon: Download },
              { id: 'notes', label: 'My Bookmarks', icon: Bookmark },
              { id: 'ai_summary', label: 'AI Summary', icon: Sparkles }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 font-black text-xs uppercase tracking-wider transition-colors border-b-2 -mb-[2px] flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-[#41c8df] text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'resources' && (
              <div className="space-y-3">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">Lecture Notes & Documents</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resources.filter(r => ['slides', 'pdf', 'notion', 'external_link'].includes(r.resource_type)).length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No resources attached to this lesson.</p>
                  ) : (
                    resources
                      .filter(r => ['slides', 'pdf', 'notion', 'external_link'].includes(r.resource_type))
                      .map(res => (
                        <a
                          key={res.id}
                          href={res.resource_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => logAnalyticsEvent(enrollment.student_id, 'RESOURCE_DOWNLOADED', currentLesson.id, { title: res.title, type: res.resource_type })}
                          className="p-3 border border-slate-200 hover:border-[#41c8df]/50 hover:bg-[#41c8df]/5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-slate-400 group-hover:text-[#41c8df]" />
                            <span className="font-bold text-slate-700">{res.title}</span>
                          </div>
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {res.resource_type}
                          </span>
                        </a>
                      ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'sandbox' && (
              <div className="space-y-3">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">Interactive Practice Repositories</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resources.filter(r => ['github', 'sandbox'].includes(r.resource_type)).length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No coding environments linked to this lesson.</p>
                  ) : (
                    resources
                      .filter(r => ['github', 'sandbox'].includes(r.resource_type))
                      .map(res => (
                        <a
                          key={res.id}
                          href={res.resource_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => logAnalyticsEvent(enrollment.student_id, 'RESOURCE_DOWNLOADED', currentLesson.id, { title: res.title, type: res.resource_type })}
                          className="p-3 border border-slate-200 hover:border-[#41c8df]/50 hover:bg-[#41c8df]/5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <Code size={16} className="text-slate-400 group-hover:text-[#41c8df]" />
                            <span className="font-bold text-slate-700">{res.title}</span>
                          </div>
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {res.resource_type}
                          </span>
                        </a>
                      ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'downloads' && (
              <div className="space-y-3">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">Exercise Download Bundles</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resources.filter(r => ['zip'].includes(r.resource_type)).length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No exercise files uploaded to download.</p>
                  ) : (
                    resources
                      .filter(r => ['zip'].includes(r.resource_type))
                      .map(res => (
                        <a
                          key={res.id}
                          href={res.resource_url}
                          download
                          onClick={() => logAnalyticsEvent(enrollment.student_id, 'RESOURCE_DOWNLOADED', currentLesson.id, { title: res.title, type: res.resource_type })}
                          className="p-3 border border-slate-200 hover:border-[#41c8df]/50 hover:bg-[#41c8df]/5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <Download size={16} className="text-slate-400 group-hover:text-[#41c8df]" />
                            <span className="font-bold text-slate-700">{res.title}</span>
                          </div>
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            DOWNLOAD ZIP
                          </span>
                        </a>
                      ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Type note message here... (will bookmark at current timestamp)"
                    className="flex-1 px-4 py-2 border border-slate-200 focus:border-[#41c8df] outline-none rounded-xl text-xs text-slate-800"
                  />
                  <button
                    onClick={handleAddNote}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase transition-colors"
                  >
                    Bookmark Note
                  </button>
                </div>

                <div className="space-y-2">
                  {notes.length === 0 ? (
                    <p className="text-xs text-gray-500 italic text-center py-4">No bookmarks added yet for this lesson. Add notes to jump timestamps on click.</p>
                  ) : (
                    notes.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSeekToNote(item.timestamp)}
                            className="flex items-center gap-1 px-2 py-0.5 bg-[#41c8df]/15 text-[#41c8df] border border-[#41c8df]/30 rounded font-mono text-[10px] font-bold hover:bg-[#41c8df]/25"
                          >
                            <Play size={10} /> {formatTime(item.timestamp)}
                          </button>
                          <span className="text-slate-700 font-medium">{item.note_text}</span>
                        </div>
                        <button
                          onClick={async () => {
                            const updated = notes.filter((_, i) => i !== idx);
                            setNotes(updated);
                            await deleteStudentNote(item.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ai_summary' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">AI Generated Overview</span>
                  {!aiContent && (
                    <button
                      onClick={async () => {
                        setAiLoading(true);
                        const data = await generateLessonSummaryAndChapters(currentLesson.lesson_title, currentLesson.description || "");
                        const content: AILessonContent = {
                          id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                          lesson_id: currentLesson.id,
                          summary: data.summary,
                          chapters: JSON.stringify(data.chapters),
                          created_at: new Date().toISOString()
                        };
                        await createAILessonContent(content);
                        setAiContent(content);
                        setAiLoading(false);
                      }}
                      disabled={aiLoading}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                      {aiLoading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles size={14} />}
                      {aiLoading ? 'Generating...' : 'Generate with Gemini'}
                    </button>
                  )}
                </div>

                {aiContent ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                      <h4 className="text-sm font-bold text-purple-900 mb-2">Lesson Summary</h4>
                      <p className="text-sm text-purple-800 leading-relaxed">{aiContent.summary}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Smart Chapters</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {JSON.parse(aiContent.chapters).map((chapter: { time: string, title: string }, idx: number) => {
                          const parts = chapter.time.split(':');
                          let timeInSeconds = 0;
                          if (parts.length === 2) {
                            timeInSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                          }
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                                  playerRef.current.seekTo(timeInSeconds, true);
                                  playerRef.current.playVideo();
                                }
                              }}
                              className="p-3 text-left bg-slate-50 hover:bg-[#41c8df]/10 border border-slate-200 hover:border-[#41c8df]/30 rounded-xl transition-all group flex items-start gap-3"
                            >
                              <div className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-500 group-hover:text-[#41c8df] group-hover:border-[#41c8df]/30 transition-colors mt-0.5 shadow-sm">
                                {chapter.time}
                              </div>
                              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 line-clamp-2 leading-snug">{chapter.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  !aiLoading && (
                    <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                      <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4 border border-purple-100">
                        <Sparkles size={28} className="text-purple-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Unlock AI Insights</h3>
                      <p className="text-sm text-slate-500 max-w-sm mb-6">Generate an instant, highly accurate summary and smart chapters for this lesson using Gemini AI.</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar: Lesson Navigation */}
        <div className="px-8 py-8 bg-white border-t border-slate-200 mt-auto shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 bg-[#41c8df]/10 text-[#41c8df] text-[9px] font-black rounded uppercase tracking-wider">
                Active Module
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{currentLesson?.lesson_title}</h3>
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Clock size={12} className="text-[#41c8df]" /> {currentLesson?.duration || 15}m Duration</span>
                <span className="flex items-center gap-1.5"><FileText size={12} className="text-[#41c8df]" /> Interactive Sandbox</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentLessonIndex(Math.max(0, currentLessonIndex - 1))}
                disabled={currentLessonIndex === 0}
                className="p-4 border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-20 transition-all shadow-sm"
                title="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={handleLessonComplete}
                disabled={isLessonLocked || (showQuiz && !quizAnswered)}
                className="px-8 py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black rounded-xl flex items-center gap-3 transition-all shadow-xl shadow-slate-900/10 text-xs uppercase"
              >
                Complete Mission <ChevronRight size={18} />
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
            className="fixed md:relative inset-y-0 right-0 w-full md:w-[400px] bg-white border-l border-slate-200 z-[160] flex flex-col shadow-2xl shrink-0"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-400">Curriculum Outline Map</h3>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400" title="Close">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {lessons.map((lesson, idx) => {
                const hasPrereq = lesson.prerequisite_lesson_id;
                const isLocked = hasPrereq && !completedLessons.has(hasPrereq);
                
                return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      if (isLocked) {
                        alert(`Please complete lesson "${lessons.find(l => l.id === hasPrereq)?.lesson_title}" to unlock this lesson.`);
                        return;
                      }
                      setCurrentLessonIndex(idx);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className={`w-full p-4 rounded-2xl text-left transition-all flex items-start gap-3 border ${
                      idx === currentLessonIndex 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20' 
                        : 'bg-white border-slate-100 hover:border-[#41c8df] hover:shadow-sm'
                    } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`mt-0.5 shrink-0 ${
                      completedLessons.has(lesson.id) 
                        ? 'text-emerald-400' 
                        : (isLocked ? 'text-slate-300' : (idx === currentLessonIndex ? 'text-[#41c8df]' : 'text-slate-200'))
                    }`}>
                      {completedLessons.has(lesson.id) ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        isLocked ? <Lock size={16} /> : <PlayCircle size={16} />
                      )}
                    </div>
                    <div>
                      <p className={`text-xs font-black leading-tight ${idx === currentLessonIndex ? 'text-white' : 'text-slate-900'}`}>
                        {lesson.lesson_title}
                      </p>
                      <p className={`text-[9px] font-bold mt-1.5 uppercase tracking-tight ${idx === currentLessonIndex ? 'text-slate-400' : 'text-slate-400'}`}>
                        {lesson.module_name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 mt-auto">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Curriculum Completed</p>
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
