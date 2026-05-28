import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, PlayCircle, Trophy, BarChart3, AlertCircle, ChevronLeft, ChevronRight, Check, AlertTriangle, Info, Zap, Rocket, Award, Star, Sparkles, BookOpen, Terminal, Play, X } from 'lucide-react';
import { Course, Enrollment, getMockTests, MockTest, getQuestions, createTestResult, getTestResults, Question, TestResult } from '../lib/turso';

interface StudentMockTestsProps {
  enrollments: { enrollment: Enrollment; course: Course }[];
  batchId?: string;
  studentName: string;
}

export const StudentMockTests: React.FC<StudentMockTestsProps> = ({ enrollments, batchId, studentName }) => {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Player States
  const [activeTest, setActiveTest] = useState<MockTest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [codingAnswers, setCodingAnswers] = useState<Record<string, string>>({});
  const [testExecutionOutputs, setTestExecutionOutputs] = useState<Record<string, {
    outputs: { input: string; expected: string; actual: string; passed: boolean }[];
    runSuccess: boolean;
    running: boolean;
    error?: string;
  }>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testResultSummary, setTestResultSummary] = useState<{
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
  } | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [tutoringDate, setTutoringDate] = useState('');
  const [tutoringTime, setTutoringTime] = useState('');
  const [tutoringScheduled, setTutoringScheduled] = useState(false);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLTextAreaElement>(null);

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
  }, []);

  // Timer Effect
  useEffect(() => {
    if (!activeTest || testResultSummary || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTest, testResultSummary, timeLeft]);

  const handleStartTest = async (test: MockTest) => {
    setQuestionsLoading(true);
    setActiveTest(test);
    setReviewMode(false);
    setTestResultSummary(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setTimeLeft(test.duration * 60);
    setMarkedForReview(new Set());

    try {
      let q: Question[] = [];
      if (test.id.includes('_test_')) {
        // Generate mock questions for the dummy tests so they are fully functional!
        const isFoundation = test.id.includes('_test_1');
        const isMidterm = test.id.includes('_test_2');
        
        if (isFoundation) {
          q = [
            {
              id: `${test.id}_q1`,
              testId: test.id,
              text: 'Which of the following is used to manage packages in Python?',
              options: ['pip', 'npm', 'gradle', 'maven'],
              correctAnswer: 0,
              difficulty: 'easy',
              type: 'mcq',
              explanation: 'pip is the package installer for Python. You can use pip to install packages from the Python Package Index.'
            },
            {
              id: `${test.id}_q2`,
              testId: test.id,
              text: 'What is the correct way to import pandas under the alias pd?',
              options: ['import pandas as pd', 'import pd from pandas', 'library(pandas) as pd', 'import pandas pd'],
              correctAnswer: 0,
              difficulty: 'easy',
              type: 'mcq',
              explanation: 'The standard alias for pandas is pd: import pandas as pd.'
            },
            {
              id: `${test.id}_q3`,
              testId: test.id,
              text: 'Which statistical metric represents the middle value in a sorted data set?',
              options: ['Mean', 'Median', 'Mode', 'Variance'],
              correctAnswer: 1,
              difficulty: 'easy',
              type: 'mcq',
              explanation: 'Median is the middle value when the data set is ordered from least to greatest.'
            },
            {
              id: `${test.id}_q4`,
              testId: test.id,
              text: 'In Supervised Machine Learning, what do we need to train the model?',
              options: ['Only input data', 'Only output labels', 'Both input data and corresponding output labels', 'No data at all'],
              correctAnswer: 2,
              difficulty: 'easy',
              type: 'mcq',
              explanation: 'Supervised learning requires labeled training data consisting of both input features and target labels.'
            },
            {
              id: `${test.id}_q5`,
              testId: test.id,
              text: 'Which library is primarily used for statistical data visualization in Python?',
              options: ['numpy', 'scikit-learn', 'seaborn', 'tensorflow'],
              correctAnswer: 2,
              difficulty: 'easy',
              type: 'mcq',
              explanation: 'Seaborn is a Python data visualization library based on matplotlib.'
            }
          ];
        } else if (isMidterm) {
          q = [
            {
              id: `${test.id}_q1`,
              testId: test.id,
              text: 'What does bias-variance tradeoff refer to in machine learning?',
              options: [
                'Finding a balance between underfitting (high bias) and overfitting (high variance)',
                'Speed vs accuracy tradeoff of a model',
                'Storage vs computation tradeoff of a model',
                'Selecting the right number of features'
              ],
              correctAnswer: 0,
              difficulty: 'medium',
              type: 'mcq',
              explanation: 'The bias-variance tradeoff is finding a balance between underfitting (high bias) and overfitting (high variance).'
            },
            {
              id: `${test.id}_q2`,
              testId: test.id,
              text: 'Which of the following is a classification algorithm?',
              options: ['Linear Regression', 'Logistic Regression', 'K-Means Clustering', 'Principal Component Analysis'],
              correctAnswer: 1,
              difficulty: 'medium',
              type: 'mcq',
              explanation: 'Logistic Regression is a classification algorithm used to predict binary outcomes.'
            },
            {
              id: `${test.id}_q3`,
              testId: test.id,
              text: 'What is the purpose of train_test_split from scikit-learn?',
              options: ['To split dataset into training set and testing set', 'To clean missing data', 'To normalize the feature values', 'To evaluate model metrics'],
              correctAnswer: 0,
              difficulty: 'easy',
              type: 'mcq',
              explanation: 'train_test_split is used to split the dataset.'
            },
            {
              id: `${test.id}_q4`,
              testId: test.id,
              text: 'Which metric is calculated as: True Positives / (True Positives + False Positives)?',
              options: ['Recall', 'Precision', 'F1-Score', 'Accuracy'],
              correctAnswer: 1,
              difficulty: 'medium',
              type: 'mcq',
              explanation: 'Precision is the ratio of correctly predicted positive observations to the total predicted positives.'
            },
            {
              id: `${test.id}_q5`,
              testId: test.id,
              text: 'In a Decision Tree, what is the top-most node called?',
              options: ['Leaf Node', 'Branch Node', 'Root Node', 'Child Node'],
              correctAnswer: 2,
              difficulty: 'easy',
              type: 'mcq',
              explanation: 'The starting/top-most node of a decision tree is the Root Node.'
            }
          ];
        } else {
          // Final exam mock
          q = [
            {
              id: `${test.id}_q1`,
              testId: test.id,
              text: 'What is the vanishing gradient problem in Deep Neural Networks?',
              options: [
                'Gradients become too large, leading to numerical overflow',
                'Gradients become extremely small, preventing weight updates in early layers',
                'Weights are initialized to zero',
                'Activation functions return negative values only'
              ],
              correctAnswer: 1,
              difficulty: 'hard',
              type: 'mcq',
              explanation: 'Vanishing gradient occurs when backpropagated gradients shrink exponentially as they go back, causing early layers to train very slowly.'
            },
            {
              id: `${test.id}_q2`,
              testId: test.id,
              text: 'Which neural network architecture is best suited for sequence modeling (e.g. text/time series)?',
              options: ['Convolutional Neural Network (CNN)', 'Recurrent Neural Network (RNN)', 'Feedforward Neural Network', 'Generative Adversarial Network (GAN)'],
              correctAnswer: 1,
              difficulty: 'medium',
              type: 'mcq',
              explanation: 'RNNs are specifically designed to handle sequential data by maintaining internal memory states.'
            },
            {
              id: `${test.id}_q3`,
              testId: test.id,
              text: 'In NLP, what is the purpose of TF-IDF representation?',
              options: ['To translate text to another language', 'To evaluate word importance relative to a document and a corpus', 'To correct spelling errors', 'To tag parts of speech'],
              correctAnswer: 1,
              difficulty: 'medium',
              type: 'mcq',
              explanation: 'TF-IDF measures how important a word is to a document in a collection.'
            },
            {
              id: `${test.id}_q4`,
              testId: test.id,
              text: 'What does the term ROC AUC score represent?',
              options: [
                'The area under the receiver operating characteristic curve, indicating classification quality',
                'The rate of convergence of a model',
                'The accuracy of regression predictions',
                'The clustering separation index'
              ],
              correctAnswer: 0,
              difficulty: 'hard',
              type: 'mcq',
              explanation: 'ROC AUC represents classification performance across all classification thresholds, measuring the model\'s ability to distinguish classes.'
            },
            {
              id: `${test.id}_q5`,
              testId: test.id,
              text: 'What technique is used to prevent overfitting by randomly setting activation units to 0 during training?',
              options: ['Batch Normalization', 'Gradient Descent', 'Dropout', 'L1 Regularization'],
              correctAnswer: 2,
              difficulty: 'medium',
              type: 'mcq',
              explanation: 'Dropout is a regularization technique where randomly selected neurons are ignored during training, reducing co-dependency.'
            }
          ];
        }
      } else {
        q = await getQuestions(test.id);
      }
      setQuestions(q);

      // Initialize coding answers with boilerplate
      const initCoding: Record<string, string> = {};
      q.forEach(question => {
        if (question.type === 'coding') {
          initCoding[question.id] = question.boilerplate || '// Write your solution here\nfunction solution() {\n  \n}';
        }
      });
      setCodingAnswers(initCoding);
      setTestExecutionOutputs({});

      if (q.length === 0) {
        alert("This mock test doesn't have any questions configured yet.");
        setActiveTest(null);
      }
    } catch (e) {
      console.error("Failed to load questions:", e);
      alert("Failed to load questions for the test. Please try again.");
      setActiveTest(null);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleSubmitTest = async (force: boolean = false) => {
    if (!force && !window.confirm("Are you sure you want to submit your mock test?")) {
      return;
    }

    let correctCount = 0;
    questions.forEach(q => {
      if (q.type === 'coding') {
        const result = testExecutionOutputs[q.id];
        if (result && result.runSuccess && result.outputs.length > 0 && result.outputs.every(o => o.passed)) {
          correctCount++;
        }
      } else {
        const selected = selectedAnswers[q.id];
        if (selected !== undefined && q.correctAnswer !== undefined && selected === q.correctAnswer) {
          correctCount++;
        }
      }
    });

    const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const passed = percentage >= 70;

    const newResult: TestResult = {
      id: `res_${Date.now()}`,
      studentName: studentName,
      testId: activeTest!.id,
      testTitle: activeTest!.title,
      score: correctCount,
      totalQuestions: questions.length,
      percentage,
      date: new Date().toISOString()
    };

    try {
      await createTestResult(newResult);
      
      // Update XP & badges if passed for the first time
      if (passed) {
        const isFirstPass = !results.some(r => r.studentName === studentName && r.testId === activeTest!.id && r.percentage >= 70);
        if (isFirstPass) {
          const currentMockTestXp = parseInt(localStorage.getItem('cynexai_mock_test_xp') || '0', 10);
          localStorage.setItem('cynexai_mock_test_xp', (currentMockTestXp + 300).toString());
          
          let badgeTitle = '';
          let badgeDescription = '';
          let badgeIcon = '';
          if (activeTest!.title.toLowerCase().includes('foundation')) {
            badgeTitle = 'Python Pioneer';
            badgeDescription = 'Demonstrated exceptional python and statistical fundamentals.';
            badgeIcon = 'Rocket';
          } else if (activeTest!.title.toLowerCase().includes('mid-term') || activeTest!.title.toLowerCase().includes('technical')) {
            badgeTitle = 'SQL Sorcerer';
            badgeDescription = 'Mastered intermediate relational data manipulation and supervised algorithms.';
            badgeIcon = 'Zap';
          } else if (activeTest!.title.toLowerCase().includes('final') || activeTest!.title.toLowerCase().includes('certification')) {
            badgeTitle = 'ML Champion';
            badgeDescription = 'Acquired complete machine learning and placement-readiness certification.';
            badgeIcon = 'Award';
          }
          
          if (badgeTitle) {
            const customBadgesJson = localStorage.getItem('cynexai_custom_badges');
            let customBadges: any[] = [];
            if (customBadgesJson) {
              try { customBadges = JSON.parse(customBadgesJson); } catch (e) {}
            }
            if (!customBadges.some(b => b.title === badgeTitle)) {
              customBadges.push({
                id: `badge_${Date.now()}`,
                student_id: localStorage.getItem('cynexai_student_id') || 'demo-student-id',
                title: badgeTitle,
                description: badgeDescription,
                icon: badgeIcon,
                unlocked_at: new Date().toISOString()
              });
              localStorage.setItem('cynexai_custom_badges', JSON.stringify(customBadges));
            }
          }
        }
      }

      setTestResultSummary({
        score: correctCount,
        total: questions.length,
        percentage,
        passed
      });
      // Refresh results list
      const updatedResults = await getTestResults();
      setResults(updatedResults);
    } catch (e) {
      console.error("Failed to save test result:", e);
      
      // Fallback update XP & badges even on Turso error
      if (passed) {
        const isFirstPass = !results.some(r => r.studentName === studentName && r.testId === activeTest!.id && r.percentage >= 70);
        if (isFirstPass) {
          const currentMockTestXp = parseInt(localStorage.getItem('cynexai_mock_test_xp') || '0', 10);
          localStorage.setItem('cynexai_mock_test_xp', (currentMockTestXp + 300).toString());
          
          let badgeTitle = '';
          let badgeDescription = '';
          let badgeIcon = '';
          if (activeTest!.title.toLowerCase().includes('foundation')) {
            badgeTitle = 'Python Pioneer';
            badgeDescription = 'Demonstrated exceptional python and statistical fundamentals.';
            badgeIcon = 'Rocket';
          } else if (activeTest!.title.toLowerCase().includes('mid-term') || activeTest!.title.toLowerCase().includes('technical')) {
            badgeTitle = 'SQL Sorcerer';
            badgeDescription = 'Mastered intermediate relational data manipulation and supervised algorithms.';
            badgeIcon = 'Zap';
          } else if (activeTest!.title.toLowerCase().includes('final') || activeTest!.title.toLowerCase().includes('certification')) {
            badgeTitle = 'ML Champion';
            badgeDescription = 'Acquired complete machine learning and placement-readiness certification.';
            badgeIcon = 'Award';
          }
          
          if (badgeTitle) {
            const customBadgesJson = localStorage.getItem('cynexai_custom_badges');
            let customBadges: any[] = [];
            if (customBadgesJson) {
              try { customBadges = JSON.parse(customBadgesJson); } catch (e) {}
            }
            if (!customBadges.some(b => b.title === badgeTitle)) {
              customBadges.push({
                id: `badge_${Date.now()}`,
                student_id: localStorage.getItem('cynexai_student_id') || 'demo-student-id',
                title: badgeTitle,
                description: badgeDescription,
                icon: badgeIcon,
                unlocked_at: new Date().toISOString()
              });
              localStorage.setItem('cynexai_custom_badges', JSON.stringify(customBadges));
            }
          }
        }
      }

      setTestResultSummary({
        score: correctCount,
        total: questions.length,
        percentage,
        passed
      });
      setResults(prev => [...prev, newResult]);
    }
  };

  const runCodeTests = (questionId: string) => {
    const q = questions.find(q => q.id === questionId);
    if (!q) return;
    const code = codingAnswers[questionId] || '';
    let testCases: { input: string; expected_output: string }[] = [];
    try {
      if (q.testCases) testCases = JSON.parse(q.testCases);
    } catch {}
    if (testCases.length === 0 && q.sampleInput && q.sampleOutput) {
      testCases = [{ input: q.sampleInput, expected_output: q.sampleOutput }];
    }
    setTestExecutionOutputs(prev => ({ ...prev, [questionId]: { outputs: [], runSuccess: false, running: true } }));
    setTimeout(() => {
      try {
        const outputs: { input: string; expected: string; actual: string; passed: boolean }[] = [];
        let hasError = false;
        let errorMsg = '';
        for (const tc of testCases) {
          try {
            const logs: string[] = [];
            const mockConsole = { log: (...args: any[]) => logs.push(args.map(String).join(' ')) };
            // eslint-disable-next-line no-new-func
            const fn = new Function('console', code + '\n; if (typeof solution === "function") { console.log(solution(' + tc.input + ')); }');
            fn(mockConsole);
            const actual = logs.join('\n').trim();
            const expected = String(tc.expected_output).trim();
            outputs.push({ input: tc.input, expected, actual, passed: actual === expected });
          } catch (e: any) {
            hasError = true;
            errorMsg = e.message || 'Runtime error';
            outputs.push({ input: tc.input, expected: String(tc.expected_output).trim(), actual: `Error: ${errorMsg}`, passed: false });
          }
        }
        const allPassed = outputs.length > 0 && outputs.every(o => o.passed);
        setTestExecutionOutputs(prev => ({
          ...prev,
          [questionId]: { outputs, runSuccess: allPassed, running: false, error: hasError ? errorMsg : undefined }
        }));
      } catch (e: any) {
        setTestExecutionOutputs(prev => ({
          ...prev,
          [questionId]: { outputs: [], runSuccess: false, running: false, error: e.message }
        }));
      }
    }, 300);
  };



  const handleAutoSubmit = () => {
    alert("Time is up! Your test is being submitted automatically.");
    handleSubmitTest(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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
        const isPassed = attempts.some(r => r.percentage >= 70);
        const bestScore = attempts.length > 0 ? Math.max(...attempts.map(r => r.percentage)) : null;

        let status: 'completed' | 'pending' | 'locked' = 'locked';
        if (isPassed) {
          status = 'completed';
        } else if (previousCompleted) {
          status = 'pending';
        } else {
          status = 'locked';
        }

        previousCompleted = isPassed;

        return {
          ...t,
          status,
          score: bestScore
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
      const isPassed = attempts.some(r => r.percentage >= 70);
      const bestScore = attempts.length > 0 ? Math.max(...attempts.map(r => r.percentage)) : null;

      let status: 'completed' | 'pending' | 'locked' = 'locked';
      if (isPassed) {
        status = 'completed';
      } else if (previousCompleted) {
        status = 'pending';
      } else {
        status = 'locked';
      }

      previousCompleted = isPassed;

      return {
        id: t.id,
        title: t.title,
        duration: t.duration,
        totalQuestions: t.totalQuestions,
        difficulty: t.category || 'Intermediate',
        status,
        score: bestScore
      };
    });
  };

  if (enrollments.length === 0) {
    return (
      <div className="bg-background-100 border border-secondary/10 rounded-xl p-10 text-center shadow-sm">
        <AlertCircle className="w-16 h-16 text-secondary/20 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-secondary mb-3">No Mock Tests Available</h3>
        <p className="text-secondary/60 max-w-md mx-auto">Enroll in a course to access its associated mock tests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-secondary mb-2">Mock Tests</h2>
        <p className="text-secondary/60 font-medium">Evaluate your readiness for final placements and certifications.</p>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-secondary/10 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-secondary/40 uppercase tracking-widest animate-pulse">Loading assessments...</p>
        </div>
      ) : (
        enrollments.map(({ course }) => (
          <div key={course.id} className="space-y-6">
            <div className="flex items-center gap-3 mb-6 border-b border-secondary/10 pb-4">
              <div className="w-10 h-10 rounded-md overflow-hidden shadow-sm shrink-0">
                <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-secondary">{course.title}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Assessments & Exams</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getTestsForCourse(course.id).map((test) => (
                <motion.div
                  key={test.id}
                  whileHover={test.status !== 'locked' ? { y: -5 } : {}}
                  className={`border rounded-xl p-6 relative overflow-hidden ${
                    test.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20' :
                    test.status === 'locked' ? 'bg-secondary/5 border-secondary/10 opacity-75 grayscale-[0.5]' :
                    'bg-background-100 border-secondary/10 hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer'
                  }`}
                >
                  {test.status === 'completed' && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1.5 rounded-bl-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                      <CheckCircle2 size={12} /> Passed
                    </div>
                  )}
                  {test.status === 'locked' && (
                    <div className="absolute top-0 right-0 bg-secondary/20 text-secondary/60 px-4 py-1.5 rounded-bl-md text-[10px] font-black uppercase tracking-widest shadow-sm">
                      Locked
                    </div>
                  )}

                  <div className="mb-6 pt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        test.difficulty === 'Beginner' ? 'bg-blue-500/10 text-blue-400' :
                        test.difficulty === 'Intermediate' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {test.difficulty}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-secondary leading-tight mb-2">{test.title}</h4>
                    
                    <div className="flex items-center gap-4 text-xs font-bold text-secondary/60">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className={test.status === 'pending' ? 'text-indigo-400' : ''} /> {test.duration} mins
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BarChart3 size={14} className={test.status === 'pending' ? 'text-indigo-400' : ''} /> {test.totalQuestions} Qs
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-secondary/5 flex items-center justify-between">
                    {test.status === 'completed' ? (
                      <>
                        <div className="text-xs font-bold text-secondary/60 uppercase tracking-widest">Best Score</div>
                        <div className="flex items-center gap-2 text-emerald-500 font-black text-xl">
                          {test.score}% <Trophy size={20} />
                        </div>
                      </>
                    ) : test.status === 'pending' ? (
                      <button 
                        onClick={() => {
                          if (!test.id.includes('_test_')) {
                            const realTest = tests.find(t => t.id === test.id);
                            if (realTest) handleStartTest(realTest);
                          } else {
                            // Support starting dummy placeholder mock test so demo is fully functional
                            const mockTestObj: MockTest = {
                              id: test.id,
                              title: test.title,
                              description: `Evaluation assessment module for ${test.title}.`,
                              duration: test.duration,
                              category: test.difficulty,
                              totalQuestions: test.totalQuestions,
                              isActive: true,
                              createdAt: new Date().toISOString()
                            };
                            handleStartTest(mockTestObj);
                          }
                        }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <PlayCircle size={18} /> Start Test
                      </button>
                    ) : (
                      <div className="w-full py-2.5 bg-secondary/10 text-secondary/40 font-bold rounded-md text-center text-sm cursor-not-allowed flex items-center justify-center gap-1.5">
                        Complete previous assessment
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* TIMED MOCK TEST PLAYER OVERLAY */}
      <AnimatePresence>
        {activeTest && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl bg-background-100 border border-secondary/10 rounded-xl shadow-2xl p-6 flex flex-col min-h-[80vh] max-h-[95vh] justify-between relative overflow-hidden text-secondary"
            >
              {questionsLoading ? (
                <div className="flex flex-col justify-center items-center flex-1 py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Questions...</p>
                </div>
              ) : testResultSummary ? (
                /* TEST RESULT SUMMARY PANEL */
                <div className="flex flex-col lg:flex-row gap-8 items-stretch flex-grow py-6 w-full max-h-[75vh] overflow-y-auto pr-2 no-scrollbar">
                  {/* Left Column: Stats & Actions */}
                  <div className="flex-1 bg-secondary/5 border border-secondary/10 p-6 rounded-xl flex flex-col justify-between items-center text-center space-y-6">
                    <div className="space-y-4 w-full">
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                        testResultSummary.passed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {testResultSummary.passed ? <Trophy size={32} className="animate-bounce" /> : <AlertTriangle size={32} />}
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-black text-secondary">
                          {testResultSummary.passed ? 'Passed!' : 'Try Again'}
                        </h3>
                        <p className="text-secondary/60 text-xs mt-1 font-medium px-2 leading-relaxed">
                          {testResultSummary.passed
                            ? 'Excellent job! You have passed this examination module.'
                            : 'You did not reach the 70% passing threshold. Follow the AI recommendations on the right to prepare for a retake.'}
                        </p>
                      </div>

                      <div className="w-full grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-background/50 border border-secondary/5 p-4 rounded-md text-center">
                          <div className="text-[10px] text-secondary/40 font-bold uppercase tracking-wider">Your Score</div>
                          <div className="text-xl font-black text-secondary mt-1">{testResultSummary.score} / {testResultSummary.total}</div>
                        </div>
                        <div className="bg-background/50 border border-secondary/5 p-4 rounded-md text-center">
                          <div className="text-[10px] text-secondary/40 font-bold uppercase tracking-wider">Percentage</div>
                          <div className={`text-xl font-black mt-1 ${testResultSummary.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                            {testResultSummary.percentage}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full pt-4">
                      <button
                        onClick={() => setReviewMode(true)}
                        className="w-full py-2.5 border border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 font-bold rounded-md transition-colors text-sm"
                      >
                        Review Answers
                      </button>
                      <button
                        onClick={() => {
                          setActiveTest(null);
                          setTestResultSummary(null);
                          setTutoringScheduled(false);
                          setTutoringDate('');
                          setTutoringTime('');
                          loadData();
                        }}
                        className="w-full py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-md transition-colors text-sm"
                      >
                        Back to Portal
                      </button>
                    </div>
                  </div>

                  {/* Right Column: AI Feedback / Scheduler OR Rewards / Sequential progression */}
                  <div className="flex-[1.5] bg-secondary/5 border border-secondary/10 p-6 rounded-xl flex flex-col justify-between space-y-6">
                    {!testResultSummary.passed ? (
                      /* FAILED PATH: AI study guide & scheduling */
                      <>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-red-400">
                            <Sparkles size={16} />
                            <h4 className="font-black text-sm uppercase tracking-widest">AI study assistant feedback</h4>
                          </div>
                          
                          <div className="bg-background/40 border border-red-500/10 p-4 rounded-md space-y-3">
                            <div>
                              <span className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">High-Priority Focus Areas</span>
                              <ul className="list-disc list-inside text-xs font-semibold text-secondary/80 mt-1 space-y-1">
                                {getAIFeedback(activeTest!.title).focusTopics.map((topic, i) => (
                                  <li key={i}>{topic}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="border-t border-secondary/5 pt-2">
                              <span className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Personalized Study Plan</span>
                              <p className="text-xs font-semibold text-secondary/70 mt-1 leading-relaxed">
                                {getAIFeedback(activeTest!.title).studyPlan}
                              </p>
                            </div>
                            <div className="border-t border-secondary/5 pt-2">
                              <span className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Recommended Lectures</span>
                              <div className="mt-1.5 space-y-1">
                                {getAIFeedback(activeTest!.title).resources.map((res, i) => (
                                  <a key={i} href={res.link} className="block text-xs font-bold text-indigo-400 hover:underline">
                                    {res.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Scheduling card */}
                        <div className="border-t border-secondary/10 pt-4 space-y-3">
                          <h5 className="text-xs font-black uppercase tracking-wider text-secondary">Schedule 1-on-1 Mentoring Session</h5>
                          <p className="text-[11px] text-secondary/60 leading-relaxed font-medium">
                            Failures are just milestones. Connect with our instructors for a dedicated 45-minute doubt-clearing session.
                          </p>
                          
                          {tutoringScheduled ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-md text-xs font-bold flex items-center gap-2">
                              <CheckCircle2 size={16} />
                              <span>Session Confirmed! Zoom link sent to your email.</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-black text-secondary/40 uppercase tracking-widest block mb-1">Select Date</label>
                                <input
                                  type="date"
                                  value={tutoringDate}
                                  min={new Date().toISOString().split('T')[0]}
                                  onChange={(e) => setTutoringDate(e.target.value)}
                                  className="w-full bg-background border border-secondary/10 rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-600 text-secondary"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-secondary/40 uppercase tracking-widest block mb-1">Select Time</label>
                                <select
                                  value={tutoringTime}
                                  onChange={(e) => setTutoringTime(e.target.value)}
                                  className="w-full bg-background border border-secondary/10 rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-600 text-secondary"
                                >
                                  <option value="">Choose time...</option>
                                  <option value="10:00 AM">10:00 AM</option>
                                  <option value="02:00 PM">02:00 PM</option>
                                  <option value="04:00 PM">04:00 PM</option>
                                  <option value="06:00 PM">06:00 PM</option>
                                </select>
                              </div>
                              <button
                                disabled={!tutoringDate || !tutoringTime}
                                onClick={() => {
                                  setTutoringScheduled(true);
                                }}
                                className="col-span-2 py-2.5 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 transition-colors text-xs uppercase tracking-wider"
                              >
                                Book Session & Email Invitation
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      /* PASSED PATH: XP unlocked & Badge awards */
                      <div className="flex flex-col justify-center items-center h-full text-center space-y-6">
                        <div className="space-y-2">
                          <div className="flex justify-center items-center gap-1.5 text-yellow-400">
                            <Sparkles className="animate-spin-slow" />
                            <h4 className="font-black text-sm uppercase tracking-widest text-yellow-400">Rewards Unlocked</h4>
                            <Sparkles />
                          </div>
                          <p className="text-xs text-secondary/60 font-semibold max-w-sm">
                            Your sequential progression unlocked the next tier assessment module and granted experience bonuses.
                          </p>
                        </div>

                        {/* XP Notification */}
                        <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 p-4 rounded-md w-full max-w-sm flex items-center justify-between shadow-[0_0_15px_rgba(234,179,8,0.05)]">
                          <div className="text-left">
                            <div className="text-[10px] text-yellow-500 font-black uppercase tracking-wider">XP Reward Granted</div>
                            <div className="text-sm font-black text-secondary mt-0.5">Mock Test Mastery</div>
                          </div>
                          <div className="text-2xl font-black text-yellow-500 flex items-center gap-1">
                            +300 <Zap size={20} fill="currentColor" />
                          </div>
                        </div>

                        {/* Custom Badge Unlocks */}
                        {(() => {
                          let title = 'Assessment Competent';
                          let icon = 'Star';
                          let desc = 'Passed a major module mock test.';
                          if (activeTest!.title.toLowerCase().includes('foundation')) {
                            title = 'Python Pioneer';
                            icon = 'Rocket';
                            desc = 'Demonstrated exceptional python and statistical fundamentals.';
                          } else if (activeTest!.title.toLowerCase().includes('mid-term') || activeTest!.title.toLowerCase().includes('technical')) {
                            title = 'SQL Sorcerer';
                            icon = 'Zap';
                            desc = 'Mastered intermediate relational data manipulation and supervised algorithms.';
                          } else if (activeTest!.title.toLowerCase().includes('final') || activeTest!.title.toLowerCase().includes('certification')) {
                            title = 'ML Champion';
                            icon = 'Award';
                            desc = 'Acquired complete machine learning and placement-readiness certification.';
                          }

                          return (
                            <div className="bg-background/40 border border-secondary/15 p-5 rounded-md w-full max-w-sm relative overflow-hidden group shadow-lg">
                              <div className="absolute top-0 right-0 bg-indigo-600 text-white px-3 py-1 rounded-bl-md text-[8px] font-black uppercase tracking-widest">
                                Badge Earned
                              </div>
                              <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-md flex items-center justify-center mx-auto text-indigo-400 mb-3 shadow-[0_0_15px_rgba(99,102,241,0.2)] animate-pulse">
                                {icon === 'Rocket' ? <Rocket size={24} /> : icon === 'Zap' ? <Zap size={24} /> : icon === 'Award' ? <Award size={24} /> : <Star size={24} />}
                              </div>
                              <h5 className="font-black text-secondary text-sm">{title}</h5>
                              <p className="text-[10px] text-secondary/60 leading-relaxed font-semibold mt-1 px-4">{desc}</p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ) : reviewMode ? (
                /* REVIEW MODE PANEL */
                <div className="flex flex-col h-full justify-between flex-grow">
                  <div className="border-b border-secondary/10 pb-6 mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-secondary">Review Answers</h3>
                      <p className="text-xs text-secondary/60 mt-1 font-medium">{activeTest.title} Â· Answer Key</p>
                    </div>
                    <button
                      onClick={() => setReviewMode(false)}
                      className="px-4 py-2 border border-secondary/10 rounded-md hover:bg-secondary/5 font-bold text-xs"
                    >
                      Back to Summary
                    </button>
                  </div>

                  <div className="flex-grow overflow-y-auto space-y-6 pr-2 max-h-[55vh] no-scrollbar">
                    {questions.map((q, idx) => {
                      if (q.type === 'coding') {
                        const executionResult = testExecutionOutputs[q.id];
                        const isCorrect = executionResult && executionResult.runSuccess && executionResult.outputs.length > 0 && executionResult.outputs.every(o => o.passed);
                        
                        return (
                          <div key={q.id} className="p-6 bg-secondary/5 border border-secondary/10 rounded-xl space-y-4">
                            <div className="flex items-start gap-3">
                              <span className="text-sm font-bold text-secondary/40 mt-0.5">{idx + 1}.</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                                    q.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                                    'bg-red-500/10 text-red-400'
                                  }`}>{q.difficulty}</span>
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400">Coding</span>
                                  {isCorrect ? (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">All Tests Passed</span>
                                  ) : (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-red-500/15 text-red-400">Tests Failed</span>
                                  )}
                                </div>
                                <p className="text-base font-bold text-secondary">{q.text}</p>
                              </div>
                            </div>
                            
                            <div className="pl-6 space-y-4">
                              <div className="bg-background border border-secondary/10 rounded-lg p-3">
                                <div className="text-[10px] font-black uppercase tracking-widest text-secondary/40 mb-2">Your Submitted Code</div>
                                <pre className="text-xs font-mono text-secondary/80 overflow-auto">{codingAnswers[q.id] || '// No code submitted'}</pre>
                              </div>
                              
                              {executionResult && executionResult.outputs && executionResult.outputs.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {executionResult.outputs.map((out, oIdx) => (
                                    <div key={oIdx} className={`p-3 rounded-lg border ${
                                      out.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
                                    }`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary/60">Test Case {oIdx + 1}</span>
                                        {out.passed ? <CheckCircle2 size={12} className="text-emerald-500" /> : <X size={12} className="text-red-500" />}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <div className="text-[9px] text-secondary/40 font-bold mb-1">Expected</div>
                                          <div className="text-xs font-mono text-secondary/80 bg-background/50 px-2 py-1 rounded truncate">{out.expected}</div>
                                        </div>
                                        <div>
                                          <div className="text-[9px] text-secondary/40 font-bold mb-1">Actual</div>
                                          <div className="text-xs font-mono text-secondary/80 bg-background/50 px-2 py-1 rounded truncate">{out.actual}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {q.explanation && (
                              <div className="bg-background/40 border border-secondary/5 p-4 rounded-md text-xs text-secondary/70 leading-relaxed mt-2 pl-6">
                                <div className="font-bold text-indigo-400 mb-1 flex items-center gap-1"><Info size={12} /> Explanation:</div>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      }

                      const selectedOpt = selectedAnswers[q.id];
                      const correctOpt = q.correctAnswer;
                      const isCorrect = selectedOpt !== undefined && correctOpt !== undefined && selectedOpt === correctOpt;

                      return (
                        <div key={q.id} className="p-6 bg-secondary/5 border border-secondary/10 rounded-xl space-y-4">
                          <div className="flex items-start gap-3">
                            <span className="text-sm font-bold text-secondary/40 mt-0.5">{idx + 1}.</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                                  q.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                                  'bg-red-500/10 text-red-400'
                                }`}>{q.difficulty}</span>
                                {isCorrect ? (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">Correct</span>
                                ) : (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-red-500/15 text-red-400">Incorrect</span>
                                )}
                              </div>
                              <p className="text-base font-bold text-secondary">{q.text}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                            {q.options && q.options.map((opt, oIdx) => {
                              const isSelected = selectedOpt === oIdx;
                              const isCorrectAnswer = correctOpt === oIdx;

                              let optClass = 'bg-secondary/5 border-secondary/10 text-secondary';
                              if (isSelected && isCorrectAnswer) {
                                optClass = 'bg-emerald-500/15 border-emerald-500 text-emerald-400';
                              } else if (isSelected && !isCorrectAnswer) {
                                optClass = 'bg-red-500/15 border-red-500 text-red-400';
                              } else if (isCorrectAnswer) {
                                optClass = 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400/80';
                              }

                              return (
                                <div key={oIdx} className={`px-4 py-3 rounded-md border text-sm font-semibold flex items-center gap-3 ${optClass}`}>
                                  <span className="text-xs font-bold text-secondary/40">{String.fromCharCode(65 + oIdx)}.</span>
                                  <span>{opt}</span>
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className="bg-background/40 border border-secondary/5 p-4 rounded-md text-xs text-secondary/70 leading-relaxed mt-2 pl-6">
                              <div className="font-bold text-indigo-400 mb-1 flex items-center gap-1"><Info size={12} /> Explanation:</div>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-6 border-t border-secondary/10 flex justify-end">
                    <button
                      onClick={() => {
                        setActiveTest(null);
                        setTestResultSummary(null);
                        setReviewMode(false);
                        loadData();
                      }}
                      className="px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-md transition-colors"
                    >
                      Finish Review
                    </button>
                  </div>
                </div>
              ) : (
                /* PREMIUM MCQ TEST PANEL */
                <>
                  {/* Header Bar */}
                  <div className="flex items-center justify-between pb-5 border-b border-secondary/10 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                        <BookOpen size={16} className="text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Live Assessment</p>
                        <h3 className="text-base font-bold text-secondary leading-tight">{activeTest.title}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Progress */}
                      <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-secondary/50">
                        <span>{Object.keys(selectedAnswers).length}/{questions.length} answered</span>
                        <div className="w-20 h-1.5 bg-secondary/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${(Object.keys(selectedAnswers).length / Math.max(questions.length, 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      {/* Timer */}
                      <div className={`px-3 py-2 rounded-lg border font-mono font-bold flex items-center gap-1.5 text-sm ${
                        timeLeft < 120
                          ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
                          : 'bg-secondary/5 border-secondary/10 text-secondary'
                      }`}>
                        <Clock size={14} />
                        <span>{formatTime(timeLeft)}</span>
                      </div>
                      <button
                        onClick={() => handleSubmitTest(false)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow text-sm transition-all"
                      >
                        Submit
                      </button>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-grow grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-5 py-5 overflow-y-auto no-scrollbar">
                    {/* Left: Question Card */}
                    <div className="space-y-5">
                      {/* Question Meta */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-secondary/40">
                            Q{currentQuestionIndex + 1} <span className="text-secondary/20">of</span> {questions.length}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            questions[currentQuestionIndex]?.difficulty === 'easy'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : questions[currentQuestionIndex]?.difficulty === 'medium'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {questions[currentQuestionIndex]?.difficulty}
                          </span>
                        </div>
                        {/* Mark for Review */}
                        <button
                          onClick={() => {
                            const qId = questions[currentQuestionIndex]?.id;
                            if (!qId) return;
                            setMarkedForReview(prev => {
                              const next = new Set(prev);
                              if (next.has(qId)) next.delete(qId); else next.add(qId);
                              return next;
                            });
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            markedForReview.has(questions[currentQuestionIndex]?.id)
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                              : 'border-secondary/10 text-secondary/40 hover:border-secondary/20 hover:text-secondary/60'
                          }`}
                        >
                          <Star size={11} fill={markedForReview.has(questions[currentQuestionIndex]?.id) ? 'currentColor' : 'none'} />
                          {markedForReview.has(questions[currentQuestionIndex]?.id) ? 'Marked' : 'Mark for Review'}
                        </button>
                      </div>

                      {questions[currentQuestionIndex]?.type === 'coding' ? (
                        /* PREMIUM CODING UI */
                        <div className="flex flex-col lg:flex-row gap-5">
                          {/* Left: Problem Details */}
                          <div className="lg:w-1/2 space-y-4">
                            <div className="bg-secondary/5 border border-secondary/10 rounded-xl px-5 py-4">
                              <h4 className="text-base font-bold text-secondary mb-3">Problem Statement</h4>
                              <p className="text-sm font-medium leading-relaxed text-secondary/80">
                                {questions[currentQuestionIndex]?.text}
                              </p>
                              
                              {/* Meta Details */}
                              <div className="mt-4 grid grid-cols-2 gap-3">
                                {questions[currentQuestionIndex]?.inputFormat && (
                                  <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-secondary/40 mb-1">Input Format</div>
                                    <p className="text-xs font-semibold text-secondary/70 leading-relaxed">{questions[currentQuestionIndex].inputFormat}</p>
                                  </div>
                                )}
                                {questions[currentQuestionIndex]?.outputFormat && (
                                  <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-secondary/40 mb-1">Output Format</div>
                                    <p className="text-xs font-semibold text-secondary/70 leading-relaxed">{questions[currentQuestionIndex].outputFormat}</p>
                                  </div>
                                )}
                              </div>
                              {questions[currentQuestionIndex]?.constraints && (
                                <div className="mt-3">
                                  <div className="text-[10px] font-black uppercase tracking-widest text-secondary/40 mb-1">Constraints</div>
                                  <p className="text-xs font-mono text-secondary/70">{questions[currentQuestionIndex].constraints}</p>
                                </div>
                              )}
                            </div>

                            {/* Sample Cases */}
                            {(() => {
                              const cq = questions[currentQuestionIndex];
                              let sampleCases: { input: string; output: string }[] = [];
                              try {
                                if (cq?.testCases) {
                                  const parsed = JSON.parse(cq.testCases);
                                  sampleCases = Array.isArray(parsed) ? parsed.slice(0, 2) : [];
                                }
                              } catch {}
                              if (sampleCases.length === 0 && cq?.sampleInput && cq?.sampleOutput) {
                                sampleCases = [{ input: cq.sampleInput, output: cq.sampleOutput }];
                              }
                              return sampleCases.length > 0 ? (
                                <div className="space-y-3">
                                  <div className="text-[10px] font-black uppercase tracking-widest text-secondary/40">Sample Cases</div>
                                  {sampleCases.map((sc, scIdx) => (
                                    <div key={scIdx} className="grid grid-cols-2 gap-3 bg-secondary/5 border border-secondary/10 rounded-xl p-3">
                                      <div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-secondary/40 mb-1.5">Input</div>
                                        <pre className="bg-background border border-secondary/10 rounded-lg px-3 py-2 text-xs font-mono text-secondary/80 overflow-auto whitespace-pre-wrap">{sc.input}</pre>
                                      </div>
                                      <div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-secondary/40 mb-1.5">Expected Output</div>
                                        <pre className="bg-background border border-secondary/10 rounded-lg px-3 py-2 text-xs font-mono text-secondary/80 overflow-auto whitespace-pre-wrap">{sc.output}</pre>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                          </div>

                          {/* Right: Code Editor & Execution */}
                          <div className="lg:w-1/2 flex flex-col gap-4">
                            <div className="bg-[#1e1e1e] border border-secondary/10 rounded-xl overflow-hidden flex-grow flex flex-col min-h-[300px]">
                              {/* Editor Header */}
                              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#252526]">
                                <div className="flex gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">JavaScript</span>
                                  <Terminal size={12} className="text-white/40" />
                                </div>
                              </div>
                              {/* Editor Area */}
                              <div className="flex-grow p-3 relative min-h-[250px]">
                                <textarea
                                  ref={editorRef}
                                  value={codingAnswers[questions[currentQuestionIndex].id] || ''}
                                  onChange={(e) => setCodingAnswers({
                                    ...codingAnswers,
                                    [questions[currentQuestionIndex].id]: e.target.value
                                  })}
                                  spellCheck={false}
                                  className="absolute inset-0 w-full h-full bg-transparent text-slate-300 font-mono text-sm leading-relaxed p-4 resize-none outline-none z-10"
                                />
                              </div>
                            </div>
                            
                            {/* Run Button */}
                            <div className="flex justify-end">
                              <button
                                onClick={() => runCodeTests(questions[currentQuestionIndex].id)}
                                disabled={testExecutionOutputs[questions[currentQuestionIndex].id]?.running}
                                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg transition-all shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
                              >
                                {testExecutionOutputs[questions[currentQuestionIndex].id]?.running ? (
                                  <>Running... <span className="animate-spin rounded-full border-2 border-white/20 border-t-white w-4 h-4" /></>
                                ) : (
                                  <>Run Code <Play size={14} fill="currentColor" /></>
                                )}
                              </button>
                            </div>

                            {/* Test Results Area */}
                            {testExecutionOutputs[questions[currentQuestionIndex].id] && !testExecutionOutputs[questions[currentQuestionIndex].id].running && (
                              <div className={`border rounded-xl p-4 ${
                                testExecutionOutputs[questions[currentQuestionIndex].id].runSuccess
                                  ? 'bg-emerald-500/5 border-emerald-500/20'
                                  : 'bg-red-500/5 border-red-500/20'
                              }`}>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-secondary/60 mb-3 flex items-center gap-2">
                                  Execution Results
                                  {testExecutionOutputs[questions[currentQuestionIndex].id].runSuccess ? (
                                    <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12} /> All Passed</span>
                                  ) : (
                                    <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12} /> Tests Failed</span>
                                  )}
                                </h4>
                                
                                {testExecutionOutputs[questions[currentQuestionIndex].id].error ? (
                                  <div className="bg-red-500/10 text-red-400 text-xs font-mono p-3 rounded-lg border border-red-500/20">
                                    {testExecutionOutputs[questions[currentQuestionIndex].id].error}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {testExecutionOutputs[questions[currentQuestionIndex].id].outputs.map((out, idx) => (
                                      <div key={idx} className={`p-2.5 rounded-lg border ${
                                        out.passed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
                                      }`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                                            out.passed ? 'text-emerald-500' : 'text-red-500'
                                          }`}>Test Case {idx + 1}</span>
                                          {out.passed ? <CheckCircle2 size={12} className="text-emerald-500" /> : <X size={12} className="text-red-500" />}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                          <div>
                                            <div className="text-[9px] text-secondary/40 font-bold mb-0.5">Expected</div>
                                            <div className="text-xs font-mono text-secondary/80 bg-background/50 px-2 py-1 rounded truncate">{out.expected}</div>
                                          </div>
                                          <div>
                                            <div className="text-[9px] text-secondary/40 font-bold mb-0.5">Actual</div>
                                            <div className="text-xs font-mono text-secondary/80 bg-background/50 px-2 py-1 rounded truncate">{out.actual}</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Question Text */}
                          <div className="bg-secondary/5 border border-secondary/10 rounded-xl px-6 py-5">
                            <p className="text-base font-semibold leading-relaxed text-secondary">
                              {questions[currentQuestionIndex]?.text}
                            </p>
                          </div>

                          {/* Answer Options */}
                          <div className="space-y-2.5">
                            {questions[currentQuestionIndex]?.options?.map((option, optIdx) => {
                              const isSelected = selectedAnswers[questions[currentQuestionIndex].id] === optIdx;
                              return (
                                <motion.button
                                  key={optIdx}
                                  whileHover={{ scale: 1.005 }}
                                  whileTap={{ scale: 0.998 }}
                                  onClick={() => setSelectedAnswers({ ...selectedAnswers, [questions[currentQuestionIndex].id]: optIdx })}
                                  className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-4 ${
                                    isSelected
                                      ? 'border-indigo-500 bg-indigo-500/8 text-secondary shadow-sm shadow-indigo-500/10'
                                      : 'border-secondary/10 bg-secondary/3 text-secondary/80 hover:border-secondary/25 hover:bg-secondary/6'
                                  }`}
                                >
                                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'bg-secondary/8 text-secondary/50'
                                  }`}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="flex-1 leading-relaxed">{option}</span>
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                                      <Check size={11} className="text-white" strokeWidth={3} />
                                    </div>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right: Question Nav Sidebar */}
                    <div className="lg:sticky lg:top-0 space-y-4">
                      <div className="bg-secondary/5 border border-secondary/10 rounded-xl p-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary/40 mb-3">Questions</h4>
                        <div className="grid grid-cols-5 gap-1.5">
                          {questions.map((q, idx) => {
                            const isCurrent = idx === currentQuestionIndex;
                            const isAnswered = q.type === 'coding' 
                              ? testExecutionOutputs[q.id]?.runSuccess === true
                              : selectedAnswers[q.id] !== undefined;
                            const isMarked = markedForReview.has(q.id);
                            return (
                              <button
                                key={q.id}
                                onClick={() => setCurrentQuestionIndex(idx)}
                                className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all relative ${
                                  isCurrent
                                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-600/30'
                                    : isAnswered
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    : 'bg-secondary/8 text-secondary/50 border border-secondary/10 hover:bg-secondary/12'
                                }`}
                                title={`Q${idx + 1}${isMarked ? ' (Marked)' : ''}${isAnswered ? ' (Answered)' : ''}`}
                              >
                                {idx + 1}
                                {isMarked && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border border-background" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="bg-secondary/5 border border-secondary/10 rounded-xl p-4 space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary/40 mb-2">Legend</h4>
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-secondary/50">
                          <div className="w-3 h-3 rounded-md bg-indigo-600 shrink-0" />
                          Current
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-secondary/50">
                          <div className="w-3 h-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 shrink-0" />
                          Answered
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-secondary/50">
                          <div className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                          Marked for Review
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-secondary/50">
                          <div className="w-3 h-3 rounded-md bg-secondary/8 border border-secondary/10 shrink-0" />
                          Not Visited
                        </div>
                      </div>

                      {/* Warning */}
                      <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 flex items-start gap-2">
                        <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={12} />
                        <p className="text-[10px] leading-relaxed text-red-300/70 font-medium">
                          Do not refresh or navigate away. Your test will auto-submit.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Navigation */}
                  <div className="border-t border-secondary/10 pt-4 flex items-center justify-between shrink-0">
                    <button
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                      className="px-4 py-2 border border-secondary/10 rounded-lg hover:bg-secondary/5 text-secondary disabled:opacity-30 disabled:cursor-not-allowed font-semibold flex items-center gap-2 text-sm transition-all"
                    >
                      <ChevronLeft size={15} /> Prev
                    </button>

                    <div className="text-xs font-bold text-secondary/30">
                      {currentQuestionIndex + 1} / {questions.length}
                    </div>

                    {currentQuestionIndex === questions.length - 1 ? (
                      <button
                        onClick={() => handleSubmitTest(false)}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md flex items-center gap-2 text-sm transition-all"
                      >
                        Finish & Submit <Check size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-2 text-sm transition-all"
                      >
                        Next <ChevronRight size={15} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
