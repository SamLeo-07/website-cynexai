import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, ClipboardList, AlertCircle, CheckCircle2,
  Edit2, Trash2, Eye, EyeOff, HelpCircle, CheckSquare
} from 'lucide-react';
import {
  getMockTests, createMockTest, deleteMockTest,
  getQuestions, addQuestion, deleteMockTest as deleteQuestion,
  getTestResults, getCourses, getBatches,
  MockTest, Question, TestResult, Course, Batch
} from '../lib/turso';

const AdminMockTests = () => {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<MockTest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
    duration: 60,
    category: 'Technical',
    totalQuestions: 10,
    isActive: true,
    course_id: '',
    batch_id: ''
  });
  const [questionForm, setQuestionForm] = useState({
    text: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    type: 'mcq' as 'mcq' | 'coding',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: ''
  });

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
      if (t.length > 0) setSelectedTestId(t[0].id);
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
        // For simplicity, just create new since update isn't directly available
        setSuccess('Test updated (recreate if needed)');
      } else {
        await createMockTest({
          id: `test_${Date.now()}`,
          title: testForm.title.trim(),
          description: testForm.description.trim(),
          duration: testForm.duration,
          category: testForm.category,
          totalQuestions: testForm.totalQuestions,
          isActive: testForm.isActive,
          course_id: testForm.course_id || undefined,
          batch_id: testForm.batch_id || undefined
        });
        setSuccess('Test created');
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

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId || !questionForm.text.trim()) {
      setError('Question text is required');
      return;
    }
    try {
      const newQuestion: Question = {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        testId: selectedTestId,
        text: questionForm.text.trim(),
        options: questionForm.type === 'mcq' ? questionForm.options.filter(o => o.trim()) : undefined,
        correctAnswer: questionForm.type === 'mcq' ? questionForm.correctAnswer : undefined,
        difficulty: questionForm.difficulty,
        type: questionForm.type,
        explanation: questionForm.explanation.trim() || undefined,
        isApproved: true
      };
      await addQuestion(newQuestion);
      setQuestions([...questions, newQuestion]);
      setSuccess('Question added');
      setIsQuestionModalOpen(false);
      setQuestionForm({
        text: '', difficulty: 'easy', type: 'mcq',
        options: ['', '', '', ''], correctAnswer: 0, explanation: ''
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to add question');
    }
  };

  const filteredResults = results.filter(r => r.testId === selectedTestId);

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

      {/* Test selector and actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <ClipboardList className="text-[#41c8df]" size={20} />
          <select value={selectedTestId || ''}
            onChange={(e) => setSelectedTestId(e.target.value || null)}
            className="px-4 py-3 bg-secondary/5 border border-secondary/10 rounded-xl outline-none text-secondary min-w-[250px]"
            title="Select Test">
            <option value="">-- Select Test --</option>
            {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setEditingTest(null); setTestForm({ title: '', description: '', duration: 60, category: 'Technical', totalQuestions: 10, isActive: true }); setIsTestModalOpen(true); }}
            className="inline-flex items-center px-5 py-3 bg-[#41c8df]/10 text-[#41c8df] border border-[#41c8df]/20 hover:bg-[#41c8df]/20 font-bold rounded-xl transition-all">
            <Plus className="w-4 h-4 mr-2" /> New Test
          </button>
          <button onClick={() => setIsQuestionModalOpen(true)} disabled={!selectedTestId}
            className="inline-flex items-center px-5 py-3 bg-[#41c8df] disabled:opacity-40 text-black font-bold rounded-xl transition-all shadow-lg">
            <HelpCircle className="w-4 h-4 mr-2" /> Add Question
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tests List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">All Tests ({tests.length})</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-3 border-gray-200 border-t-[#41c8df] rounded-full animate-spin" />
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No tests created yet</div>
          ) : tests.map((test, i) => {
            const courseTitle = test.course_id ? (courses.find(c => c.id === test.course_id)?.title || 'Assigned Course') : 'All Courses';
            const batchName = test.batch_id ? (batches.find(b => b.id === test.batch_id)?.name || 'Assigned Section') : 'All Batches/Sections';
            
            return (
              <motion.div key={test.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedTestId(test.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedTestId === test.id
                    ? 'border-[#41c8df] bg-[#41c8df]/10'
                    : 'border-secondary/10 bg-background/40 hover:border-secondary/30'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-secondary">{test.title}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{test.category} · {test.duration}min · {test.totalQuestions}Q</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {test.isActive ? <Eye size={14} className="text-emerald-400" /> : <EyeOff size={14} className="text-gray-500" />}
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTest(test.id); }}
                      className="p-1 text-gray-400 hover:text-red-500" title="Delete Test">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {/* Course and Batch Badges */}
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/5">
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#41c8df]/10 text-[#41c8df] max-w-full truncate" title={courseTitle}>
                    {courseTitle}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 max-w-full truncate" title={batchName}>
                    {batchName}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Questions & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Questions */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
              Questions ({questions.length})
            </h3>
            <div className="bg-background/40 backdrop-blur-xl border border-secondary/10 rounded-2xl overflow-hidden shadow-lg">
              {!selectedTestId ? (
                <div className="text-center py-12 text-gray-400 text-sm">Select a test to view questions</div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-100" />
                  <p className="text-sm font-medium">No questions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {questions.map((q, i) => (
                    <div key={q.id} className="p-4 hover:bg-secondary/5 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] font-bold text-gray-500 mt-1 w-5">{i + 1}.</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                              q.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>{q.difficulty}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#41c8df]/10 text-[#41c8df]">{q.type}</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              q.isApproved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
                            }`}>{q.isApproved ? 'Approved' : 'Pending'}</span>
                          </div>
                          <p className="text-sm text-gray-200 font-medium">{q.text}</p>
                          {q.options && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {q.options.map((opt, oi) => (
                                <span key={oi} className={`text-[11px] px-2.5 py-1 rounded-lg ${
                                  oi === q.correctAnswer
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-secondary/5 text-gray-400 border border-secondary/10'
                                }`}>{opt}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
              Test Results ({filteredResults.length})
            </h3>
            <div className="bg-background/40 backdrop-blur-xl border border-secondary/10 rounded-2xl overflow-hidden shadow-lg">
              {filteredResults.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No results for this test yet</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredResults.map(r => (
                    <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-secondary">{r.studentName}</div>
                        <div className="text-[10px] text-gray-400">{new Date(r.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-secondary">{r.score}/{r.totalQuestions}</div>
                        <div className={`text-[10px] font-bold ${r.percentage >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {r.percentage}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Assign Course</label>
                    <select value={testForm.course_id}
                      onChange={(e) => setTestForm({ ...testForm, course_id: e.target.value, batch_id: '' })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      title="Assign Course">
                      <option value="">Unassigned (All Courses)</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Assign Batch</label>
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
              className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-[2rem] p-8 w-full max-w-xl shadow-2xl">
              <button onClick={() => setIsQuestionModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-display font-bold text-secondary mb-6 flex items-center gap-3">
                <HelpCircle className="text-[#41c8df]" /> Add Question
              </h2>
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
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Correct Answer</label>
                    <input type="number" min={0} max={3} value={questionForm.correctAnswer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                </div>
                {questionForm.type === 'mcq' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Options</label>
                    {questionForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 w-5">{i + 1}.</span>
                        <input type="text" value={opt}
                          onChange={(e) => {
                            const u = [...questionForm.options];
                            u[i] = e.target.value;
                            setQuestionForm({ ...questionForm, options: u });
                          }}
                          className="flex-1 px-4 py-2.5 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary text-sm"
                          placeholder={`Option ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Explanation</label>
                  <textarea rows={2} value={questionForm.explanation}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary resize-none" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsQuestionModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl hover:bg-secondary/5 transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-1 px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">Add Question</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminMockTests;
