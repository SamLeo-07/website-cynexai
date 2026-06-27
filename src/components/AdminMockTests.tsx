import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, ClipboardList, AlertCircle, CheckCircle2,
  Edit2, Trash2, HelpCircle, Download,
  Upload, FileSpreadsheet, Clock, BookOpen, Layers,
  ChevronRight, ArrowLeft, Sparkles, RefreshCw, Check,
  Search, Copy, Link, Star, Wand2, FileText,
  Shield, AlertTriangle, TrendingUp, Activity, Award
} from 'lucide-react';
import {
  getMockTests, createMockTest, deleteMockTest, updateMockTest,
  getQuestions, addQuestion, deleteQuestion, updateQuestion,
  getTestResults, getCourses, getBatches,
  MockTest, Question, TestResult, Course, Batch, ProctoringLog
} from '../lib/turso';
import { generateMockTestQuestions, fixSpellingAndGrammar, translateQuestions, addAnswerExplanationsAI, makeSimple, changeQuestionFormat } from '../lib/gemini';

const AdminMockTests = () => {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedResultReport, setSelectedResultReport] = useState<TestResult | null>(null);
  const [reportTab, setReportTab] = useState<'proctoring' | 'confidence'>('proctoring');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<MockTest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Question[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'results'>('questions');
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [aiGeneratePrompt, setAiGeneratePrompt] = useState('');
  const [isGeneratingSidebar, setIsGeneratingSidebar] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
    duration: 60,
    category: 'Technical',
    totalQuestions: 10,
    isActive: true,
    course_id: '',
    batch_id: '',
    language: 'English'
  });
  const [questionForm, setQuestionForm] = useState({
    text: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    type: 'mcq' as 'mcq' | 'coding' | 'short-answer' | 'true-false' | 'sql',
    options: ['', '', '', ''],
    correctAnswer: 0,
    correctAnswerText: '',
    boilerplate: '',
    testCases: '',
    explanation: ''
  });

  // CYNEX AI Generation State
  const [cynexAiTab, setCynexAiTab] = useState<'file' | 'slides' | 'text'>('file');
  const [cynexAiNumQuestions, setCynexAiNumQuestions] = useState<string>('Automatic');
  const [cynexAiLanguage, setCynexAiLanguage] = useState<string>('English');
  const [cynexAiTextContent, setCynexAiTextContent] = useState<string>('');
  const [cynexAiFileName, setCynexAiFileName] = useState<string>('');
  const [cynexAiCourseId, setCynexAiCourseId] = useState<string>('');
  const [cynexAiQuizTitle, setCynexAiQuizTitle] = useState<string>('');
  const [cynexIsGenerating, setCynexIsGenerating] = useState<boolean>(false);
  const [isAIActionRunning, setIsAIActionRunning] = useState(false);
  const [activeAIActionName, setActiveAIActionName] = useState('');
  const [translateLanguage, setTranslateLanguage] = useState('Hindi');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTestId) loadQuestions();
  }, [selectedTestId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, r, c, b] = await Promise.all([getMockTests(), getTestResults(), getCourses(true), getBatches()]);
      setTests(t);
      setResults(r);
      setCourses(c);
      setBatches(b);
      // Do not auto-select so we see the dashboard by default
      setSelectedTestId(prev => (prev && t.some(x => x.id === prev) ? prev : null));
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    if (!selectedTestId) return;
    try {
      const q = await getQuestions(selectedTestId, true);
      setQuestions(q);
    } catch {
      setError('Failed to load questions');
    }
  };

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.title.trim()) { setError('Title required'); return; }
    try {
      if (editingTest) {
        await updateMockTest({
          ...editingTest,
          title: testForm.title.trim(),
          description: testForm.description.trim(),
          duration: testForm.duration,
          category: testForm.category,
          totalQuestions: testForm.totalQuestions,
          isActive: testForm.isActive,
          course_id: testForm.course_id || undefined,
          batch_id: testForm.batch_id || undefined,
          language: testForm.language
        });
        setSuccess('Test updated');
      } else {
        const newTestId = `test_${Date.now()}`;
        await createMockTest({
          id: newTestId,
          title: testForm.title.trim(),
          description: testForm.description.trim(),
          duration: testForm.duration,
          category: testForm.category,
          totalQuestions: testForm.totalQuestions,
          isActive: testForm.isActive,
          course_id: testForm.course_id || undefined,
          batch_id: testForm.batch_id || undefined,
          language: testForm.language
        });
        setSuccess('Test created');
        setSelectedTestId(newTestId);
      }
      setIsTestModalOpen(false);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save test');
    }
  };



  const handleDeleteTest = async (id: string) => {
    if (!window.confirm('Delete this test and all its questions?')) return;
    try {
      await deleteMockTest(id);
      setTests(tests.filter(t => t.id !== id));
      if (selectedTestId === id) setSelectedTestId(null);
      setSuccess('Test deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete');
    }
  };

  const handleGenerateQuiz = async () => {
    if (cynexAiTab === 'file' && !cynexAiFileName) {
      setError('Please upload a file first');
      return;
    }
    if (cynexAiTab === 'slides' && !cynexAiFileName) {
      setError('Please import Powerpoint slides first');
      return;
    }
    if (cynexAiTab === 'text' && !cynexAiTextContent.trim()) {
      setError('Please enter source text first');
      return;
    }

    const testTitle = cynexAiQuizTitle.trim() || (cynexAiFileName ? cynexAiFileName.replace(/\.[^/.]+$/, "") : "AI Generated Test");
    const numQ = cynexAiNumQuestions === 'Automatic' ? 5 : parseInt(cynexAiNumQuestions);
    const language = cynexAiLanguage;

    // Build the AI prompt from whatever context the user has provided
    const aiPromptContext = cynexAiTab === 'text'
      ? cynexAiTextContent.trim()
      : `${testTitle} ${cynexAiFileName}`.trim();

    setCynexIsGenerating(true);
    setSuccess(`✨ CYNEX AI is analyzing "${aiPromptContext.slice(0, 60)}..." and generating ${numQ} questions in ${language}...`);
    setError(null);

    try {
      // Call real Gemini AI with the user's topic/content as context
      const generatedQs = await generateMockTestQuestions(
        aiPromptContext,
        numQ,
        'medium',
        language
      );

      if (!generatedQs || generatedQs.length === 0) {
        throw new Error('Gemini returned no questions. Please refine your prompt and try again.');
      }

      const testId = `test_${Date.now()}`;
      const newTest: MockTest = {
        id: testId,
        title: testTitle,
        description: `Auto-generated by CYNEX AI · Topic: "${aiPromptContext.slice(0, 80)}" · Language: ${language}`,
        duration: numQ * 2,
        category: 'AI Generated',
        totalQuestions: generatedQs.length,
        isActive: true,
        course_id: cynexAiCourseId || undefined,
        language: language,
        createdAt: new Date().toISOString()
      };

      await createMockTest(newTest);

      for (let i = 0; i < generatedQs.length; i++) {
        const sq = generatedQs[i];
        const newQuestion: Question = {
          id: `q_ai_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
          testId: testId,
          text: sq.text,
          options: sq.options,
          correctAnswer: sq.correctAnswer,
          difficulty: sq.difficulty || 'medium',
          type: 'mcq',
          explanation: sq.explanation,
          isApproved: true
        };
        await addQuestion(newQuestion);
      }

      await loadData();
      setSuccess(`✓ CYNEX AI successfully created "${testTitle}" with ${generatedQs.length} real AI-generated questions!`);

      setCynexAiFileName('');
      setCynexAiTextContent('');
      setCynexAiQuizTitle('');
      setCynexAiCourseId('');

      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      console.error('CYNEX AI Quiz Generation Error:', e);
      setError(`AI generation failed: ${e?.message || 'Unknown error. Check your Gemini API key in .env (VITE_GEMINI_API_KEY).'}`);
    } finally {
      setCynexIsGenerating(false);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId || !questionForm.text.trim()) {
      setError('Question text is required');
      return;
    }
    try {
      if (editingQuestion) {
        const updatedQuestion: Question = {
          ...editingQuestion,
          text: questionForm.text.trim(),
          options: questionForm.type === 'mcq' ? questionForm.options.filter(o => o.trim()) : undefined,
          correctAnswer: (questionForm.type === 'mcq' || questionForm.type === 'true-false') ? questionForm.correctAnswer : undefined,
          correctAnswerText: (questionForm.type === 'short-answer' || questionForm.type === 'sql') ? questionForm.correctAnswerText.trim() : undefined,
          boilerplate: questionForm.type === 'coding' ? questionForm.boilerplate : undefined,
          testCases: questionForm.type === 'coding' ? questionForm.testCases : undefined,
          difficulty: questionForm.difficulty,
          type: questionForm.type,
          explanation: questionForm.explanation.trim() || undefined,
        };
        await updateQuestion(updatedQuestion);
        setQuestions(questions.map(q => q.id === editingQuestion.id ? updatedQuestion : q));
        setSuccess('Question updated');
        setEditingQuestion(null);
      } else {
        const newQuestion: Question = {
          id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          testId: selectedTestId,
          text: questionForm.text.trim(),
          options: questionForm.type === 'mcq' ? questionForm.options.filter(o => o.trim()) : undefined,
          correctAnswer: (questionForm.type === 'mcq' || questionForm.type === 'true-false') ? questionForm.correctAnswer : undefined,
          correctAnswerText: (questionForm.type === 'short-answer' || questionForm.type === 'sql') ? questionForm.correctAnswerText.trim() : undefined,
          boilerplate: questionForm.type === 'coding' ? questionForm.boilerplate : undefined,
          testCases: questionForm.type === 'coding' ? questionForm.testCases : undefined,
          difficulty: questionForm.difficulty,
          type: questionForm.type,
          explanation: questionForm.explanation.trim() || undefined,
          isApproved: true
        };
        await addQuestion(newQuestion);
        setQuestions([...questions, newQuestion]);

        // Increment mock test totalQuestions
        const testToUpdate = tests.find(t => t.id === selectedTestId);
        if (testToUpdate) {
          const updatedTest = { ...testToUpdate, totalQuestions: (testToUpdate.totalQuestions || 0) + 1 };
          await updateMockTest(updatedTest);
          setTests(tests.map(t => t.id === selectedTestId ? updatedTest : t));
        }

        setSuccess('Question added');
      }
      setIsQuestionModalOpen(false);
      setQuestionForm({
        text: '', difficulty: 'easy', type: 'mcq',
        options: ['', '', '', ''], correctAnswer: 0, correctAnswerText: '', boilerplate: '', testCases: '', explanation: ''
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save question');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteQuestion(id);
      setQuestions(questions.filter(q => q.id !== id));

      // Decrement mock test totalQuestions
      const testToUpdate = tests.find(t => t.id === selectedTestId);
      if (testToUpdate) {
        const updatedTest = { ...testToUpdate, totalQuestions: Math.max(0, (testToUpdate.totalQuestions || 0) - 1) };
        await updateMockTest(updatedTest);
        setTests(tests.map(t => t.id === selectedTestId ? updatedTest : t));
      }

      setSuccess('Question deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete question');
    }
  };

  const handleDuplicateQuestion = async (q: Question) => {
    try {
      const duplicated: Question = {
        ...q,
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        text: `${q.text} (Copy)`,
      };
      await addQuestion(duplicated);
      setQuestions([...questions, duplicated]);

      // Increment mock test totalQuestions
      const testToUpdate = tests.find(t => t.id === selectedTestId);
      if (testToUpdate) {
        const updatedTest = { ...testToUpdate, totalQuestions: (testToUpdate.totalQuestions || 0) + 1 };
        await updateMockTest(updatedTest);
        setTests(tests.map(t => t.id === selectedTestId ? updatedTest : t));
      }

      setSuccess('Question duplicated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to duplicate question');
    }
  };

  const handleAISidebarGenerate = async () => {
    if (!aiGeneratePrompt.trim()) return;
    if (!selectedTestId) {
      setError('Please select a test first before generating questions.');
      return;
    }
    setIsGeneratingSidebar(true);
    setError(null);

    // Parse difficulty from the prompt
    const promptLower = aiGeneratePrompt.toLowerCase();
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (promptLower.includes('easy') || promptLower.includes('beginner')) difficulty = 'easy';
    else if (promptLower.includes('hard') || promptLower.includes('advanced') || promptLower.includes('difficult')) difficulty = 'hard';

    // Parse number of questions from prompt (e.g. "5 questions on Python")
    let numToGenerate = 5;
    const numMatch = promptLower.match(/(\d+)\s*question/);
    if (numMatch) numToGenerate = Math.min(Math.max(parseInt(numMatch[1]), 1), 20);

    try {
      // Use real Gemini AI
      const aiQs = await generateMockTestQuestions(
        aiGeneratePrompt,
        numToGenerate,
        difficulty
      );

      if (!aiQs || aiQs.length === 0) {
        throw new Error('Gemini returned no questions.');
      }

      const questionsToAdd: Question[] = aiQs.map((q, i) => ({
        id: `q_ai_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        testId: selectedTestId!,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty || difficulty,
        type: 'mcq',
        explanation: q.explanation,
        isApproved: true
      }));

      for (const q of questionsToAdd) {
        await addQuestion(q);
      }

      // Update totalQuestions count on the test
      const testToUpdate = tests.find(t => t.id === selectedTestId);
      if (testToUpdate) {
        const updatedTest = { ...testToUpdate, totalQuestions: (testToUpdate.totalQuestions || 0) + questionsToAdd.length };
        await updateMockTest(updatedTest);
        setTests(tests.map(t => t.id === selectedTestId ? updatedTest : t));
      }

      setQuestions(prev => [...prev, ...questionsToAdd]);
      setAiGeneratePrompt('');
      setSuccess(`✓ CYNEX AI generated ${questionsToAdd.length} real ${difficulty} questions on "${aiGeneratePrompt.slice(0, 50)}"!`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      console.error('CYNEX AI Sidebar Generate Error:', e);
      setError(`AI generation failed: ${e?.message || 'Check your VITE_GEMINI_API_KEY in .env'}`);
    } finally {
      setIsGeneratingSidebar(false);
    }
  };

  const handleAIAction = async (actionName: string) => {
    if (!selectedTestId || questions.length === 0) {
      setError('Please open a test with at least one question before using AI tools.');
      return;
    }
    setIsAIActionRunning(true);
    setActiveAIActionName(actionName);
    setError(null);
    setSuccess(`✨ CYNEX AI: Running "${actionName}" on ${questions.length} question(s)...`);

    try {
      let patches: { id: string; text?: string; options?: string[]; explanation?: string }[] = [];

      const qInput = questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        explanation: q.explanation,
        correctAnswer: q.correctAnswer
      }));

      if (actionName === 'Fix spelling & grammar') {
        patches = await fixSpellingAndGrammar(qInput);
      } else if (actionName === 'Translate') {
        patches = await translateQuestions(qInput, translateLanguage);
      } else if (actionName === 'Add answer explanations') {
        patches = await addAnswerExplanationsAI(qInput);
      } else if (actionName === 'Make simple') {
        patches = await makeSimple(qInput);
      } else if (actionName === 'Change format') {
        patches = await changeQuestionFormat(qInput);
      }

      if (!patches || patches.length === 0) {
        throw new Error('Gemini returned no patches.');
      }

      // Apply patches: update each question in DB and local state
      const updatedQuestions = [...questions];
      for (const patch of patches) {
        const idx = updatedQuestions.findIndex(q => q.id === patch.id);
        if (idx === -1) continue;
        const updated: Question = {
          ...updatedQuestions[idx],
          ...(patch.text !== undefined ? { text: patch.text } : {}),
          ...(patch.options !== undefined ? { options: patch.options } : {}),
          ...(patch.explanation !== undefined ? { explanation: patch.explanation } : {}),
        };
        updatedQuestions[idx] = updated;
        try {
          await updateQuestion(updated);
        } catch (e) {
          console.warn(`Could not save patch for question ${patch.id}:`, e);
        }
      }

      setQuestions(updatedQuestions);
      setSuccess(`✓ CYNEX AI: "${actionName}" applied to ${patches.length} question(s) successfully!`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      console.error('CYNEX AI Action Error:', e);
      setError(`AI action "${actionName}" failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsAIActionRunning(false);
      setActiveAIActionName('');
    }
  };

  const filteredResults = results.filter(r => r.testId === selectedTestId);

  // ─── CSV/Sheets Question Import ───────────────────────────────────────────
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    setCsvPreview([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { setCsvError('CSV must have a header row + at least one question row.'); return; }
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        const reqCols = ['question', 'option1', 'option2', 'option3', 'option4', 'correctanswer'];
        const missing = reqCols.filter(c => !headers.includes(c));
        if (missing.length) { setCsvError(`Missing columns: ${missing.join(', ')}. See template.`); return; }
        const parsed: Question[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
          const get = (col: string) => cols[headers.indexOf(col)] || '';
          const correctRaw = parseInt(get('correctanswer')) - 1; // 1-indexed → 0-indexed
          if (isNaN(correctRaw) || correctRaw < 0 || correctRaw > 3) { setCsvError(`Row ${i + 1}: correctAnswer must be 1-4.`); return; }
          const diff = (get('difficulty') || 'easy').toLowerCase() as 'easy'|'medium'|'hard';
          parsed.push({
            id: `q_csv_${Date.now()}_${i}`,
            testId: selectedTestId!,
            text: get('question'),
            options: [get('option1'), get('option2'), get('option3'), get('option4')],
            correctAnswer: correctRaw,
            difficulty: ['easy','medium','hard'].includes(diff) ? diff : 'easy',
            type: 'mcq',
            explanation: get('explanation') || undefined,
            isApproved: true
          });
        }
        setCsvPreview(parsed);
      } catch (err) { setCsvError('Failed to parse CSV. Check the format.'); }
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!selectedTestId || csvPreview.length === 0) return;
    setCsvUploading(true);
    try {
      for (const q of csvPreview) {
        await addQuestion({ ...q, id: `q_csv_${Date.now()}_${Math.random().toString(36).substr(2,5)}` });
      }
      setQuestions(prev => [...prev, ...csvPreview]);

      // Update mock test totalQuestions
      const testToUpdate = tests.find(t => t.id === selectedTestId);
      if (testToUpdate) {
        const updatedTest = { ...testToUpdate, totalQuestions: (testToUpdate.totalQuestions || 0) + csvPreview.length };
        await updateMockTest(updatedTest);
        setTests(tests.map(t => t.id === selectedTestId ? updatedTest : t));
      }

      setSuccess(`Imported ${csvPreview.length} questions successfully!`);
      setIsCsvModalOpen(false);
      setCsvPreview([]);
      if (csvInputRef.current) csvInputRef.current.value = '';
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) { setCsvError('Failed to import questions.'); }
    finally { setCsvUploading(false); }
  };

  const downloadCsvTemplate = () => {
    const template = `question,option1,option2,option3,option4,correctAnswer,difficulty,explanation\n"What is Python?","A snake","A programming language","A database","An OS",2,easy,"Python is a high-level programming language."`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'questions_template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
    if (!data || !data.length) {
      alert("No data available to download");
      return;
    }
    const keys = Object.keys(data[0]);
    const displayHeaders = headers || keys;
    const csvRows = [];
    csvRows.push(displayHeaders.map(header => `"${String(header).replace(/"/g, '""')}"`).join(','));
    for (const row of data) {
      const values = keys.map(key => {
        const val = row[key];
        const strVal = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  const handleDownloadQuestions = () => {
    const activeTest = tests.find(t => t.id === selectedTestId);
    const testTitle = activeTest ? activeTest.title : 'mock_test';
    const data = questions.map(q => ({
      ID: q.id,
      Text: q.text,
      Type: q.type,
      Difficulty: q.difficulty,
      Options: q.options ? q.options.join(' | ') : 'N/A',
      CorrectOptionIndex: q.correctAnswer !== undefined ? q.correctAnswer : 'N/A',
      Explanation: q.explanation || 'N/A'
    }));
    exportToCSV(data, `${testTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_questions.csv`, ['Question ID', 'Question Text', 'Type', 'Difficulty', 'Options', 'Correct Option Index', 'Explanation']);
  };

  const handleDownloadResults = () => {
    const activeTest = tests.find(t => t.id === selectedTestId);
    const testTitle = activeTest ? activeTest.title : 'mock_test';
    const data = filteredResults.map(r => ({
      ID: r.id,
      StudentID: r.studentId || '',
      StudentName: r.studentName,
      Score: r.score,
      TotalQuestions: r.totalQuestions,
      Percentage: r.percentage + '%',
      TimeTaken: r.timeTaken ? `${Math.floor(r.timeTaken / 60)}m ${r.timeTaken % 60}s` : 'N/A',
      Warnings: r.warnings ?? 0,
      Status: r.status || 'completed',
      CompletedDate: r.date
    }));
    exportToCSV(data, `${testTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_results.csv`, [
      'Attempt ID', 'Student ID', 'Student Name', 'Score', 'Total Questions',
      'Percentage', 'Time Taken', 'Warnings', 'Status', 'Completed Date'
    ]);
  };

  const activeTest = tests.find(t => t.id === selectedTestId);

  return (
    <div>
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-500/10 border border-emerald-500/20 p-4 mb-6 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-sm text-emerald-200 font-medium">{success}</p>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/10 border border-red-500/20 p-4 mb-6 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-200 font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DASHBOARD VIEW ─── */}
      {!selectedTestId ? (
        <div className="space-y-8 pb-12">
          {/* Create using CYNEX AI */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-2xl rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-[#41c8df]" />
            <div className="p-8">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Create using</h2>
                <div className="bg-gradient-to-r from-purple-400 to-[#41c8df] bg-clip-text text-transparent font-black text-2xl tracking-tight animate-pulse">CYNEX AI</div>
              </div>
              <p className="text-slate-400 text-sm mb-8">Convert learning materials into engaging, production-grade mock tests instantly.</p>
              
              <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-800/80 pb-1">
                <button 
                  onClick={() => setCynexAiTab('file')}
                  className={`flex items-center gap-2 text-xs uppercase tracking-wider font-black px-4 py-2.5 rounded-lg transition-all ${cynexAiTab === 'file' ? 'bg-[#41c8df]/10 text-[#41c8df] border border-[#41c8df]/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload a file
                </button>
                <button 
                  onClick={() => setCynexAiTab('slides')}
                  className={`flex items-center gap-2 text-xs uppercase tracking-wider font-black px-4 py-2.5 rounded-lg transition-all ${cynexAiTab === 'slides' ? 'bg-[#41c8df]/10 text-[#41c8df] border border-[#41c8df]/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                >
                  <Layers className="w-3.5 h-3.5" /> Import slides <span className="bg-pink-500/20 text-pink-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase ml-1 border border-pink-500/20">New</span>
                </button>
                <button 
                  onClick={() => setCynexAiTab('text')}
                  className={`flex items-center gap-2 text-xs uppercase tracking-wider font-black px-4 py-2.5 rounded-lg transition-all ${cynexAiTab === 'text' ? 'bg-[#41c8df]/10 text-[#41c8df] border border-[#41c8df]/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Enter text
                </button>
              </div>
              
              {cynexAiTab === 'file' && (
                <div>
                  <input 
                    type="file" 
                    id="cynex-file-input"
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCynexAiFileName(file.name);
                        if (!cynexAiQuizTitle) {
                          setCynexAiQuizTitle(file.name.replace(/\.[^/.]+$/, "") + " Mock Quiz");
                        }
                      }
                    }}
                  />
                  <div 
                    onClick={() => document.getElementById('cynex-file-input')?.click()}
                    className="border-2 border-dashed border-slate-800 hover:border-[#41c8df]/40 bg-slate-950/40 hover:bg-[#41c8df]/5 hover:shadow-[0_0_20px_rgba(65,200,223,0.08)] transition-all rounded-2xl p-12 flex flex-col items-center justify-center mb-6 cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-[#41c8df]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-[#41c8df]/20">
                      <Upload className="w-6 h-6 text-[#41c8df]" />
                    </div>
                    {cynexAiFileName ? (
                      <div className="text-center">
                        <div className="text-base text-emerald-400 font-bold mb-1 flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" /> File Loaded Successfully
                        </div>
                        <div className="text-sm text-slate-300 font-medium font-mono bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-850 inline-block max-w-xs truncate">
                          {cynexAiFileName}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-base text-slate-200 font-bold mb-1">Drag & Drop Your File Here</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black my-2">OR</div>
                        <div className="text-xs text-[#41c8df] font-black uppercase tracking-wider hover:underline">Click to Browse & Upload</div>
                        <div className="text-[10px] text-slate-500 font-medium text-center font-mono mt-3 max-w-md">
                          Supports PDF, DOC, DOCX, PPT, PPTX, TXT (Up to 25 MB, Max 30 pages)
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {cynexAiTab === 'slides' && (
                <div>
                  <input 
                    type="file" 
                    id="cynex-slides-input"
                    className="hidden" 
                    accept=".ppt,.pptx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCynexAiFileName(file.name);
                        if (!cynexAiQuizTitle) {
                          setCynexAiQuizTitle(file.name.replace(/\.[^/.]+$/, "") + " Slides Assessment");
                        }
                      }
                    }}
                  />
                  <div 
                    onClick={() => document.getElementById('cynex-slides-input')?.click()}
                    className="border-2 border-dashed border-slate-800 hover:border-[#41c8df]/40 bg-slate-950/40 hover:bg-[#41c8df]/5 hover:shadow-[0_0_20px_rgba(65,200,223,0.08)] transition-all rounded-2xl p-12 flex flex-col items-center justify-center mb-6 cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-purple-500/20">
                      <Layers className="w-6 h-6 text-purple-400" />
                    </div>
                    {cynexAiFileName ? (
                      <div className="text-center">
                        <div className="text-base text-emerald-400 font-bold mb-1 flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" /> Slides Imported Successfully
                        </div>
                        <div className="text-sm text-slate-300 font-medium font-mono bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-850 inline-block max-w-xs truncate">
                          {cynexAiFileName}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-base text-slate-200 font-bold mb-1">Upload PowerPoint Slides (.ppt, .pptx)</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black my-2">OR</div>
                        <div className="text-xs text-[#41c8df] font-black uppercase tracking-wider hover:underline">Click to Browse Slides</div>
                        <div className="text-[10px] text-slate-500 text-center font-mono mt-3 max-w-md">
                          CYNEX AI will auto-extract slide titles, key concepts, code blocks, and diagrams.
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {cynexAiTab === 'text' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block text-left">Source Material / Syllabus Content</label>
                    <textarea 
                      rows={5}
                      value={cynexAiTextContent}
                      onChange={(e) => setCynexAiTextContent(e.target.value)}
                      placeholder="Paste your learning materials, article text, documentation, or syllabus here. CYNEX AI will ingest this context to draft highly specialized mock test questions..."
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-[#41c8df] focus:ring-1 focus:ring-[#41c8df] rounded-xl outline-none text-white placeholder-slate-650 resize-none font-medium text-sm transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block text-left">Quiz Title</label>
                  <input 
                    type="text" 
                    value={cynexAiQuizTitle}
                    onChange={(e) => setCynexAiQuizTitle(e.target.value)}
                    placeholder="e.g. Python OOP Basics"
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-[#41c8df] focus:ring-1 focus:ring-[#41c8df] rounded-xl text-sm text-white outline-none font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block text-left">Assign to Course</label>
                  <select 
                    value={cynexAiCourseId}
                    onChange={(e) => setCynexAiCourseId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-[#41c8df] focus:ring-1 focus:ring-[#41c8df] rounded-xl text-sm text-[#41c8df] outline-none font-medium cursor-pointer transition-all"
                  >
                    <option value="" className="bg-slate-950 text-[#41c8df]">All Courses (Unassigned)</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-950 text-[#41c8df]">{c.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Number of questions</span>
                    <select 
                      value={cynexAiNumQuestions}
                      onChange={(e) => setCynexAiNumQuestions(e.target.value)}
                      className="bg-slate-950/60 border border-slate-850 focus:border-[#41c8df] rounded-lg px-4 py-2 text-sm font-medium text-white outline-none cursor-pointer transition-all"
                    >
                      <option value="Automatic" className="bg-slate-950 text-white">Automatic</option>
                      <option value="5" className="bg-slate-950 text-white">5</option>
                      <option value="10" className="bg-slate-950 text-white">10</option>
                      <option value="20" className="bg-slate-950 text-white">20</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Output language</span>
                    <select 
                      value={cynexAiLanguage}
                      onChange={(e) => setCynexAiLanguage(e.target.value)}
                      className="bg-slate-950/60 border border-slate-850 focus:border-[#41c8df] rounded-lg px-4 py-2 text-sm font-medium text-white outline-none cursor-pointer transition-all"
                    >
                      <option value="English" className="bg-slate-950 text-white">English ⚡</option>
                      <option value="Spanish" className="bg-slate-950 text-white">Spanish</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={handleGenerateQuiz}
                  disabled={cynexIsGenerating}
                  className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-purple-650 to-[#41c8df] hover:opacity-95 active:scale-[0.98] disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 border border-white/5"
                >
                  {cynexIsGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" /> Generating...
                    </>
                  ) : (
                    <>
                      ✨ Generate quiz
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Reports */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Reports</h2>
                <p className="text-sm text-gray-400">Checkout the reports of some recent sessions that you hosted</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    setEditingTest(null);
                    setTestForm({
                      title: '',
                      description: '',
                      duration: 60,
                      category: 'Technical',
                      totalQuestions: 10,
                      isActive: true,
                      course_id: '',
                      batch_id: '',
                      language: 'English'
                    });
                    setIsTestModalOpen(true);
                  }}
                  className="bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold text-sm py-2.5 px-5 rounded-xl transition-all flex items-center gap-1.5 shadow-lg border border-transparent hover:border-white/10"
                >
                  <Plus className="w-4 h-4 text-black" /> Create Test
                </button>
                <button className="text-[#41c8df] text-sm font-bold flex items-center gap-1 hover:underline">
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-[#41c8df] rounded-full animate-spin" />
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                <ClipboardList className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No tests available. Create one to see reports.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tests.map(test => {
                  const testResults = results.filter(r => r.testId === test.id);
                  const totalParticipants = new Set(testResults.map(r => r.studentId || r.studentName)).size;
                  const avgAccuracy = testResults.length > 0 
                    ? Math.round(testResults.reduce((sum, r) => sum + r.percentage, 0) / testResults.length)
                    : 0;
                  // Average rating: derive 1–5 stars from avg percentage
                  // 0–19% = 1★, 20–39% = 2★, 40–59% = 3★, 60–79% = 4★, 80–100% = 5★
                  const avgRating = testResults.length > 0
                    ? Math.max(1, Math.ceil(avgAccuracy / 20))
                    : 0;

                  // Deterministic join code based on ID
                  const joinCode = Array.from(test.id).reduce((hash, char) => {
                    return Math.abs((hash << 5) - hash + char.charCodeAt(0));
                  }, 0).toString().padStart(8, '0').slice(0, 8);

                  // Resolve assigned course and batch names
                  const assignedCourse = test.course_id ? courses.find(c => c.id === test.course_id) : null;
                  const assignedBatch  = test.batch_id  ? batches.find(b => b.id === test.batch_id)   : null;

                  return (
                    <div key={test.id} className="bg-background/40 backdrop-blur-xl border border-secondary/10 hover:border-white/20 transition-all rounded-2xl p-5 flex flex-col xl:flex-row items-start xl:items-center gap-5 shadow-sm">
                      <div className="w-14 h-14 rounded-xl bg-[#41c8df]/10 flex items-center justify-center shrink-0 border border-[#41c8df]/20 hidden sm:flex">
                        <div className="w-7 h-7 rounded bg-gradient-to-br from-[#41c8df] to-purple-500 opacity-80" />
                      </div>
                      
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                            test.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                          }`}>
                            {test.isActive ? 'Assigned' : 'Draft'}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border bg-purple-500/10 text-purple-400 border-purple-500/20">
                            🌐 {test.language || 'English'}
                          </span>
                          <h3 className="text-base font-bold text-white truncate">{test.title} <span className="text-gray-500 font-normal ml-1">({new Date(test.createdAt).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})})</span></h3>
                          <button onClick={(e) => { e.stopPropagation(); setEditingTest(test); setTestForm({...test, duration: test.duration, category: test.category, totalQuestions: test.totalQuestions, isActive: test.isActive, course_id: test.course_id || '', batch_id: test.batch_id || '', language: test.language || 'English'}); setIsTestModalOpen(true); }} className="text-gray-400 hover:text-[#41c8df] transition-colors p-1" title="Edit Test Details">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTest(test.id); }} className="text-gray-400 hover:text-red-400 transition-colors p-1" title="Delete Mock Test">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Assigned to: Course + Batch */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                            assignedCourse
                              ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                              : 'bg-white/5 text-gray-500 border-white/10'
                          }`}>
                            <BookOpen className="w-3 h-3" />
                            {assignedCourse ? assignedCourse.title : 'All Courses'}
                          </div>
                          <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                            assignedBatch
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              : 'bg-white/5 text-gray-500 border-white/10'
                          }`}>
                            <Layers className="w-3 h-3" />
                            {assignedBatch ? assignedBatch.name : 'All Batches'}
                          </div>
                          {test.isActive && !test.course_id && (
                            <span className="text-[9px] text-yellow-500/70 italic">⚠ Not assigned to a specific course</span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-gray-400">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded text-xs">
                              <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-bold">{joinCode}</span>
                            </div>
                            <span className="text-xs">Join Code</span>
                          </div>
                          <div className="w-px h-3 bg-white/10 hidden sm:block" />
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-white font-bold">{avgAccuracy}%</span> Accuracy
                          </div>
                          <div className="w-px h-3 bg-white/10 hidden sm:block" />
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-white font-bold">{totalParticipants}</span> Students
                          </div>
                          <div className="w-px h-3 bg-white/10 hidden sm:block" />
                          {/* Average rating as stars derived from avg accuracy */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="flex items-center gap-0.5">
                              {avgRating === 0 ? (
                                <span className="text-gray-600 text-[10px] italic">No attempts yet</span>
                              ) : (
                                [1,2,3,4,5].map(s => (
                                  <Star
                                    key={s}
                                    className={`w-3 h-3 ${ s <= avgRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`}
                                  />
                                ))
                              )}
                            </div>
                            {avgRating > 0 && (
                              <span className="text-white font-bold">{avgRating}.0</span>
                            )}
                            <span className="text-gray-500">Avg Rating</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => setSelectedTestId(test.id)}
                        className="shrink-0 w-full xl:w-auto bg-transparent border border-white/20 hover:bg-white/10 text-white font-bold text-sm py-2.5 px-6 rounded-xl transition-all whitespace-nowrap">
                        View Full Report
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ─── FULL REPORT VIEW ─── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <button 
              onClick={() => setSelectedTestId(null)} 
              className="flex items-center gap-2 text-gray-400 hover:text-white font-bold text-sm transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg w-fit"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Reports
            </button>

            {/* Test Selector Dropdown */}
            <div className="flex items-center gap-3">
              <ClipboardList className="text-[#41c8df]" size={20} />
              <select value={selectedTestId || ''}
                onChange={(e) => setSelectedTestId(e.target.value || null)}
                className="px-4 py-2.5 bg-[#1c2541] border border-secondary/20 rounded-xl outline-none text-white font-medium min-w-[250px] focus:border-[#41c8df] cursor-pointer text-sm"
                title="Select Test">
                <option value="" className="bg-[#1c2541] text-white">-- Select Test --</option>
                {tests.map(t => <option key={t.id} value={t.id} className="bg-[#1c2541] text-white">{t.title}</option>)}
              </select>
              {activeTest && (
                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold px-3 py-1.5 rounded-xl">
                  🌐 Language: {activeTest.language || 'English'}
                </span>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/10 gap-6 mt-4">
            <button
              onClick={() => setActiveTab('questions')}
              className={`pb-3 font-bold text-sm transition-all border-b-2 ${
                activeTab === 'questions'
                  ? 'border-[#41c8df] text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Questions Editor ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`pb-3 font-bold text-sm transition-all border-b-2 ${
                activeTab === 'results'
                  ? 'border-[#41c8df] text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Results & Submissions ({filteredResults.length})
            </button>
          </div>

          {activeTab === 'questions' ? (
            /* QUESTIONS TAB LAYOUT */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Question Editor Area */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Info row with count + Add Question Button */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-background/30 p-4 border border-secondary/15 rounded-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-white/5 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold border border-white/5">
                      {questions.length} Questions
                    </span>
                    <span className="bg-white/5 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold border border-white/5">
                      {questions.length} Points
                    </span>
                    <span className="bg-white/5 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold border border-white/5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {activeTest ? activeTest.duration : 60} mins
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { 
                        setEditingQuestion(null); 
                        setQuestionForm({ text: '', difficulty: 'easy', type: 'mcq', options: ['', '', '', ''], correctAnswer: 0, correctAnswerText: '', boilerplate: '', testCases: '', explanation: '' }); 
                        setIsQuestionModalOpen(true); 
                      }}
                      className="inline-flex items-center px-4 py-2 bg-[#41c8df] hover:bg-[#38b2c7] text-black text-xs font-bold rounded-xl transition-all shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Question
                    </button>
                    <button 
                      onClick={() => setIsCsvModalOpen(true)}
                      className="inline-flex items-center px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl transition-all"
                      title="Upload questions from Sheets/CSV"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload CSV
                    </button>
                    {questions.length > 0 && (
                      <button
                        onClick={handleDownloadQuestions}
                        className="inline-flex items-center px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all"
                        title="Download question bank as CSV"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Actions Toolbar */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">CYNEX AI Actions</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    <div className="bg-[#41c8df]/15 text-[#41c8df] border border-[#41c8df]/30 text-xs px-3.5 py-1.5 rounded-full font-black flex items-center gap-1.5 whitespace-nowrap">
                      {isAIActionRunning ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      )} CYNEX AI Tools
                    </div>
                    {[
                      { name: 'Fix spelling & grammar', icon: '✏️' },
                      { name: 'Translate', icon: '🌐' },
                      { name: 'Add answer explanations', icon: '💡' },
                      { name: 'Make simple', icon: '✨' },
                      { name: 'Change format', icon: '📐' }
                    ].map((tool, idx) => {
                      const isThisRunning = isAIActionRunning && activeAIActionName === tool.name;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleAIAction(tool.name)}
                          disabled={isAIActionRunning}
                          className={`border text-xs px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                            isThisRunning
                              ? 'bg-[#41c8df]/20 border-[#41c8df]/50 text-[#41c8df] cursor-wait'
                              : isAIActionRunning
                              ? 'bg-white/3 border-white/5 text-gray-600 cursor-not-allowed'
                              : 'bg-white/5 border-white/10 hover:border-[#41c8df]/40 hover:bg-[#41c8df]/10 hover:text-[#41c8df] text-gray-300 cursor-pointer'
                          }`}
                        >
                          {isThisRunning ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Wand2 className="w-3 h-3 text-purple-400" />
                          )}
                          {tool.name}
                        </button>
                      );
                    })}
                    {/* Translate language selector */}
                    <select
                      value={translateLanguage}
                      onChange={e => setTranslateLanguage(e.target.value)}
                      disabled={isAIActionRunning}
                      className="bg-white/5 border border-white/10 text-gray-400 text-xs px-2 py-1.5 rounded-full font-bold whitespace-nowrap cursor-pointer hover:border-[#41c8df]/30 transition-colors disabled:opacity-40"
                      title="Target language for Translate action"
                    >
                      {['Hindi','Telugu','Tamil','Kannada','Malayalam','Bengali','Marathi','Gujarati','Punjabi','Urdu','Spanish','French','German','Chinese','Arabic','Japanese','Korean','Portuguese','Russian'].map(lang => (
                        <option key={lang} value={lang} className="bg-[#0f1623]">{lang}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Questions Cards */}
                {isGeneratingSidebar ? (
                  /* Loading Skeletons during AI generation */
                  <div className="space-y-4">
                    {[1, 2].map(n => (
                      <div key={n} className="bg-[#0d1b2a]/20 border border-dashed border-white/10 rounded-2xl p-6 space-y-4 animate-pulse">
                        <div className="flex justify-between items-center">
                          <div className="h-4 bg-white/10 rounded w-1/4" />
                          <div className="h-4 bg-white/10 rounded w-12" />
                        </div>
                        <div className="h-6 bg-white/10 rounded w-3/4" />
                        <div className="grid grid-cols-2 gap-3">
                          {[1, 2, 3, 4].map(o => <div key={o} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : questions.length === 0 ? (
                  <div className="bg-background/40 border border-secondary/15 rounded-3xl p-12 text-center text-gray-400">
                    <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-500 animate-bounce" />
                    <p className="text-base font-bold text-white mb-1">No questions created yet</p>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">Start building your quiz by typing a prompt on the right sidebar, uploading a sheet, or using the create question editor.</p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button 
                        onClick={() => setIsQuestionModalOpen(true)}
                        className="px-5 py-2.5 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-md"
                      >
                        Create First Question
                      </button>
                      <button 
                        onClick={() => setIsCsvModalOpen(true)}
                        className="px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" /> Upload Questions
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {questions
                      .filter(q => q.text.toLowerCase().includes(questionSearchQuery.toLowerCase()))
                      .map((q, i) => (
                        <div key={q.id} className="bg-[#0d1b2a]/30 border border-white/5 rounded-2.5xl p-6 space-y-4 hover:border-white/10 hover:bg-[#0d1b2a]/45 transition-all shadow-md">
                          
                          {/* Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-400 uppercase tracking-widest bg-white/5 px-2.5 py-0.5 rounded-md border border-white/5">Q. {i + 1}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-[#41c8df]/10 text-[#41c8df]">
                                {q.type === 'mcq' ? 'MULTIPLE CHOICE' :
                                 q.type === 'coding' ? 'CODING' :
                                 q.type === 'sql' ? 'SQL QUERY' :
                                 q.type === 'true-false' ? 'TRUE/FALSE' : 'SHORT ANSWER'}
                              </span>
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md ${
                                q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                                q.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-red-500/10 text-red-400'
                              }`}>{q.difficulty}</span>
                              <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/10">1 Pt</span>
                            </div>
                            
                            {/* Toolbar Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDuplicateQuestion(q)}
                                className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                                title="Duplicate question"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(q.text);
                                  setSuccess('Question copied to clipboard');
                                  setTimeout(() => setSuccess(null), 2000);
                                }}
                                className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                                title="Copy text link"
                              >
                                <Link className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingQuestion(q);
                                  setQuestionForm({
                                    text: q.text,
                                    difficulty: q.difficulty || 'easy',
                                    type: q.type || 'mcq',
                                    options: q.options || ['', '', '', ''],
                                    correctAnswer: q.correctAnswer || 0,
                                    correctAnswerText: q.correctAnswerText || '',
                                    boilerplate: q.boilerplate || '',
                                    testCases: q.testCases || '',
                                    explanation: q.explanation || ''
                                  });
                                  setIsQuestionModalOpen(true);
                                }}
                                className="px-3 py-1 bg-white/5 border border-white/10 hover:border-[#41c8df]/40 text-[#41c8df] hover:text-[#41c8df] font-bold text-xs rounded-lg transition-all"
                              >
                                Edit
                              </button>
                            </div>
                          </div>

                          {/* Card Question Text */}
                          <div className="text-gray-200 font-medium text-sm leading-relaxed whitespace-pre-wrap">{q.text}</div>

                          {/* Card Options */}
                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              {q.options.map((opt, oi) => {
                                const isCorrect = oi === q.correctAnswer;
                                return (
                                  <div 
                                    key={oi} 
                                    className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${
                                      isCorrect 
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold' 
                                        : 'border-slate-800 bg-slate-900/40 text-slate-350 hover:bg-slate-900/60'
                                    }`}
                                  >
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                      isCorrect ? 'bg-emerald-500 text-black' : 'bg-slate-800 border border-slate-700 text-slate-400'
                                    }`}>
                                      {String.fromCharCode(65 + oi)}
                                    </span>
                                    <span className="text-xs font-semibold break-words flex-1 leading-normal text-slate-200">{opt}</span>
                                    {isCorrect && <Check className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Explanations block */}
                          {q.explanation && (
                            <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl flex items-start gap-2.5">
                              <FileText className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                              <div className="text-xs text-purple-300 leading-relaxed">
                                <span className="font-bold">Explanation:</span> {q.explanation}
                              </div>
                            </div>
                          )}

                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Find Questions Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#0c1329] border border-[#1d2745] rounded-3xl p-5 space-y-6 shadow-xl sticky top-6">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#41c8df]" /> Find Questions
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4">Filter current questions or use AI to generate new ones directly into this test.</p>
                    
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                      <input 
                        type="text"
                        placeholder="Search from your library..."
                        value={questionSearchQuery}
                        onChange={(e) => setQuestionSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-secondary/5 border border-[#1e294a] rounded-xl text-xs outline-none focus:border-[#41c8df] text-white transition-all placeholder:text-gray-500 font-medium"
                      />
                      {questionSearchQuery && (
                        <button 
                          onClick={() => setQuestionSearchQuery('')}
                          className="absolute right-3 top-3 text-[10px] font-bold text-gray-400 hover:text-white"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  {/* AI prompt block */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">CYNEX AI Generator</span>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/10 rounded-2xl p-4 text-center space-y-3">
                      <Wand2 className="w-8 h-8 mx-auto text-[#41c8df] drop-shadow-[0_0_8px_rgba(65,200,223,0.3)] animate-pulse" />
                      <p className="text-xs text-gray-300 font-medium">Describe what you need, and CYNEX AI will build it instantly.</p>
                      
                      <textarea
                        rows={3}
                        placeholder="e.g. Create 3 easy React questions about state management..."
                        value={aiGeneratePrompt}
                        onChange={(e) => setAiGeneratePrompt(e.target.value)}
                        className="w-full p-3 bg-black/40 border border-[#1e294a] rounded-xl text-xs outline-none focus:border-[#41c8df] text-white resize-none transition-all placeholder:text-gray-600 leading-relaxed font-medium"
                      />

                      <button
                        onClick={handleAISidebarGenerate}
                        disabled={isGeneratingSidebar || !aiGeneratePrompt.trim()}
                        className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-[#41c8df] to-[#9b5de5] hover:opacity-90 disabled:opacity-40 text-black font-black text-xs rounded-xl transition-all shadow-md uppercase tracking-wider"
                      >
                        {isGeneratingSidebar ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 mr-2" />
                            Generate Questions
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* RESULTS TAB LAYOUT */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-400 font-bold">
                  Showing {filteredResults.length} submission{filteredResults.length !== 1 ? 's' : ''}
                </div>
                {filteredResults.length > 0 && (
                  <button
                    onClick={handleDownloadResults}
                    className="inline-flex items-center text-xs font-bold text-[#41c8df] hover:underline bg-[#41c8df]/10 border border-[#41c8df]/20 hover:bg-[#41c8df]/20 px-3.5 py-1.5 rounded-xl transition-all"
                    title="Download test results as CSV"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download Results
                  </button>
                )}
              </div>
              <div className="bg-[#0c1329]/60 border border-secondary/10 rounded-2.5xl overflow-hidden shadow-lg">
                {filteredResults.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                    <p className="text-base font-bold text-white mb-1">No results for this test yet</p>
                    <p className="text-xs text-gray-400">As soon as students join and complete the test, their metrics will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {/* Header */}
                    <div className="px-6 py-3.5 grid grid-cols-6 gap-4 bg-white/5">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider col-span-2">Student Name / Date</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Score & Percentage</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Duration Taken</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Violations</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Proctoring Report</div>
                    </div>
                    
                    {filteredResults.map(r => {
                      const timeTakenStr = r.timeTaken
                        ? `${Math.floor(r.timeTaken / 60)}m ${r.timeTaken % 60}s`
                        : '—';
                      const statusColor = r.status === 'terminated_cheating'
                        ? 'text-red-400'
                        : r.status === 'timeout'
                        ? 'text-yellow-400'
                        : 'text-emerald-400';
                      const warningColor = (r.warnings ?? 0) >= 3
                        ? 'text-red-400'
                        : (r.warnings ?? 0) > 0
                        ? 'text-yellow-400'
                        : 'text-gray-400';
                      return (
                        <div key={r.id} className="px-6 py-4 grid grid-cols-6 gap-4 items-center hover:bg-white/5 transition-colors">
                          <div className="col-span-2">
                            <div className="text-sm font-bold text-white">{r.studentName}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString()} at {new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${statusColor} bg-current/10`} style={{ background: 'rgba(255,255,255,0.05)' }}>
                                {r.status === 'terminated_cheating' ? '⚠ Terminated'
                                  : r.status === 'timeout' ? '⏱ Timed Out'
                                  : '✓ Completed'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-white">{r.score}/{r.totalQuestions}</div>
                            <div className={`text-[10px] font-bold ${r.percentage >= 70 ? 'text-emerald-400' : 'text-red-400'} mt-0.5`}>
                              {r.percentage}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-blue-300">{timeTakenStr}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-black ${warningColor}`}>{r.warnings ?? 0}/3</div>
                          </div>
                          <div className="text-right">
                            <button
                              onClick={() => setSelectedResultReport(r)}
                              className="px-3 py-1.5 bg-[#41c8df]/10 hover:bg-[#41c8df] border border-[#41c8df]/20 hover:border-[#41c8df] text-[#41c8df] hover:text-black text-[11px] font-black rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 ml-auto"
                            >
                              <Shield size={12} /> View Log
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Modal */}
      <AnimatePresence>
        {isTestModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsTestModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-[2rem] p-8 w-full max-w-xl shadow-2xl">
              <button onClick={() => setIsTestModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-display font-bold text-secondary mb-6 flex items-center gap-3">
                <ClipboardList className="text-[#41c8df]" /> New Mock Test
              </h2>
              <form onSubmit={handleTestSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Title *</label>
                  <input type="text" required value={testForm.title}
                    onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Description</label>
                  <textarea rows={2} value={testForm.description}
                    onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary resize-none" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Duration (min)</label>
                    <input type="number" min={1} value={testForm.duration}
                      onChange={(e) => setTestForm({ ...testForm, duration: parseInt(e.target.value) || 60 })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Questions</label>
                    <input type="number" min={1} value={testForm.totalQuestions}
                      onChange={(e) => setTestForm({ ...testForm, totalQuestions: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Category</label>
                    <input type="text" value={testForm.category}
                      onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block text-left">Assign Course</label>
                    <select value={testForm.course_id}
                      onChange={(e) => setTestForm({ ...testForm, course_id: e.target.value, batch_id: '' })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      title="Assign Course">
                      <option value="">Unassigned (All Courses)</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block text-left">Assign Batch</label>
                    <select value={testForm.batch_id}
                      onChange={(e) => setTestForm({ ...testForm, batch_id: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      title="Assign Batch">
                      <option value="">Unassigned (All Batches)</option>
                      {batches.filter(b => b.course_id === testForm.course_id || !testForm.course_id).map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block text-left">Language</label>
                    <select value={testForm.language}
                      onChange={(e) => setTestForm({ ...testForm, language: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      title="Language">
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={testForm.isActive}
                      onChange={(e) => setTestForm({ ...testForm, isActive: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-secondary/20 peer-focus:ring-[#41c8df] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#41c8df]" />
                  </label>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active (visible to students)</span>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsTestModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl hover:bg-secondary/5 transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-1 px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">Create Test</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Question Modal */}
      <AnimatePresence>
        {isQuestionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsQuestionModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-[2rem] p-8 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsQuestionModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-display font-bold text-secondary mb-6 flex items-center gap-3">
                <HelpCircle className="text-[#41c8df]" /> {editingQuestion ? 'Edit Question' : 'Add Question'}
              </h2>
              {activeTest && (
                <div className="bg-[#1c2541]/80 border border-secondary/15 p-3.5 rounded-xl mb-4 text-xs font-medium text-gray-300 text-left">
                  ⚠️ This test is configured in <span className="text-[#41c8df] font-bold">{activeTest.language || 'English'}</span>. Please input your question, options, and explanations in <span className="text-[#41c8df] font-bold">{activeTest.language || 'English'}</span>.
                </div>
              )}
              <form onSubmit={handleQuestionSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Question Text *</label>
                  <textarea required rows={2} value={questionForm.text}
                    onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary resize-none" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Type</label>
                    <select value={questionForm.type}
                      onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value as any })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      title="Question Type">
                      <option value="mcq">MCQ</option>
                      <option value="coding">Coding</option>
                      <option value="sql">SQL Query</option>
                      <option value="short-answer">Short Answer</option>
                      <option value="true-false">True/False</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Difficulty</label>
                    <select value={questionForm.difficulty}
                      onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as any })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      title="Difficulty">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  {questionForm.type === 'mcq' && (
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Correct Answer (Index)</label>
                      <input type="number" min={0} max={3} value={questionForm.correctAnswer}
                        onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                    </div>
                  )}
                </div>
                {questionForm.type === 'mcq' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Options</label>
                    {questionForm.options.map((opt, i) => (
                      <div key={i} className="flex gap-3 items-center">
                        <span className="w-8 h-8 rounded-full border border-secondary/20 flex items-center justify-center text-xs font-bold text-gray-500">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <input type="text" value={opt}
                          onChange={(e) => {
                            const u = [...questionForm.options];
                            u[i] = e.target.value;
                            setQuestionForm({ ...questionForm, options: u });
                          }}
                          className="flex-1 px-4 py-2 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-lg outline-none text-secondary"
                          placeholder={`Option ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
                
                {questionForm.type === 'coding' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Starter Code (Boilerplate)</label>
                      <textarea rows={4} value={questionForm.boilerplate}
                        onChange={(e) => setQuestionForm({ ...questionForm, boilerplate: e.target.value })}
                        className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary font-mono text-sm"
                        placeholder="function solve() { ... }" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Test Cases (JSON format)</label>
                      <textarea rows={4} value={questionForm.testCases}
                        onChange={(e) => setQuestionForm({ ...questionForm, testCases: e.target.value })}
                        className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary font-mono text-sm"
                        placeholder='[{"input": "1 2", "expected": "3"}]' />
                    </div>
                  </div>
                )}

                {(questionForm.type === 'short-answer' || questionForm.type === 'sql') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                      {questionForm.type === 'sql' ? 'Correct SQL Query (Model Answer)' : 'Correct Answer Text'}
                    </label>
                    {questionForm.type === 'sql' ? (
                      <textarea rows={3} value={questionForm.correctAnswerText}
                        onChange={(e) => setQuestionForm({ ...questionForm, correctAnswerText: e.target.value })}
                        className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary font-mono text-sm"
                        placeholder="SELECT * FROM emp WHERE sal > 2000;" />
                    ) : (
                      <input type="text" value={questionForm.correctAnswerText}
                        onChange={(e) => setQuestionForm({ ...questionForm, correctAnswerText: e.target.value })}
                        className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                        placeholder="Exact answer expected" />
                    )}
                  </div>
                )}

                {questionForm.type === 'true-false' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Correct Answer</label>
                    <select value={questionForm.correctAnswer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary">
                      <option value={0}>True</option>
                      <option value={1}>False</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Explanation</label>
                  <textarea rows={2} value={questionForm.explanation}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary resize-none" />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button type="button" onClick={() => setIsQuestionModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl hover:bg-secondary/5 transition-all text-sm">Cancel</button>
                  <button type="button"
                    onClick={(e) => {
                      // Save and add another
                      const syntheticEvent = { ...e, preventDefault: () => {} } as React.FormEvent;
                      handleQuestionSubmit(syntheticEvent).then(() => {
                        // Reset form but keep modal open
                        setQuestionForm({
                          text: '',
                          difficulty: 'easy',
                          type: 'mcq',
                          options: ['', '', '', ''],
                          correctAnswer: 0,
                          correctAnswerText: '',
                          boilerplate: '',
                          testCases: '',
                          explanation: ''
                        });
                        setIsQuestionModalOpen(true);
                      });
                    }}
                    className="flex-1 px-4 py-3 bg-[#41c8df]/10 border border-[#41c8df]/30 hover:bg-[#41c8df]/20 text-[#41c8df] font-bold rounded-xl transition-all shadow-sm text-sm">Save & Add Another</button>
                  <button type="button"
                    onClick={(e) => {
                      const syntheticEvent = { ...e, preventDefault: () => {} } as React.FormEvent;
                      handleQuestionSubmit(syntheticEvent).then(() => {
                        setIsQuestionModalOpen(false);
                      });
                    }}
                    className="flex-1 px-4 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg text-sm">{editingQuestion ? 'Save Changes' : 'Save & Close'}</button>
                </div>
              </form>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* CSV Upload Modal */}
      <AnimatePresence>
        {isCsvModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCsvModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsCsvModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-display font-bold text-secondary mb-2 flex items-center gap-3">
                <FileSpreadsheet className="text-emerald-400" /> Upload Questions from Sheets / CSV
              </h2>
              <p className="text-sm text-gray-400 mb-6">Export your Google Sheet as a CSV and upload it. Questions are added to the currently selected test.</p>

              {/* Template Download */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-emerald-400 mb-1">📄 CSV Template</div>
                  <div className="text-xs text-gray-400">Columns: <span className="font-mono text-[#41c8df]">question, option1, option2, option3, option4, correctAnswer (1-4), difficulty, explanation</span></div>
                </div>
                <button onClick={downloadCsvTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl hover:bg-emerald-500/20 transition-all shrink-0">
                  <Download size={14} /> Template
                </button>
              </div>

              {/* File Input */}
              <div
                onClick={() => csvInputRef.current?.click()}
                className="border-2 border-dashed border-secondary/20 hover:border-[#41c8df]/40 rounded-xl p-8 text-center cursor-pointer transition-all mb-5 group">
                <Upload size={32} className="text-gray-500 group-hover:text-[#41c8df] mx-auto mb-3 transition-colors" />
                <p className="text-gray-400 text-sm font-medium">Click to select a CSV file</p>
                <p className="text-gray-600 text-xs mt-1">Exported from Google Sheets, Excel, or any spreadsheet app</p>
                <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
              </div>

              {csvError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5 flex items-start gap-3">
                  <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-300">{csvError}</p>
                </div>
              )}

              {/* Preview */}
              {csvPreview.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
                      Preview — {csvPreview.length} questions found
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">✓ Ready to import</span>
                  </div>
                  <div className="bg-background/40 border border-secondary/10 rounded-xl overflow-hidden divide-y divide-white/5 max-h-64 overflow-y-auto">
                    {csvPreview.map((q, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black uppercase text-gray-500">Q{i + 1}</span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400'
                              : q.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>{q.difficulty}</span>
                        </div>
                        <p className="text-sm text-gray-200 font-medium truncate">{q.text}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {q.options?.map((opt, oi) => (
                            <span key={oi} className={`text-[10px] px-2 py-0.5 rounded ${
                              oi === q.correctAnswer
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-white/5 text-gray-500'
                            }`}>{oi === q.correctAnswer ? '✓ ' : ''}{opt}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setIsCsvModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl hover:bg-secondary/5 transition-all">Cancel</button>
                <button onClick={handleCsvImport} disabled={csvPreview.length === 0 || csvUploading}
                  className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                  {csvUploading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</>
                  ) : (
                    <><Upload size={16} /> Import {csvPreview.length > 0 ? `${csvPreview.length} Questions` : 'Questions'}</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Proctoring Log / Security Audit Modal */}
      <AnimatePresence>
        {selectedResultReport && (() => {
          let parsedLogs: ProctoringLog[] = [];
          if (selectedResultReport.proctoringLogs) {
            try {
              parsedLogs = JSON.parse(selectedResultReport.proctoringLogs);
            } catch (e) {
              console.error('Failed to parse proctoring logs:', e);
            }
          }

          let parsedConfidence: Record<string, 'confident' | 'unsure' | 'guess'> = {};
          if (selectedResultReport.confidenceRatings) {
            try {
              parsedConfidence = JSON.parse(selectedResultReport.confidenceRatings);
            } catch (e) {
              console.error('Failed to parse confidence ratings:', e);
            }
          }

          const confidentCount = Object.values(parsedConfidence).filter(v => v === 'confident').length;
          const unsureCount = Object.values(parsedConfidence).filter(v => v === 'unsure').length;
          const guessCount = Object.values(parsedConfidence).filter(v => v === 'guess').length;
          const totalRated = Object.keys(parsedConfidence).length;

          const totalWarnings = selectedResultReport.warnings ?? 0;
          const securityLevel = totalWarnings >= 3 || selectedResultReport.status === 'terminated_cheating'
            ? { text: 'CRITICAL', color: 'text-red-400 border-red-500/30 bg-red-500/10' }
            : totalWarnings > 0
            ? { text: 'WARNING', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' }
            : { text: 'SECURE', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedResultReport(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-slate-950 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
                <button onClick={() => setSelectedResultReport(null)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close">
                  <X size={20} />
                </button>

                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                      <Shield className="text-[#41c8df] w-6 h-6" /> Security & Performance Audit
                    </h2>
                    <span className={`text-xs font-black tracking-widest px-2.5 py-1 rounded-lg border ${securityLevel.color}`}>
                      STATUS: {securityLevel.text}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Comprehensive exam report for <span className="text-white font-bold">{selectedResultReport.studentName}</span>'s attempt on <span className="text-[#41c8df] font-bold">{selectedResultReport.testTitle}</span>.
                  </p>
                </div>

                {/* KPI Card Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl">
                    <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Score Obtained</div>
                    <div className="text-lg font-black text-white">{selectedResultReport.score} / {selectedResultReport.totalQuestions}</div>
                    <div className="text-xs text-[#41c8df] font-bold mt-0.5">{selectedResultReport.percentage}% Accurate</div>
                  </div>
                  <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl">
                    <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Time Elapsed</div>
                    <div className="text-lg font-black text-white">
                      {selectedResultReport.timeTaken
                        ? `${Math.floor(selectedResultReport.timeTaken / 60)}m ${selectedResultReport.timeTaken % 60}s`
                        : '—'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">Attempt Duration</div>
                  </div>
                  <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl">
                    <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Violations Triggered</div>
                    <div className="text-lg font-black text-white">{totalWarnings} / 3</div>
                    <div className="text-xs text-gray-400 mt-0.5">Warnings Limit</div>
                  </div>
                  <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl">
                    <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Exam Mode</div>
                    <div className="text-lg font-black text-white truncate">
                      {selectedResultReport.status === 'terminated_cheating' ? 'Terminated' : 'Completed'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">End Status</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 mb-6">
                  <button
                    onClick={() => setReportTab('proctoring')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wider font-black border-b-2 transition-all ${
                      reportTab === 'proctoring'
                        ? 'border-[#41c8df] text-[#41c8df]'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Activity size={14} /> AI Proctoring Logs ({parsedLogs.length})
                  </button>
                  <button
                    onClick={() => setReportTab('confidence')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wider font-black border-b-2 transition-all ${
                      reportTab === 'confidence'
                        ? 'border-[#41c8df] text-[#41c8df]'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <TrendingUp size={14} /> Metacognitive Calibration
                  </button>
                </div>

                {/* Tab Contents */}
                {reportTab === 'proctoring' ? (
                  <div className="space-y-4">
                    {parsedLogs.length === 0 ? (
                      <div className="text-center py-12 bg-emerald-500/5 border border-emerald-500/10 rounded-[1.5rem] p-6">
                        <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                        <h4 className="text-base font-bold text-white mb-1">Perfect Integrity Record</h4>
                        <p className="text-xs text-gray-400 max-w-md mx-auto">
                          Zero violations detected. The student remained fully focused in fullscreen mode with no suspicious tab switches, head turns, or objects detected.
                        </p>
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-white/10 ml-4 pl-6 space-y-6 py-2">
                        {parsedLogs.map((log, index) => {
                          let icon = <AlertCircle size={14} className="text-yellow-400" />;
                          let colorClass = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300';
                          
                          if (log.type === 'camera_denied' || log.type === 'multiple_faces' || log.type === 'devtools_detected') {
                            icon = <AlertTriangle size={14} className="text-red-400" />;
                            colorClass = 'bg-red-500/10 border-red-500/20 text-red-300';
                          } else if (log.type === 'tab_switch' || log.type === 'fullscreen_exit') {
                            icon = <X size={14} className="text-orange-400" />;
                            colorClass = 'bg-orange-500/10 border-orange-500/20 text-orange-300';
                          }

                          return (
                            <div key={index} className="relative">
                              {/* Timeline indicator node */}
                              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-950 border-2 border-white/20 flex items-center justify-center">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  log.type === 'camera_denied' || log.type === 'multiple_faces' || log.type === 'devtools_detected'
                                    ? 'bg-red-500'
                                    : log.type === 'tab_switch' || log.type === 'fullscreen_exit'
                                    ? 'bg-orange-500'
                                    : 'bg-yellow-500'
                                }`} />
                              </div>

                              <div className={`p-4 rounded-2xl border ${colorClass}`}>
                                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                    {icon}
                                    {log.type.replace('_', ' ')}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-400">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300">{log.detail}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Calibration Summary widgets */}
                    <div className="bg-slate-900 border border-white/5 p-6 rounded-[1.5rem]">
                      <h4 className="text-sm font-black uppercase text-white mb-4 flex items-center gap-2">
                        <Award className="text-[#41c8df] w-4 h-4" /> Calibration Breakdown
                      </h4>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                          <div className="text-lg font-black text-emerald-400">{confidentCount}</div>
                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Confident</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-500/5 rounded-xl border border-yellow-500/10">
                          <div className="text-lg font-black text-yellow-400">{unsureCount}</div>
                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Unsure</div>
                        </div>
                        <div className="text-center p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                          <div className="text-lg font-black text-blue-400">{guessCount}</div>
                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Guess / Intuition</div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {totalRated === 0
                          ? "No confidence data was submitted for this attempt. Metacognitive tracking features require students to click a confidence level on questions before submitting."
                          : `The student rated their confidence for ${totalRated} question${totalRated !== 1 ? 's' : ''}. High confidence coupled with incorrect answers indicates strong misconceptions, while correct guesses highlight areas of potential uncertainty.`
                        }
                      </p>
                    </div>

                    {/* Question confidence mapping */}
                    {questions.length > 0 && totalRated > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Question-by-Question Calibration Mapping</h4>
                        <div className="bg-slate-950 border border-white/10 rounded-[1.5rem] overflow-hidden divide-y divide-white/5 max-h-64 overflow-y-auto">
                          {questions.map((q, idx) => {
                            const conf = parsedConfidence[q.id];
                            let ratingText = 'Unrated';
                            let ratingColor = 'bg-white/5 text-gray-500';
                            if (conf === 'confident') {
                              ratingText = 'Highly Confident';
                              ratingColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                            } else if (conf === 'unsure') {
                              ratingText = 'Unsure / Hesitant';
                              ratingColor = 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
                            } else if (conf === 'guess') {
                              ratingText = 'Wild Guess / Instinct';
                              ratingColor = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                            }

                            return (
                              <div key={q.id} className="p-4 flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1 flex flex-col items-start text-left">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-black uppercase text-gray-500">Q{idx + 1}</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{q.type}</span>
                                  </div>
                                  <p className="text-xs text-gray-200 truncate max-w-md">{q.text}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${ratingColor} shrink-0`}>
                                  {ratingText}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex mt-8 pt-4 border-t border-white/5">
                  <button onClick={() => setSelectedResultReport(null)}
                    className="w-full px-6 py-3 border border-white/10 text-gray-400 font-bold rounded-xl hover:bg-white/5 transition-all text-center">
                    Close Audit Log
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default AdminMockTests;
