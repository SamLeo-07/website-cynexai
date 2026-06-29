import React, { useEffect, useState } from 'react';
import { Brain, Plus, Trash2 } from 'lucide-react';
import { DailyQuiz, getDailyQuizzes, createDailyQuiz, QuizSubmission, getQuizSubmissions, User, getUsers } from '../lib/turso';
import { useToast } from './ToastContext';

export const AdminDailyQuiz: React.FC = () => {
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState<DailyQuiz[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([{ q: '', options: ['', '', '', ''], answer: '' }]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [allQuizzes, allSubmissions, allUsers] = await Promise.all([
      getDailyQuizzes(),
      getQuizSubmissions(),
      getUsers()
    ]);
    setQuizzes(allQuizzes);
    setSubmissions(allSubmissions);
    setUsers(allUsers);
    setLoading(false);
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { q: '', options: ['', '', '', ''], answer: '' }]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: string, value: string) => {
    const updated = [...questions];
    if (field === 'q') updated[index].q = value;
    if (field === 'answer') updated[index].answer = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Title is required", "error");
      return;
    }

    // Validate
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.q.trim() || q.options.some(o => !o.trim()) || !q.answer.trim()) {
        showToast(`Question ${i + 1} is incomplete. Ensure all fields and the correct answer are filled.`, "error");
        return;
      }
      if (!q.options.includes(q.answer)) {
        showToast(`For Question ${i + 1}, the answer must exactly match one of the options.`, "error");
        return;
      }
    }

    const newQuiz: DailyQuiz = {
      id: crypto.randomUUID(),
      date,
      title,
      questions: JSON.stringify(questions),
      created_at: new Date().toISOString()
    };

    await createDailyQuiz(newQuiz);
    setQuizzes([newQuiz, ...quizzes]);
    showToast("Quiz created successfully!", "success");
    
    // Reset form
    setTitle('');
    setQuestions([{ q: '', options: ['', '', '', ''], answer: '' }]);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading quiz data...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <Brain className="w-6 h-6 mr-3 text-indigo-500" />
          Daily Quiz Management
        </h2>
        <p className="text-slate-500">Create daily knowledge quizzes and view student submissions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Quiz Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Create New Quiz</h3>
          <form onSubmit={handleSubmitQuiz} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Quiz Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. JavaScript Basics"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-semibold text-slate-800">Questions</h4>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Question
                </button>
              </div>

              {questions.map((q, qIndex) => (
                <div key={qIndex} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4 relative">
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Question {qIndex + 1}</label>
                    <input
                      type="text"
                      value={q.q}
                      onChange={e => handleQuestionChange(qIndex, 'q', e.target.value)}
                      placeholder="Enter question text..."
                      className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex}>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Option {oIndex + 1}</label>
                        <input
                          type="text"
                          value={opt}
                          onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Correct Answer</label>
                    <select
                      value={q.answer}
                      onChange={e => handleQuestionChange(qIndex, 'answer', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500 bg-white"
                      required
                    >
                      <option value="">Select correct option...</option>
                      {q.options.filter(o => o.trim() !== '').map((opt, idx) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-md shadow-indigo-500/20"
            >
              Create Quiz
            </button>
          </form>
        </div>

        {/* Quiz List & Submissions */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[800px]">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Past Quizzes & Results</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {quizzes.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No quizzes created yet.</p>
            ) : (
              quizzes.map(quiz => {
                const quizSubs = submissions.filter(s => s.quiz_id === quiz.id);
                let qCount = 0;
                try { qCount = JSON.parse(quiz.questions).length; } catch(e){}

                return (
                  <div key={quiz.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800">{quiz.title}</h4>
                        <p className="text-xs text-slate-500">{new Date(quiz.date).toLocaleDateString()} • {qCount} Questions</p>
                      </div>
                      <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                        {quizSubs.length} Submissions
                      </span>
                    </div>

                    {quizSubs.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Submissions</h5>
                        <div className="max-h-40 overflow-y-auto pr-1">
                          {quizSubs.map(sub => {
                            const student = users.find(u => u.id === sub.student_id);
                            return (
                              <div key={sub.id} className="flex justify-between items-center text-sm py-1 border-b border-slate-200 last:border-0">
                                <span className="text-slate-700">{student?.name || 'Unknown Student'}</span>
                                <span className="font-bold text-emerald-600">{sub.score} / {qCount}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDailyQuiz;
