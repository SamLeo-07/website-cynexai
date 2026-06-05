import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  Code, Terminal, Play, CheckCircle, ChevronRight, BarChart2, Check,
  BookOpen, Flame, Star, Zap, Trophy, RefreshCw, Lock, Unlock, Calendar, X
} from 'lucide-react';
import {
  getCodingProblems,
  createCodingProblem,
  createCodeSubmission,
  getSolvedProblemIds,
  CodingProblem,
  CodeSubmission,
  getUserProgress,
  updateUserProgress,
  UserProgress
} from '../lib/turso';
import { codingQuestionBank, nonCodingPracticeBank } from '../lib/questionBank';

const SUPPORTED_LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'ruby', 'php', 'sql', 'html'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

interface CodingPracticeProps {
  studentId: string;
  enrollments: {
    enrollment: { course_id: string };
    course: { id: string; title: string }
  }[];
}

interface TestRunResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
}

// ─── Auto-provision today's question from the bank ──────────────────────────
async function ensureDailyQuestion(enrollments: { course: { id: string; title: string } }[]): Promise<CodingProblem[]> {
  const todayStr = new Date().toISOString().split('T')[0];
  let problems = await getCodingProblems();

  // If student has no enrollments, fallback to generic coding
  if (!enrollments || enrollments.length === 0) {
    const hasToday = problems.some(p => p.id.startsWith(`auto_daily_${todayStr}_global`));
    if (!hasToday) {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const pick = codingQuestionBank[dayOfYear % codingQuestionBank.length];
      const newProblem: CodingProblem = {
        id: `auto_daily_${todayStr}_global_${pick.id}`,
        course_id: '',
        title: pick.title,
        description: pick.description,
        difficulty: pick.difficulty,
        boilerplate: pick.boilerplate,
        test_cases: pick.test_cases,
        constraints: pick.constraints,
        created_at: new Date().toISOString(),
      };
      await createCodingProblem(newProblem);
      problems = await getCodingProblems();
    }
    return problems;
  }

  // Generate a daily practice for each enrolled course if it doesn't exist
  let addedNew = false;
  for (const enr of enrollments) {
    const courseId = enr.course.id;
    const titleLower = enr.course.title.toLowerCase();
    
    const hasTodayForCourse = problems.some(p => p.id.startsWith(`auto_daily_${todayStr}_${courseId}`));
    if (!hasTodayForCourse) {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      
      // Determine if it's a non-coding course
      let matchedBank: any = null;
      for (const nc of nonCodingPracticeBank) {
        if (nc.courseTags.some(tag => titleLower.includes(tag))) {
          matchedBank = nonCodingPracticeBank;
          break;
        }
      }
      
      const bankToUse = matchedBank || codingQuestionBank;
      const pick = bankToUse[dayOfYear % bankToUse.length];

      const newProblem: CodingProblem = {
        id: `auto_daily_${todayStr}_${courseId}_${pick.id}`,
        course_id: courseId,
        title: pick.title,
        description: pick.description,
        difficulty: pick.difficulty,
        boilerplate: pick.boilerplate,
        test_cases: pick.test_cases,
        constraints: pick.constraints,
        created_at: new Date().toISOString(),
      };
      await createCodingProblem(newProblem);
      addedNew = true;
    }
  }

  if (addedNew) {
    problems = await getCodingProblems();
  }

  return problems;
}

export const CodingPractice: React.FC<CodingPracticeProps> = ({ studentId, enrollments }) => {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('javascript');
  const [editorCode, setEditorCode] = useState('');
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [dailyProblem, setDailyProblem] = useState<CodingProblem | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResults, setRunResults] = useState<TestRunResult[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<'success' | 'fail' | null>(null);
  const [xpGainedMsg, setXpGainedMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'results'>('description');
  const [practiceType, setPracticeType] = useState<'code' | 'quiz' | 'case_study'>('code');
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [caseStudyText, setCaseStudyText] = useState('');
  const [parsedBoilerplate, setParsedBoilerplate] = useState<any>({});

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalSolved = solvedIds.length;
  const easySolved = problems.filter(p => p.difficulty === 'easy' && solvedIds.includes(p.id)).length;
  const mediumSolved = problems.filter(p => p.difficulty === 'medium' && solvedIds.includes(p.id)).length;
  const hardSolved = problems.filter(p => p.difficulty === 'hard' && solvedIds.includes(p.id)).length;

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    try {
      const [allProblems, solved, progress] = await Promise.all([
        ensureDailyQuestion(enrollments),
        getSolvedProblemIds(studentId),
        getUserProgress(studentId),
      ]);

      setProblems(allProblems);
      setSolvedIds(solved);
      setUserProgress(progress);

      // Set daily problem - prefer one from their enrolled courses
      const todayStr = new Date().toISOString().split('T')[0];
      const enrolledCourseIds = enrollments.map(e => e.course.id);
      
      const daily = allProblems.find(p => p.id.startsWith(`auto_daily_${todayStr}_`) && enrolledCourseIds.includes(p.course_id))
        || allProblems.find(p => p.id.startsWith(`auto_daily_${todayStr}`))
        || allProblems.find(p => p.id.startsWith('auto_daily_'))
        || allProblems[0];
      setDailyProblem(daily || null);

      // Auto-select the daily challenge
      if (daily && !selectedProblem) {
        selectProblem(daily, 'javascript');
      }
    } catch (e) {
      console.error('Failed to load Daily Practice', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [studentId]);

  // ── Problem selection ─────────────────────────────────────────────────────
  const selectProblem = (prob: CodingProblem, lang: SupportedLanguage) => {
    setSelectedProblem(prob);
    setRunResults([]);
    setSubmissionStatus(null);
    setXpGainedMsg(null);
    setActiveTab('description');
    try {
      const boiler = JSON.parse(prob.boilerplate || '{}');
      setParsedBoilerplate(boiler);
      if (boiler.type === 'quiz') {
        setPracticeType('quiz');
        setQuizAnswers(new Array(boiler.questions?.length || 0).fill(-1));
      } else if (boiler.type === 'case_study') {
        setPracticeType('case_study');
        setCaseStudyText('');
      } else {
        setPracticeType('code');
        setEditorCode(boiler[lang] || getDefaultBoilerplate(lang, prob.title));
      }
    } catch {
      setParsedBoilerplate({});
      setPracticeType('code');
      setEditorCode(getDefaultBoilerplate(lang, prob.title));
    }
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    if (selectedProblem) selectProblem(selectedProblem, lang);
  };

  const getDefaultBoilerplate = (lang: string, title: string) => {
    const fn = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (lang === 'python') return `def ${fn}(input_val):\n    # Write your solution here\n    pass\n`;
    if (lang === 'java') return `public class Solution {\n    public static String ${fn}(String input) {\n        // Write your solution here\n        return input;\n    }\n}\n`;
    if (lang === 'cpp' || lang === 'c') return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`;
    if (lang === 'csharp') return `using System;\n\npublic class Solution {\n    public static void Main() {\n        // Write your solution here\n    }\n}\n`;
    if (lang === 'go') return `package main\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n}\n`;
    if (lang === 'rust') return `fn main() {\n    // Write your solution here\n}\n`;
    if (lang === 'ruby') return `def ${fn}(input_val)\n  # Write your solution here\nend\n`;
    if (lang === 'php') return `<?php\nfunction ${fn}($input_val) {\n    // Write your solution here\n}\n?>\n`;
    if (lang === 'sql') return `-- Write your SQL query here\nSELECT * FROM table_name;\n`;
    if (lang === 'html') return `<!DOCTYPE html>\n<html>\n<head>\n  <title>Solution</title>\n</head>\n<body>\n  <!-- Write your HTML here -->\n</body>\n</html>\n`;
    return `function ${fn}(input) {\n    // Write your solution here\n    return input;\n}\n`;
  };

  // ── Mock execution ────────────────────────────────────────────────────────
  const mockExecute = (code: string, problem: CodingProblem): TestRunResult[] => {
    let testCases: any[] = [];
    try { testCases = JSON.parse(problem.test_cases || '[]'); } catch { testCases = []; }
    const hasEdited = code.length > 80 && !code.toLowerCase().includes('write your solution here') && !code.toLowerCase().includes('write your code here');
    return testCases.map((tc: any, i: number) => {
      const passed = hasEdited;
      return {
        passed,
        input: tc.input || 'N/A',
        expected: tc.expected_output || 'N/A',
        actual: passed ? (tc.expected_output || 'N/A') : 'Wrong Answer',
      };
    });
  };

  const handleRunCode = async () => {
    if (!selectedProblem) return;
    setRunning(true);
    setActiveTab('results');
    await new Promise(r => setTimeout(r, 1200));
    setRunResults(mockExecute(editorCode, selectedProblem));
    setRunning(false);
  };

  const handleSubmitCode = async () => {
    if (!selectedProblem) return;
    setSubmitting(true);
    setSubmissionStatus(null);
    setXpGainedMsg(null);
    try {
      let allPassed = false;
      let finalResults: TestRunResult[] = [];

      if (practiceType === 'code') {
        const results = runResults.length > 0 ? runResults : mockExecute(editorCode, selectedProblem);
        if (runResults.length === 0) setRunResults(results);
        allPassed = results.every(r => r.passed);
        finalResults = results;
      } else if (practiceType === 'quiz') {
        allPassed = true;
        const questions = parsedBoilerplate.questions || [];
        questions.forEach((q: any, i: number) => {
          if (quizAnswers[i] !== q.correct) {
            allPassed = false;
          }
        });
      } else if (practiceType === 'case_study') {
        allPassed = caseStudyText.trim().split(' ').length >= 20; // Require at least 20 words
      }

      const sub: CodeSubmission = {
        id: crypto.randomUUID(),
        student_id: studentId,
        problem_id: selectedProblem.id,
        code: practiceType === 'code' ? editorCode : practiceType === 'quiz' ? JSON.stringify(quizAnswers) : caseStudyText,
        language: practiceType === 'code' ? language : practiceType,
        status: allPassed ? 'accepted' : 'wrong_answer',
        runtime_ms: Math.floor(Math.random() * 80) + 10,
        submitted_at: new Date().toISOString(),
      };
      await createCodeSubmission(sub);

      if (allPassed) {
        setSubmissionStatus('success');
        setActiveTab('results');
        if (userProgress && !solvedIds.includes(selectedProblem.id)) {
          let pts = selectedProblem.difficulty === 'easy' ? 50 : selectedProblem.difficulty === 'medium' ? 100 : 200;
          if (dailyProblem?.id === selectedProblem.id) pts += 50;
          const updated: UserProgress = {
            ...userProgress,
            xpPoints: userProgress.xpPoints + pts,
            currentStreak: userProgress.currentStreak + 1,
            longestStreak: Math.max(userProgress.longestStreak, userProgress.currentStreak + 1),
            totalSolved: userProgress.totalSolved + 1,
          };
          await updateUserProgress(updated);
          setUserProgress(updated);
          setSolvedIds(prev => [...prev, selectedProblem.id]);
          setXpGainedMsg(`+${pts} XP earned!${dailyProblem?.id === selectedProblem.id ? ' (includes +50 Daily Bonus 🔥)' : ''}`);
        }
      } else {
        setSubmissionStatus('fail');
        setActiveTab('results');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProblems = problems.filter(p =>
    difficultyFilter === 'all' || p.difficulty === difficultyFilter
  );

  const diffColor = (d?: string) =>
    d === 'easy' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
      : d === 'medium' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
        : 'text-red-500 bg-red-500/10 border-red-500/20';

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-secondary/10 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-secondary/40 uppercase tracking-widest animate-pulse">Loading Daily Practice...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-0">

      {/* ── Header Bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-secondary tracking-tight flex items-center gap-3">
            <Code size={24} className="text-indigo-400" />
            Daily Practice
          </h2>
          <p className="text-sm text-secondary/50 mt-0.5 font-medium">LeetCode-style problems • 1 new question every day</p>
        </div>

        {/* XP + Streak Pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-md px-4 py-2">
            <Flame size={16} className="text-amber-500" />
            <span className="font-black text-amber-500 text-sm">{userProgress?.currentStreak ?? 0} day streak</span>
          </div>
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-md px-4 py-2">
            <Zap size={16} className="text-indigo-400" />
            <span className="font-black text-indigo-400 text-sm">{userProgress?.xpPoints?.toLocaleString() ?? 0} XP</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Solved', value: totalSolved, color: 'text-secondary', bg: 'bg-secondary/5 border-secondary/10' },
          { label: 'Easy', value: easySolved, color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/20' },
          { label: 'Medium', value: mediumSolved, color: 'text-amber-500', bg: 'bg-amber-500/5 border-amber-500/20' },
          { label: 'Hard', value: hardSolved, color: 'text-red-500', bg: 'bg-red-500/5 border-red-500/20' },
        ].map(stat => (
          <div key={stat.label} className={`border rounded-md p-3 text-center ${stat.bg}`}>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main Split Layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">

        {/* LEFT: Problem List ────────────────────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-3">

          {/* Today's Challenge Banner */}
          {dailyProblem && (
            <button
              onClick={() => selectProblem(dailyProblem, language)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedProblem?.id === dailyProblem.id
                  ? 'border-indigo-600 bg-indigo-500/10'
                  : 'border-amber-400/50 bg-amber-400/5 hover:bg-amber-400/10'
                }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar size={8} /> Today's Challenge
                </span>
              </div>
              <p className="font-bold text-secondary text-sm truncate">{dailyProblem.title}</p>
              <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${diffColor(dailyProblem.difficulty)}`}>
                {dailyProblem.difficulty}
              </span>
            </button>
          )}

          {/* Filter */}
          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value as any)}
            className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-3 py-2 text-xs font-bold text-secondary/70 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* Problem list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[480px] pr-0.5 no-scrollbar">
            {filteredProblems.length === 0 ? (
              <div className="py-10 text-center">
                <BookOpen className="w-8 h-8 text-secondary/20 mx-auto mb-2" />
                <p className="text-xs font-bold text-secondary/30 uppercase tracking-wider">Loading problems...</p>
                <button onClick={loadAll} className="mt-3 text-xs text-indigo-400 font-bold flex items-center gap-1 mx-auto">
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
            ) : (
              filteredProblems.map(prob => {
                const isSolved = solvedIds.includes(prob.id);
                const isSelected = selectedProblem?.id === prob.id;
                const isDaily = dailyProblem?.id === prob.id;
                return (
                  <button
                    key={prob.id}
                    onClick={() => selectProblem(prob, language)}
                    className={`w-full text-left p-3 rounded-md border transition-all flex items-center gap-3 ${isSelected
                        ? 'border-indigo-600 bg-indigo-500/10'
                        : 'border-secondary/8 hover:border-secondary/20 hover:bg-secondary/5'
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-400' : 'text-secondary'}`}>
                        {prob.title}
                      </p>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${diffColor(prob.difficulty)}`}>
                        {prob.difficulty}
                      </span>
                    </div>
                    {isSolved ? (
                      <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-secondary/30 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Problem + Editor ────────────────────────────────────────── */}
        <div className="lg:col-span-9 flex flex-col gap-4 min-h-0">
          {selectedProblem ? (
            <>
              {/* Problem Header */}
              <div className="flex items-center justify-between flex-wrap gap-3 bg-background-100 border border-secondary/10 rounded-xl px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${diffColor(selectedProblem.difficulty)}`}>
                    {selectedProblem.difficulty}
                  </span>
                  {dailyProblem?.id === selectedProblem.id && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-400 text-amber-900 border border-amber-500/30 flex items-center gap-1">
                      <Calendar size={9} /> Daily
                    </span>
                  )}
                  {solvedIds.includes(selectedProblem.id) && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle size={9} /> Solved
                    </span>
                  )}
                </div>
                <div className="flex gap-1 bg-secondary/8 p-1 rounded-md overflow-x-auto max-w-[50vw] no-scrollbar">
                  {practiceType === 'code' ? (
                    SUPPORTED_LANGUAGES.map(lang => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        className={`px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${language === lang ? 'bg-secondary text-background shadow' : 'text-secondary/50 hover:text-secondary'}`}
                      >
                        {lang === 'javascript' ? 'JS' : lang}
                      </button>
                    ))
                  ) : (
                    <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-secondary/70">
                      {practiceType === 'quiz' ? 'Multiple Choice Quiz' : 'Case Study Analysis'}
                    </span>
                  )}
                </div>
              </div>

              {/* Problem Description + Editor Split */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0">

                {/* Description Panel */}
                <div className="bg-background-100 border border-secondary/10 rounded-xl p-6 overflow-y-auto max-h-[520px] no-scrollbar">
                  <h3 className="text-xl font-black text-secondary mb-3">{selectedProblem.title}</h3>
                  <p className="text-secondary/70 text-sm leading-relaxed font-medium mb-5 whitespace-pre-line">
                    {selectedProblem.description}
                  </p>

                  {selectedProblem.constraints && (
                    <div className="mb-5">
                      <h5 className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-2">Constraints</h5>
                      <pre className="bg-secondary/5 border border-secondary/8 text-xs font-mono p-3 rounded-md text-secondary/70 whitespace-pre-wrap">
                        {selectedProblem.constraints}
                      </pre>
                    </div>
                  )}

                  {practiceType === 'code' && (
                    <div>
                      <h5 className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-3">Sample Test Cases</h5>
                      <div className="space-y-2">
                        {(() => {
                          try {
                            const tc = JSON.parse(selectedProblem.test_cases || '[]');
                            return tc.slice(0, 2).map((c: any, i: number) => (
                              <div key={i} className="bg-secondary/5 border border-secondary/8 rounded-md p-4 text-xs font-mono">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-[9px] font-black text-secondary/40 uppercase tracking-wider block mb-1">Input</span>
                                    <span className="text-secondary/80 break-all">{c.input}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-black text-secondary/40 uppercase tracking-wider block mb-1">Expected Output</span>
                                    <span className="text-indigo-400 font-bold break-all">{c.expected_output}</span>
                                  </div>
                                </div>
                              </div>
                            ));
                          } catch { return <span className="text-xs text-secondary/30">No test cases.</span>; }
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Editor Panel */}
                <div className="flex flex-col gap-3">
                  {/* Interactive Area */}
                  {practiceType === 'code' ? (
                    <div className="border border-secondary/10 rounded-xl overflow-hidden flex-1 min-h-[300px]">
                      <Editor
                        height="300px"
                        language={language}
                        theme="vs-dark"
                        value={editorCode}
                        onChange={val => setEditorCode(val || '')}
                        options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
                      />
                    </div>
                  ) : practiceType === 'quiz' ? (
                    <div className="border border-secondary/10 rounded-xl p-4 flex-1 overflow-y-auto space-y-4 max-h-[400px]">
                      <h4 className="font-bold text-secondary text-sm">Quiz Questions</h4>
                      {parsedBoilerplate.questions?.map((q: any, i: number) => (
                        <div key={i} className="bg-secondary/5 border border-secondary/10 rounded-lg p-4">
                          <p className="text-secondary/90 font-medium text-xs mb-3">{i + 1}. {q.text}</p>
                          <div className="space-y-2">
                            {q.options.map((opt: string, optIdx: number) => (
                              <label key={optIdx} className="flex items-center gap-3 text-xs text-secondary/70 cursor-pointer bg-background-100 p-2 rounded border border-transparent hover:border-secondary/20 transition-all">
                                <input
                                  type="radio"
                                  name={`quiz-${i}`}
                                  checked={quizAnswers[i] === optIdx}
                                  onChange={() => {
                                    const newAnswers = [...quizAnswers];
                                    newAnswers[i] = optIdx;
                                    setQuizAnswers(newAnswers);
                                  }}
                                  className="accent-indigo-500 w-4 h-4"
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-secondary/10 rounded-xl flex-1 min-h-[300px] flex flex-col p-4 bg-background-100">
                      <label className="text-xs font-bold text-secondary/60 uppercase mb-2">Your Analysis / Answer</label>
                      <textarea
                        value={caseStudyText}
                        onChange={(e) => setCaseStudyText(e.target.value)}
                        placeholder="Write your analysis here. Must be at least 20 words."
                        className="flex-1 w-full bg-secondary/5 border border-secondary/10 rounded-lg p-3 text-sm text-secondary focus:outline-none focus:border-indigo-500/50 resize-none font-mono"
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-2">
                    {practiceType === 'code' && (
                      <button
                        onClick={handleRunCode}
                        disabled={running || submitting}
                        className="flex-1 py-3 border border-secondary/20 hover:bg-secondary/5 text-secondary font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Play size={14} className={running ? 'animate-pulse' : ''} />
                        {running ? 'Running...' : 'Run Code'}
                      </button>
                    )}
                    <button
                      onClick={handleSubmitCode}
                      disabled={submitting || running || (practiceType === 'quiz' && quizAnswers.includes(-1))}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-900/10"
                    >
                      <Check size={14} className={submitting ? 'animate-pulse' : ''} />
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>

                  {/* Results / Feedback */}
                  <AnimatePresence>
                    {xpGainedMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 font-bold text-sm"
                      >
                        <Trophy size={18} className="shrink-0" />
                        {xpGainedMsg}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {runResults.length > 0 && (
                    <div className="bg-background-100 border border-secondary/10 rounded-xl p-4 space-y-3 max-h-[200px] overflow-y-auto no-scrollbar">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Test Results</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${runResults.every(r => r.passed) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {runResults.every(r => r.passed) ? '✓ All Passed' : '✗ Some Failed'}
                        </span>
                      </div>
                      {runResults.map((res, i) => (
                        <div key={i} className={`p-3 rounded-xl text-xs font-mono border ${res.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-secondary">Case #{i + 1}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${res.passed ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                              {res.passed ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div><span className="text-secondary/40 block">Input</span><span className="text-secondary/80">{res.input}</span></div>
                            <div><span className="text-secondary/40 block">Expected</span><span className="text-indigo-400">{res.expected}</span></div>
                            <div><span className="text-secondary/40 block">Got</span><span className={res.passed ? 'text-emerald-500' : 'text-red-400'}>{res.actual}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {submissionStatus && !xpGainedMsg && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-md text-sm font-bold text-center border ${submissionStatus === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                    >
                      {submissionStatus === 'success'
                        ? '🎉 All test cases passed! Great solution!'
                        : '❌ Wrong Answer — check the test cases and try again.'}
                    </motion.div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background-100 border border-secondary/10 rounded-xl p-16 text-center">
              <div>
                <Code className="w-14 h-14 mx-auto mb-4 text-secondary/20" />
                <p className="text-lg font-bold text-secondary/40">Select a problem to get started</p>
                <p className="text-sm text-secondary/30 font-medium mt-1">Your daily challenge is highlighted above</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
