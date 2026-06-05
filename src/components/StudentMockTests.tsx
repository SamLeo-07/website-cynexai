import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, PlayCircle, Trophy, BarChart3, AlertCircle, Shield, RefreshCw } from 'lucide-react';
import { Course, Enrollment, getMockTests, MockTest, getTestResults, TestResult } from '../lib/turso';
import MockTestPlayer from './MockTestPlayer';
import ErrorBoundary from './ErrorBoundary';

interface StudentMockTestsProps {
  enrollments: { enrollment: Enrollment; course: Course }[];
  batchId?: string;
  studentName: string;
}

export const StudentMockTests: React.FC<StudentMockTestsProps> = ({ enrollments, batchId, studentName }) => {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  const getAIFeedback = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('foundation')) {
      return {
        focusTopics: [
          'Python Variable Scoping & Libraries (pandas, numpy)',
          'Measures of Central Tendency (Median vs Mean in skewed data)',
          'Supervised Learning Core Labels (Inputs vs Target outputs)'
        ],
        resources: [
          { name: 'Class Recording 2: Introduction to Python for DS', link: '#' },
          { name: 'Class Recording 4: Descriptive Statistics Fundamentals', link: '#' },
          { name: 'Concept Sheet: Supervised vs Unsupervised Paradigms', link: '#' }
        ],
        studyPlan: 'Day 1: Review class recording 2 and practice basic syntax. Day 2: Solve 10 numpy array manipulation challenges. Day 3: Complete Python foundations self-assessment.'
      };
    } else if (lowerTitle.includes('mid-term') || lowerTitle.includes('technical')) {
      return {
        focusTopics: [
          'Bias-Variance Tradeoff (Underfitting vs Overfitting dynamics)',
          'Logistic Regression Class Boundary Definition',
          'Precision vs Recall Calculations & F1-score optimization'
        ],
        resources: [
          { name: 'Class Recording 8: Bias, Variance & Regularization', link: '#' },
          { name: 'Class Recording 11: Linear & Logistic Regression math', link: '#' },
          { name: 'Interactive Lab: Precision-Recall curves implementation', link: '#' }
        ],
        studyPlan: 'Day 1: Watch recording 8, take notes on regularization. Day 2: Re-calculate all confusion matrix metrics by hand. Day 3: Retake the assessment.'
      };
    } else {
      return {
        focusTopics: [
          'Vanishing Gradient mitigating techniques (ReLU, Batch Norm)',
          'Recurrent Neural Network hidden states sequential routing',
          'NLP Vector representations (TF-IDF vs Word2Vec vs Embeddings)'
        ],
        resources: [
          { name: 'Class Recording 18: Deep Learning Architectures', link: '#' },
          { name: 'Class Recording 22: Natural Language Processing pipelines', link: '#' },
          { name: 'Code Lab: Training a RNN text classifier', link: '#' }
        ],
        studyPlan: 'Day 1: Deep dive into gradient flows in multi-layered networks. Day 2: Implement a self-attention module or sequential LSTM. Day 3: Schedule 1-on-1 tutoring.'
      };
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [testData, resultData] = await Promise.all([
        getMockTests(),
        getTestResults()
      ]);
      setTests(testData);
      setResults(resultData);
    } catch (e) {
      console.error("Failed to load mock tests or results:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 1. Sync on storage changes (another tab edits/saves tests)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cynexai_local_mock_tests' || e.key === 'cynexai_local_questions') {
        console.log("Deepmind: Local storage change detected, syncing student mock tests...");
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 2. Sync on window focus (student returns to tab)
    const handleWindowFocus = () => {
      console.log("Deepmind: Window focus detected, checking for mock test updates...");
      loadData();
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const getTestsForCourse = (courseId: string) => {
    // Filter tests that are assigned to this course AND (belong to student's batch OR no batch assigned)
    const courseTests = tests.filter(test => {
      if (!test.isActive) return false;
      
      const courseMatch = test.course_id === courseId;
      const batchMatch = !test.batch_id || test.batch_id === batchId;
      const generalFallback = !test.course_id && !test.batch_id;

      return (courseMatch && batchMatch) || generalFallback;
    });

    // If no tests are returned from the DB, return default mock data so it's not empty
    if (courseTests.length === 0) {
      const dummyTests = [
        { id: `${courseId}_test_1`, title: 'Foundation Assessment', duration: 45, totalQuestions: 5, difficulty: 'Beginner', status: 'pending' as const, score: null as number | null },
        { id: `${courseId}_test_2`, title: 'Mid-term Technical Evaluation', duration: 90, totalQuestions: 5, difficulty: 'Intermediate', status: 'locked' as const, score: null as number | null },
        { id: `${courseId}_test_3`, title: 'Final Certification Mock', duration: 120, totalQuestions: 5, difficulty: 'Advanced', status: 'locked' as const, score: null as number | null }
      ];

      let previousCompleted = true;
      return dummyTests.map((t) => {
        const attempts = results.filter(r => r.studentName === studentName && r.testId === t.id);
        const hasAttempted = attempts.length > 0;
        const isPassed = attempts.some(r => r.percentage >= 70);
        const bestScore = attempts.length > 0 ? Math.max(...attempts.map(r => r.percentage)) : null;

        let status: 'completed' | 'attempted' | 'pending' | 'locked' = 'locked';
        if (hasAttempted) {
          status = isPassed ? 'completed' : 'attempted';
        } else if (previousCompleted) {
          status = 'pending';
        } else {
          status = 'locked';
        }

        previousCompleted = hasAttempted; // unlock next once this is attempted

        return {
          ...t,
          status,
          score: bestScore,
          hasAttempted
        };
      });
    }

    // Sort courseTests sequentially by difficulty/category (Beginner, Intermediate, Advanced)
    const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
    const sortedCourseTests = [...courseTests].sort((a, b) => {
      const diffA = difficultyOrder[a.category as keyof typeof difficultyOrder] || 2;
      const diffB = difficultyOrder[b.category as keyof typeof difficultyOrder] || 2;
      if (diffA !== diffB) return diffA - diffB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    let previousCompleted = true;
    return sortedCourseTests.map(t => {
      // Find attempts for this test
      const attempts = results.filter(r => r.studentName === studentName && r.testId === t.id);
      const hasAttempted = attempts.length > 0;
      const isPassed = attempts.some(r => r.percentage >= 70);
      const bestScore = attempts.length > 0 ? Math.max(...attempts.map(r => r.percentage)) : null;

      let status: 'completed' | 'attempted' | 'pending' | 'locked' = 'locked';
      if (hasAttempted) {
        status = isPassed ? 'completed' : 'attempted';
      } else if (previousCompleted) {
        status = 'pending';
      } else {
        status = 'locked';
      }

      previousCompleted = hasAttempted; // unlock next once this is attempted

      return {
        id: t.id,
        title: t.title,
        duration: t.duration,
        totalQuestions: t.totalQuestions,
        difficulty: t.category || 'Intermediate',
        status,
        score: bestScore,
        language: t.language || 'English',
        hasAttempted
      };
    });
  };

  if (enrollments.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center shadow-sm">
        <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-slate-800 mb-3">No Mock Tests Available</h3>
        <p className="text-slate-500 max-w-md mx-auto">Enroll in a course to access its associated mock tests.</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-12 pb-12">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 animate-slide-in">Mock Tests</h2>
          <p className="text-slate-500 font-medium">Evaluate your readiness for final placements and certifications.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center justify-center gap-2 self-start sm:self-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10 text-xs uppercase tracking-wider border border-white/5 active:scale-[0.98]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Syncing...' : 'Sync / Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading assessments...</p>
        </div>
      ) : (
        enrollments.map(({ course }) => (
          <div key={course.id} className="space-y-6">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
              <div className="w-10 h-10 rounded-md overflow-hidden shadow-sm shrink-0">
                <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{course.title}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Assessments & Exams</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getTestsForCourse(course.id).map((test) => (
                <motion.div
                  key={test.id}
                  whileHover={test.status !== 'locked' ? { y: -4 } : {}}
                  onClick={() => {
                    if (test.status !== 'locked') {
                      setActiveTestId(test.id);
                    }
                  }}
                  className={`border rounded-2xl p-6 relative overflow-hidden transition-all ${
                    test.status === 'completed' ? 'bg-emerald-50 border-emerald-200 shadow-sm cursor-pointer hover:border-emerald-300' :
                    test.status === 'attempted' ? 'bg-amber-50 border-amber-200 shadow-sm cursor-pointer hover:border-amber-300' :
                    test.status === 'locked' ? 'bg-slate-50 border-slate-200 opacity-70 grayscale-[0.3]' :
                    'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer'
                  }`}
                >
                  {test.status === 'completed' && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1.5 rounded-bl-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                      <CheckCircle2 size={11} /> Passed
                    </div>
                  )}
                  {test.status === 'attempted' && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1.5 rounded-bl-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                      <BarChart3 size={11} /> Attempted
                    </div>
                  )}
                  {test.status === 'locked' && (
                    <div className="absolute top-0 right-0 bg-slate-300 text-slate-600 px-4 py-1.5 rounded-bl-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                      Locked
                    </div>
                  )}

                  <div className="mb-6 pt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        test.difficulty === 'Beginner' ? 'bg-blue-100 text-blue-700' :
                        test.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {test.difficulty}
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                        🌐 {test.language || 'English'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 leading-tight mb-2">{test.title}</h4>
                    
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className={test.status === 'pending' ? 'text-indigo-500' : 'text-slate-400'} /> {test.duration} mins
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BarChart3 size={14} className={test.status === 'pending' ? 'text-indigo-500' : 'text-slate-400'} /> {test.totalQuestions} Qs
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    {(test.status === 'completed' || test.status === 'attempted') ? (
                      <>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Best Score</div>
                        <div className={`flex items-center gap-2 font-black text-xl ${
                          test.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {test.score}% <Trophy size={18} />
                        </div>
                      </>
                    ) : test.status === 'pending' ? (
                      <button 
                        onClick={() => setActiveTestId(test.id)}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-600/20"
                      >
                        <Shield size={15} /> Start Proctored Test
                      </button>
                    ) : (
                      <div className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold rounded-xl text-center text-sm cursor-not-allowed flex items-center justify-center gap-1.5 border border-slate-200">
                        Complete previous assessment first
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))
      )}

    </div>

      {/* ─ MockTestPlayer Full-Screen Overlay ─ */}
      <AnimatePresence>
        {activeTestId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, overflowY: 'auto', backgroundColor: '#080d14' }}
          >
            <ErrorBoundary>
              <MockTestPlayer
                inlineTestId={activeTestId}
                onComplete={() => {
                  setActiveTestId(null);
                  const loadResults = async () => {
                    const studentId = localStorage.getItem('cynexai_student_id') || '';
                    const r = await getTestResults(studentId);
                    setResults(r);
                  };
                  loadResults();
                }}
              />
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StudentMockTests;
