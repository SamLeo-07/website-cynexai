import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Plus, ArrowUp, CheckCircle, 
  ChevronRight, Calendar, User, Code, X, Send, Eye 
} from 'lucide-react';
import { 
  getDoubtQuestions, 
  createDoubtQuestion, 
  getDoubtAnswers, 
  createDoubtAnswer, 
  upvoteDoubtQuestion, 
  upvoteDoubtAnswer, 
  acceptDoubtAnswer, 
  DoubtQuestion, 
  DoubtAnswer 
} from '../lib/turso';

interface DoubtWallProps {
  studentId: string;
  studentName: string;
  enrollments: { 
    enrollment: { course_id: string }; 
    course: { id: string; title: string } 
  }[];
}

type View = 'list' | 'detail';

export const DoubtWall: React.FC<DoubtWallProps> = ({
  studentId,
  studentName,
  enrollments
}) => {
  const [view, setView] = useState<View>('list');
  const [questions, setQuestions] = useState<DoubtQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<DoubtQuestion | null>(null);
  const [answers, setAnswers] = useState<DoubtAnswer[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Ask Question Form State
  const [askFormData, setAskFormData] = useState({
    title: '',
    body: '',
    code: '',
    course_id: '',
    tags: ''
  });
  const [showCodeInput, setShowCodeInput] = useState(false);
  
  // Post Answer Form State
  const [answerBody, setAnswerBody] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [showAnswerCodeInput, setShowAnswerCodeInput] = useState(false);
  
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const q = await getDoubtQuestions(selectedCourseFilter === 'all' ? undefined : selectedCourseFilter);
      setQuestions(q);
    } catch (e) {
      console.error("Failed to fetch doubts", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedCourseFilter]);

  useEffect(() => {
    if (enrollments.length > 0 && !askFormData.course_id) {
      setAskFormData(prev => ({ ...prev, course_id: enrollments[0].course.course_id || enrollments[0].course.id }));
    }
  }, [enrollments]);

  const loadQuestionDetail = async (q: DoubtQuestion) => {
    setSelectedQuestion(q);
    setView('detail');
    try {
      const ans = await getDoubtAnswers(q.id);
      setAnswers(ans);
    } catch (e) {
      console.error("Failed to load answers", e);
    }
  };

  const handleAskQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askFormData.title || !askFormData.body || !askFormData.course_id) return;
    
    setSubmittingQuestion(true);
    
    try {
      const combinedBody = showCodeInput && askFormData.code 
        ? `${askFormData.body}\n\`\`\`code\n${askFormData.code}\n\`\`\``
        : askFormData.body;

      const tagsArray = askFormData.tags
        ? askFormData.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
        : [];

      const newQ: DoubtQuestion = {
        id: crypto.randomUUID(),
        course_id: askFormData.course_id,
        student_id: studentId,
        student_name: studentName,
        title: askFormData.title,
        body: combinedBody,
        tags: JSON.stringify(tagsArray),
        upvotes: 0,
        is_resolved: 0,
        created_at: new Date().toISOString()
      };

      await createDoubtQuestion(newQ);
      setIsAskModalOpen(false);
      setAskFormData({
        title: '',
        body: '',
        code: '',
        course_id: enrollments[0]?.course.id || '',
        tags: ''
      });
      setShowCodeInput(false);
      await fetchQuestions();
    } catch (e) {
      console.error(e);
      alert("Failed to submit question.");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handlePostAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !answerBody.trim()) return;

    setSubmittingAnswer(true);
    try {
      const combinedAnswerBody = showAnswerCodeInput && answerCode 
        ? `${answerBody}\n\`\`\`code\n${answerCode}\n\`\`\``
        : answerBody;

      const newA: DoubtAnswer = {
        id: crypto.randomUUID(),
        question_id: selectedQuestion.id,
        author_id: studentId,
        author_name: studentName,
        author_role: 'student',
        body: combinedAnswerBody,
        upvotes: 0,
        is_accepted: 0,
        created_at: new Date().toISOString()
      };

      await createDoubtAnswer(newA);
      setAnswerBody('');
      setAnswerCode('');
      setShowAnswerCodeInput(false);
      
      // Reload answers
      const ans = await getDoubtAnswers(selectedQuestion.id);
      setAnswers(ans);
    } catch (e) {
      console.error(e);
      alert("Failed to submit answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleQuestionUpvote = async (qId: string) => {
    try {
      await upvoteDoubtQuestion(qId);
      // Update locally
      setQuestions(questions.map(q => q.id === qId ? { ...q, upvotes: q.upvotes + 1 } : q));
      if (selectedQuestion && selectedQuestion.id === qId) {
        setSelectedQuestion(prev => prev ? { ...prev, upvotes: prev.upvotes + 1 } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnswerUpvote = async (aId: string) => {
    try {
      await upvoteDoubtAnswer(aId);
      setAnswers(answers.map(a => a.id === aId ? { ...a, upvotes: a.upvotes + 1 } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptAnswer = async (aId: string) => {
    if (!selectedQuestion) return;
    try {
      await acceptDoubtAnswer(aId, selectedQuestion.id);
      // Update local state
      setAnswers(answers.map(a => a.id === aId ? { ...a, is_accepted: 1 } : { ...a, is_accepted: 0 }));
      setSelectedQuestion(prev => prev ? { ...prev, is_resolved: 1 } : null);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to parse question body and extract text and code blocks
  const renderMessageContent = (content: string) => {
    const codeBlockRegex = /```(?:code|javascript|python|java)?\n([\s\S]*?)\n```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<p key={lastIndex} className="whitespace-pre-wrap leading-relaxed text-sm text-secondary/80 font-medium mb-4">{content.substring(lastIndex, match.index)}</p>);
      }
      parts.push(
        <div key={match.index} className="relative group/code my-4">
          <div className="absolute top-3 right-3 text-[8px] font-black text-secondary/60 uppercase tracking-widest bg-slate-950 px-2 py-1 rounded">Code Block</div>
          <pre className="bg-slate-950 text-indigo-400 font-mono text-xs md:text-sm p-4 rounded-md overflow-x-auto shadow-inner leading-relaxed">
            <code>{match[1]}</code>
          </pre>
        </div>
      );
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(<p key={lastIndex} className="whitespace-pre-wrap leading-relaxed text-sm text-secondary/80 font-medium">{content.substring(lastIndex)}</p>);
    }

    return parts;
  };

  const getCourseTitle = (courseId: string) => {
    const course = enrollments.find(e => e.course.id === courseId);
    return course ? course.course.title : 'General';
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-3xl lg:text-4xl font-black text-secondary mb-2 tracking-tight">Doubt Wall</h3>
          <p className="text-sm lg:text-base text-secondary/60 font-medium">Post problems, paste code snippets, and review expert replies.</p>
        </div>
        
        {view === 'list' && (
          <button
            onClick={() => setIsAskModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-900/10"
          >
            <Plus size={20} /> Ask a Question
          </button>
        )}

        {view === 'detail' && (
          <button
            onClick={() => setView('list')}
            className="w-full sm:w-auto px-6 py-3 bg-secondary/10 hover:bg-secondary/20 text-secondary font-bold rounded-md transition-all"
          >
            Back to Wall
          </button>
        )}
      </div>

      {view === 'list' ? (
        <div className="space-y-8">
          {/* Course filter tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-secondary/10">
            <button
              onClick={() => setSelectedCourseFilter('all')}
              className={`px-5 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest transition-all shrink-0 ${
                selectedCourseFilter === 'all' 
                  ? 'bg-secondary text-background' 
                  : 'text-secondary/60 hover:bg-secondary/10'
              }`}
            >
              All Topics
            </button>
            {enrollments.map(({ course }) => (
              <button
                key={course.id}
                onClick={() => setSelectedCourseFilter(course.id)}
                className={`px-5 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest transition-all shrink-0 ${
                  selectedCourseFilter === course.id
                    ? 'bg-secondary text-background'
                    : 'text-secondary/60 hover:bg-secondary/10'
                }`}
              >
                {course.title}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center h-[30vh] gap-4">
              <div className="w-10 h-10 border-4 border-secondary/10 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-xs font-bold text-secondary/40 uppercase tracking-widest">Loading Wall...</span>
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-background-100 border border-secondary/10 rounded-xl p-10 text-center shadow-sm">
              <MessageSquare className="w-16 h-16 text-secondary/20 mx-auto mb-4" />
              <h4 className="text-xl font-bold text-secondary mb-2">No Doubts Found</h4>
              <p className="text-secondary/60 text-sm max-w-sm mx-auto mb-6">
                Be the first to post a doubt and kick off a conversation!
              </p>
              <button
                onClick={() => setIsAskModalOpen(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md text-xs uppercase tracking-widest transition-all"
              >
                Create Question
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {questions.map((q) => {
                const tags = JSON.parse(q.tags || '[]');
                
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-background-100 border border-secondary/10 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-indigo-600 transition-all group`}
                    onClick={() => loadQuestionDetail(q)}
                  >
                    
                    {/* Left/Main Column */}
                    <div className="space-y-4 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
                          {getCourseTitle(q.course_id)}
                        </span>
                        
                        {q.is_resolved === 1 && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                            <CheckCircle size={10} /> Resolved
                          </span>
                        )}

                        <span className="text-[9px] font-bold text-secondary/40 flex items-center gap-1">
                          <User size={10} /> {q.student_name}
                        </span>

                        <span className="text-[9px] font-bold text-secondary/40 flex items-center gap-1">
                          <Calendar size={10} /> {new Date(q.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xl font-bold text-secondary group-hover:text-indigo-400 transition-colors leading-tight mb-2 line-clamp-1">
                          {q.title}
                        </h4>
                        <p className="text-sm text-secondary/60 font-medium line-clamp-2 pr-6">
                          {q.body.replace(/```[\s\S]*?```/g, '[Code Snippet]')}
                        </p>
                      </div>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {tags.map((tag: string) => (
                            <span key={tag} className="text-[8px] font-mono font-bold text-secondary/60 bg-secondary/10 px-2 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Stats Column */}
                    <div className="flex items-center gap-6 shrink-0 md:border-l md:border-secondary/5 md:pl-8 w-full md:w-auto justify-between md:justify-start">
                      
                      {/* Upvotes */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuestionUpvote(q.id);
                        }}
                        className="flex flex-col items-center justify-center p-3 bg-secondary/5 hover:bg-indigo-500/10 hover:text-indigo-400 border border-secondary/5 hover:border-indigo-500/20 rounded-md w-12 h-12 transition-all text-secondary/60"
                        title="Upvote question"
                      >
                        <ArrowUp size={16} />
                        <span className="text-xs font-black mt-0.5">{q.upvotes}</span>
                      </button>

                      {/* View Button */}
                      <div className="flex items-center gap-2 text-secondary/40 text-xs font-bold uppercase tracking-wider group-hover:text-indigo-400 transition-colors">
                        <Eye size={16} /> View Discussion <ChevronRight size={16} />
                      </div>

                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Question Details View */
        selectedQuestion && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Question & Answers */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Question Main Card */}
              <div className="bg-background-100 border border-secondary/10 rounded-xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2.5 h-full bg-slate-900" />
                
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
                    {getCourseTitle(selectedQuestion.course_id)}
                  </span>
                  
                  {selectedQuestion.is_resolved === 1 && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      <CheckCircle size={10} /> Resolved
                    </span>
                  )}

                  <span className="text-[9px] font-bold text-secondary/40 flex items-center gap-1 ml-auto">
                    <User size={10} /> {selectedQuestion.student_name}
                  </span>

                  <span className="text-[9px] font-bold text-secondary/40 flex items-center gap-1">
                    <Calendar size={10} /> {new Date(selectedQuestion.created_at).toLocaleString()}
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-secondary leading-snug mb-6">
                  {selectedQuestion.title}
                </h2>

                {/* Content */}
                <div className="space-y-4">
                  {renderMessageContent(selectedQuestion.body)}
                </div>

                {/* Question Action Row */}
                <div className="flex items-center gap-4 mt-8 pt-6 border-t border-secondary/5">
                  <button
                    onClick={() => handleQuestionUpvote(selectedQuestion.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/5 hover:bg-secondary/10 text-secondary/80 hover:text-secondary rounded-md font-bold text-xs uppercase tracking-wider border border-secondary/5 transition-all"
                  >
                    <ArrowUp size={14} /> Upvote Question ({selectedQuestion.upvotes})
                  </button>
                </div>
              </div>

              {/* Answers Section */}
              <div className="space-y-6">
                <h3 className="font-bold text-xl text-secondary flex items-center gap-2">
                  Replies ({answers.length})
                </h3>

                {answers.length === 0 ? (
                  <div className="bg-secondary/5 border border-secondary/5 rounded-xl p-10 text-center text-secondary/40">
                    <p className="text-sm font-bold uppercase tracking-wider">No replies posted yet</p>
                    <p className="text-xs text-secondary/40 mt-1">Submit your response below to help this peer.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {answers.map((ans) => (
                      <div 
                        key={ans.id}
                        className={`bg-background-100 border-2 rounded-xl p-6 shadow-sm relative overflow-hidden transition-all ${
                          ans.is_accepted === 1 
                            ? 'border-emerald-400 bg-emerald-50/5' 
                            : 'border-secondary/10'
                        }`}
                      >
                        
                        {ans.is_accepted === 1 && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1.5 rounded-bl-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle size={10} /> Accepted Answer
                          </div>
                        )}

                        <div className="flex items-center gap-3 mb-6">
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                            ans.author_role === 'admin' 
                              ? 'text-amber-700 bg-amber-50 border border-amber-200' 
                              : 'text-secondary/60 bg-secondary/10 border border-secondary/10'
                          }`}>
                            {ans.author_role === 'admin' ? 'Staff Instructor' : 'Student Helper'}
                          </span>

                          <span className="text-[9px] font-bold text-secondary/40 flex items-center gap-1">
                            <User size={10} /> {ans.author_name}
                          </span>

                          <span className="text-[9px] font-bold text-secondary/40 flex items-center gap-1">
                            <Calendar size={10} /> {new Date(ans.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Answer content */}
                        <div className="space-y-4">
                          {renderMessageContent(ans.body)}
                        </div>

                        {/* Answer actions */}
                        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-secondary/5">
                          
                          {/* Upvote Answer */}
                          <button
                            onClick={() => handleAnswerUpvote(ans.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/5 hover:bg-secondary/10 rounded-md text-[10px] font-black uppercase tracking-wider text-slate-600 border border-secondary/5 transition-all"
                          >
                            <ArrowUp size={12} /> {ans.upvotes}
                          </button>

                          {/* Accept Answer (only visible to the question author) */}
                          {selectedQuestion.student_id === studentId && ans.is_accepted === 0 && (
                            <button
                              onClick={() => handleAcceptAnswer(ans.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ml-auto"
                            >
                              <CheckCircle size={12} /> Accept Answer
                            </button>
                          )}

                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Answer Form */}
            <div className="space-y-8">
              <div className="bg-background-100 border border-secondary/10 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-slate-900/5 rounded-md flex items-center justify-center text-secondary">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-secondary">Post Reply</h3>
                    <p className="text-xs text-secondary/60 font-medium">Contribute your knowledge.</p>
                  </div>
                </div>

                <form onSubmit={handlePostAnswerSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[9px] font-black text-secondary/40 uppercase tracking-widest mb-3">Your Answer</label>
                    <textarea
                      required
                      rows={5}
                      value={answerBody}
                      onChange={(e) => setAnswerBody(e.target.value)}
                      placeholder="Explain your solution or suggestion..."
                      className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-3 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none text-secondary font-medium placeholder:text-slate-300 resize-none text-sm transition-all"
                    />
                  </div>

                  {/* Code block toggle */}
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setShowAnswerCodeInput(!showAnswerCodeInput)}
                      className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md border transition-all ${
                        showAnswerCodeInput 
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                          : 'bg-secondary/5 border-secondary/10 text-secondary/60'
                      }`}
                    >
                      <Code size={12} /> {showAnswerCodeInput ? 'Remove Code Snippet' : 'Attach Code Snippet'}
                    </button>

                    {showAnswerCodeInput && (
                      <textarea
                        rows={6}
                        value={answerCode}
                        onChange={(e) => setAnswerCode(e.target.value)}
                        placeholder="// Paste code block here..."
                        className="w-full bg-slate-950 text-indigo-400 border-0 rounded-md px-4 py-3 font-mono text-xs focus:ring-1 focus:ring-indigo-600 outline-none resize-none"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submittingAnswer || !answerBody.trim()}
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md shadow-indigo-900/10 flex items-center justify-center gap-2 text-sm"
                  >
                    <Send size={16} /> {submittingAnswer ? 'Posting...' : 'Submit Reply'}
                  </button>
                </form>
              </div>
            </div>

          </div>
        )
      )}

      {/* Ask Question Modal */}
      <AnimatePresence>
        {isAskModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAskModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-background-100 border border-secondary/10 w-full max-w-2xl rounded-xl shadow-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-secondary/5 flex items-center justify-between bg-secondary/5/50">
                <h3 className="text-2xl font-black text-secondary">Ask a Question</h3>
                <button 
                  onClick={() => setIsAskModalOpen(false)} 
                  className="p-2 bg-background-100 border border-secondary/5 text-secondary/40 hover:text-secondary rounded-md shadow-sm transition-all"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Container */}
              <form onSubmit={handleAskQuestionSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Course selector */}
                <div>
                  <label className="block text-[9px] font-black text-secondary/40 uppercase tracking-widest mb-2">Relates to Course</label>
                  <select
                    value={askFormData.course_id}
                    onChange={(e) => setAskFormData({ ...askFormData, course_id: e.target.value })}
                    className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-3 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none text-secondary font-bold appearance-none transition-all cursor-pointer text-sm"
                    title="Target course"
                  >
                    {enrollments.map(({ course }) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[9px] font-black text-secondary/40 uppercase tracking-widest mb-2">Question Title</label>
                  <input
                    type="text"
                    required
                    value={askFormData.title}
                    onChange={(e) => setAskFormData({ ...askFormData, title: e.target.value })}
                    placeholder="e.g. How to resolve Prisma schema mismatch in Docker?"
                    className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-3 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none text-secondary font-bold placeholder:text-slate-300 text-sm transition-all"
                  />
                </div>

                {/* Body Text */}
                <div>
                  <label className="block text-[9px] font-black text-secondary/40 uppercase tracking-widest mb-2">Body Details</label>
                  <textarea
                    required
                    rows={5}
                    value={askFormData.body}
                    onChange={(e) => setAskFormData({ ...askFormData, body: e.target.value })}
                    placeholder="Describe your issue, what you've tried, and any error message you are seeing..."
                    className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-3 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none text-secondary font-medium placeholder:text-slate-300 resize-none text-sm transition-all"
                  />
                </div>

                {/* Code Attachment */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowCodeInput(!showCodeInput)}
                    className={`inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md border transition-all ${
                      showCodeInput 
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                        : 'bg-secondary/5 border-secondary/10 text-secondary/60'
                    }`}
                  >
                    <Code size={12} /> {showCodeInput ? 'Remove Code Block' : 'Attach Code Block'}
                  </button>

                  {showCodeInput && (
                    <textarea
                      rows={6}
                      value={askFormData.code}
                      onChange={(e) => setAskFormData({ ...askFormData, code: e.target.value })}
                      placeholder="// Paste your code or logs here..."
                      className="w-full bg-slate-950 text-indigo-400 border-0 rounded-md px-4 py-3 font-mono text-xs focus:ring-1 focus:ring-indigo-600 outline-none resize-none"
                    />
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[9px] font-black text-secondary/40 uppercase tracking-widest mb-2">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={askFormData.tags}
                    onChange={(e) => setAskFormData({ ...askFormData, tags: e.target.value })}
                    placeholder="e.g. prisma, mysql, docker"
                    className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-3 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none text-secondary font-bold placeholder:text-slate-300 text-sm transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingQuestion || !askFormData.title || !askFormData.body}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md transition-all disabled:opacity-50 shadow-md shadow-indigo-900/10 text-sm"
                >
                  {submittingQuestion ? 'Posting Question...' : 'Post Question to Wall'}
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
