import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, CheckCircle, HelpCircle, ArrowUp, Code, X, Send, 
  Trash2, User, Calendar, BookOpen, Layers, Check, Download 
} from 'lucide-react';
import { 
  getDoubtQuestions, 
  createDoubtAnswer, 
  getDoubtAnswers, 
  acceptDoubtAnswer, 
  resolveDoubtQuestion, 
  deleteDoubtQuestion, 
  DoubtQuestion, 
  DoubtAnswer 
} from '../lib/turso';

interface AdminDoubtWallProps {
  adminName: string;
  courses: { id: string; title: string }[];
}

export const AdminDoubtWall: React.FC<AdminDoubtWallProps> = ({
  adminName,
  courses
}) => {
  const [questions, setQuestions] = useState<DoubtQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<DoubtQuestion | null>(null);
  const [answers, setAnswers] = useState<DoubtAnswer[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Post Answer Form State
  const [answerBody, setAnswerBody] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

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

  const handleDownloadDoubts = () => {
    const data = questions.map(q => ({
      ID: q.id,
      Title: q.title,
      Course: getCourseTitle(q.course_id),
      StudentName: q.student_name,
      Description: q.body,
      Resolved: q.is_resolved ? 'Yes' : 'No',
      Upvotes: q.upvotes || 0,
      Date: q.created_at
    }));
    exportToCSV(data, 'doubt_questions_report.csv', ['Doubt ID', 'Title', 'Course', 'Student Name', 'Description', 'Resolved', 'Upvotes', 'Created At']);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const q = await getDoubtQuestions(selectedCourseFilter === 'all' ? undefined : selectedCourseFilter);
      // Sort: unresolved (is_resolved = 0) first, then by date desc
      const sorted = [...q].sort((a, b) => {
        if (a.is_resolved !== b.is_resolved) {
          return a.is_resolved - b.is_resolved; // 0 comes before 1
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setQuestions(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedCourseFilter]);

  const handleOpenDetail = async (q: DoubtQuestion) => {
    setSelectedQuestion(q);
    try {
      const ans = await getDoubtAnswers(q.id);
      setAnswers(ans);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !answerBody.trim()) return;

    setSubmittingAnswer(true);
    try {
      const combinedBody = showCodeInput && answerCode
        ? `${answerBody}\n\`\`\`code\n${answerCode}\n\`\`\``
        : answerBody;

      const newA: DoubtAnswer = {
        id: crypto.randomUUID(),
        question_id: selectedQuestion.id,
        author_id: 'admin',
        author_name: adminName || 'CynexAI Instructor',
        author_role: 'admin',
        body: combinedBody,
        upvotes: 0,
        is_accepted: 0,
        created_at: new Date().toISOString()
      };

      await createDoubtAnswer(newA);
      setAnswerBody('');
      setAnswerCode('');
      setShowCodeInput(false);

      // Reload answers and question status
      const ans = await getDoubtAnswers(selectedQuestion.id);
      setAnswers(ans);
      
      // Auto-resolve question when instructor replies
      await resolveDoubtQuestion(selectedQuestion.id);
      setSelectedQuestion(prev => prev ? { ...prev, is_resolved: 1 } : null);

      await fetchQuestions();
    } catch (err) {
      console.error(err);
      alert("Failed to submit answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleResolveQuestion = async (qId: string) => {
    try {
      await resolveDoubtQuestion(qId);
      setSelectedQuestion(prev => prev ? { ...prev, is_resolved: 1 } : null);
      await fetchQuestions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteDoubtQuestion(qId);
      setSelectedQuestion(null);
      await fetchQuestions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptAnswer = async (aId: string) => {
    if (!selectedQuestion) return;
    try {
      await acceptDoubtAnswer(aId, selectedQuestion.id);
      setAnswers(answers.map(a => a.id === aId ? { ...a, is_accepted: 1 } : { ...a, is_accepted: 0 }));
      setSelectedQuestion(prev => prev ? { ...prev, is_resolved: 1 } : null);
      await fetchQuestions();
    } catch (e) {
      console.error(e);
    }
  };

  const renderMessageContent = (content: string) => {
    const codeBlockRegex = /```(?:code|javascript|python|java)?\n([\s\S]*?)\n```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<p key={lastIndex} className="whitespace-pre-wrap leading-relaxed text-sm text-gray-300 font-medium mb-4">{content.substring(lastIndex, match.index)}</p>);
      }
      parts.push(
        <div key={match.index} className="relative my-4">
          <pre className="bg-gray-950 text-[#41c8df] font-mono text-xs md:text-sm p-4 rounded-xl overflow-x-auto border border-gray-800">
            <code>{match[1]}</code>
          </pre>
        </div>
      );
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(<p key={lastIndex} className="whitespace-pre-wrap leading-relaxed text-sm text-gray-300 font-medium">{content.substring(lastIndex)}</p>);
    }

    return parts;
  };

  const getCourseTitle = (courseId: string) => {
    const c = courses.find(item => item.id === courseId);
    return c ? c.title : 'General';
  };

  // Stats
  const totalQuestions = questions.length;
  const unresolvedQuestions = questions.filter(q => q.is_resolved === 0).length;
  const answeredToday = questions.filter(q => {
    const d = new Date(q.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString() && q.is_resolved === 1;
  }).length;

  return (
    <div className="space-y-8 text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-white">Doubt wall Resolution</h3>
          <p className="text-sm text-gray-400 font-medium">Review pending student tickets, post replies, and manage discussions.</p>
        </div>
        {questions.length > 0 && (
          <button
            onClick={handleDownloadDoubts}
            className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-md"
            title="Download Doubts as CSV"
          >
            <Download size={18} /> Download doubts
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Forum Questions</p>
            <h4 className="text-3xl font-black">{totalQuestions}</h4>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
            <MessageSquare size={22} />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Unresolved Questions</p>
            <h4 className="text-3xl font-black text-orange-400">{unresolvedQuestions}</h4>
          </div>
          <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-400">
            <HelpCircle size={22} />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Solved Today</p>
            <h4 className="text-3xl font-black text-green-400">{answeredToday}</h4>
          </div>
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
            <CheckCircle size={22} />
          </div>
        </div>
      </div>

      {/* Course Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-gray-700">
        <button
          onClick={() => setSelectedCourseFilter('all')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shrink-0 ${
            selectedCourseFilter === 'all' 
              ? 'bg-[#41c8df] text-black' 
              : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          All Topics
        </button>
        {courses.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCourseFilter(c.id)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shrink-0 ${
              selectedCourseFilter === c.id
                ? 'bg-[#41c8df] text-black'
                : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Main Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Questions list (5 cols) */}
        <div className="lg:col-span-5 space-y-4 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-gray-400">
              Loading wall queries...
            </div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              No questions found on doubt wall.
            </div>
          ) : (
            questions.map(q => {
              const isSelected = selectedQuestion?.id === q.id;
              
              return (
                <div
                  key={q.id}
                  onClick={() => handleOpenDetail(q)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                    isSelected 
                      ? 'border-[#41c8df] bg-[#41c8df]/5' 
                      : q.is_resolved === 0
                      ? 'border-l-4 border-l-orange-500 border-gray-750 bg-gray-800 hover:bg-gray-750/70'
                      : 'border-gray-750 bg-gray-850 hover:bg-gray-800'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'rgba(65, 200, 223, 0.05)' : ''
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-black text-[#41c8df] bg-[#41c8df]/10 border border-[#41c8df]/25 px-2 py-0.5 rounded uppercase">
                        {getCourseTitle(q.course_id)}
                      </span>
                      
                      {q.is_resolved === 1 ? (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                          <Check size={8} /> Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                          Pending
                        </span>
                      )}
                    </div>

                    <h5 className="font-bold text-white text-sm line-clamp-1 mb-1">{q.title}</h5>
                    <p className="text-xs text-gray-400 line-clamp-2">{q.body.replace(/```[\s\S]*?```/g, '[Code]')}</p>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-gray-500 pt-2 border-t border-gray-700/50">
                    <span>By: {q.student_name}</span>
                    <span>Upvotes: {q.upvotes}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detailed Question & Answer Pane (7 cols) */}
        <div className="lg:col-span-7">
          {selectedQuestion ? (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 md:p-8 shadow-sm space-y-8">
              
              {/* Question description */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-[#41c8df] bg-[#41c8df]/10 border border-[#41c8df]/20 px-2.5 py-1 rounded-md uppercase">
                      {getCourseTitle(selectedQuestion.course_id)}
                    </span>
                    <span className="text-[9px] text-gray-400 flex items-center gap-1">
                      <User size={10} /> {selectedQuestion.student_name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedQuestion.is_resolved === 0 && (
                      <button
                        onClick={() => handleResolveQuestion(selectedQuestion.id)}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/25 hover:border-emerald-500/50 rounded-xl text-[10px] font-bold text-emerald-400 transition-all uppercase tracking-wider"
                      >
                        Mark Resolved
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/25 text-red-400 rounded-xl border border-red-500/20 transition-all"
                      title="Delete Question"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h4 className="text-xl font-bold text-white leading-snug">{selectedQuestion.title}</h4>
                
                <div className="pt-2">
                  {renderMessageContent(selectedQuestion.body)}
                </div>
              </div>

              {/* Answers list */}
              <div className="space-y-4 border-t border-gray-700 pt-6">
                <h5 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Replies ({answers.length})</h5>
                
                {answers.map(ans => (
                  <div 
                    key={ans.id} 
                    className={`p-5 rounded-xl border ${
                      ans.is_accepted === 1 
                        ? 'border-emerald-500/30 bg-emerald-500/5' 
                        : 'border-gray-700 bg-gray-900/50'
                    } relative overflow-hidden`}
                  >
                    {ans.is_accepted === 1 && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-black font-bold px-3 py-1 text-[8px] uppercase tracking-wider rounded-bl-lg">
                        Accepted
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        ans.author_role === 'admin' 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                        {ans.author_role === 'admin' ? 'Instructor' : 'Student'}
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold">{ans.author_name}</span>
                    </div>

                    <div>
                      {renderMessageContent(ans.body)}
                    </div>

                    {ans.is_accepted === 0 && ans.author_role !== 'admin' && (
                      <button
                        onClick={() => handleAcceptAnswer(ans.id)}
                        className="mt-3 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-emerald-500/20"
                      >
                        Accept Solution
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Post reply Form */}
              <form onSubmit={handlePostAnswerSubmit} className="space-y-4 border-t border-gray-700 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Instructor Reply</span>
                  
                  <button
                    type="button"
                    onClick={() => setShowCodeInput(!showCodeInput)}
                    className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border transition-all ${
                      showCodeInput 
                        ? 'bg-[#41c8df]/10 border-[#41c8df]/30 text-[#41c8df]' 
                        : 'bg-gray-900 border-gray-700 text-gray-500'
                    }`}
                  >
                    <Code size={10} /> {showCodeInput ? 'Remove Code' : 'Attach Code'}
                  </button>
                </div>

                <textarea
                  required
                  rows={4}
                  value={answerBody}
                  onChange={(e) => setAnswerBody(e.target.value)}
                  placeholder="Type your official instructor response..."
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#41c8df] focus:outline-none w-full text-sm"
                />

                {showCodeInput && (
                  <textarea
                    rows={5}
                    value={answerCode}
                    onChange={(e) => setAnswerCode(e.target.value)}
                    placeholder="// Paste code block here..."
                    className="bg-gray-950 text-[#41c8df] border-0 rounded-xl px-4 py-3 font-mono text-xs focus:ring-1 focus:ring-[#41c8df] outline-none resize-none"
                  />
                )}

                <button
                  type="submit"
                  disabled={submittingAnswer || !answerBody.trim()}
                  className="px-6 py-2.5 bg-[#41c8df] hover:bg-[#2bb5cc] text-black font-bold rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-[#41c8df]/15"
                >
                  <Send size={12} /> {submittingAnswer ? 'Posting...' : 'Send Reply'}
                </button>
              </form>

            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-sm font-bold uppercase tracking-wider">No discussion open</p>
              <p className="text-xs text-gray-400 mt-1">Select a question from the sidebar list to inspect replies and post replies.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
