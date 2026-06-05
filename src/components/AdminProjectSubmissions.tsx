import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Search, FileArchive, Link as LinkIcon, CheckCircle, Clock, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  ProjectSubmission, 
  getPaginatedProjectSubmissions, 
  getProjects, 
  getUsers, 
  Project, 
  User, 
  updateProjectSubmission 
} from '../lib/turso';

export const AdminProjectSubmissions = () => {
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const PAGE_SIZE = 10;
  
  // Grading Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<ProjectSubmission | null>(null);
  const [score, setScore] = useState<number | ''>('');
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'needs_work'>('pending');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSubmissions();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchQuery]);

  const fetchStudents = async () => {
    try {
      const allStudents = await getUsers();
      setStudents(allStudents.filter(u => u.role === 'student'));
    } catch (e) {
      console.error('Failed to load students', e);
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { submissions: data, total } = await getPaginatedProjectSubmissions(
        currentPage,
        PAGE_SIZE,
        searchQuery
      );
      setSubmissions(data);
      setTotalSubmissions(total);
    } catch (error) {
      console.error('Failed to load project submissions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setSaving(true);
    try {
      const updatedSubmission = {
        ...selectedSubmission,
        score: score === '' ? undefined : Number(score),
        feedback,
        status,
      };
      await updateProjectSubmission(updatedSubmission);
      
      setSubmissions(submissions.map(s => s.id === updatedSubmission.id ? updatedSubmission : s));
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Failed to save grade', error);
    } finally {
      setSaving(false);
    }
  };

  const openGradeModal = (sub: ProjectSubmission) => {
    setSelectedSubmission(sub);
    setScore(sub.score || '');
    setFeedback(sub.feedback || '');
    setStatus(sub.status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100/10 text-emerald-400 border border-emerald-500/20';
      case 'needs_work': return 'bg-red-100/10 text-red-400 border border-red-500/20';
      default: return 'bg-orange-100/10 text-orange-400 border border-orange-500/20';
    }
  };

  const totalPages = Math.ceil(totalSubmissions / PAGE_SIZE) || 1;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Project Submissions</h2>
          <p className="text-slate-400">Review and grade student project submissions.</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search students or projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-md pl-10 pr-4 py-2 text-white focus:border-indigo-500 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
          <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Submissions Found</h3>
          <p className="text-slate-400">There are no project submissions matching your search.</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Project</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Submission</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {submissions.map((sub) => {
                    const student = students.find(s => s.id === sub.student_id);
                    const studentName = student?.name || sub.studentName || 'Unknown Student';
                    const isCustom = sub.project_id === 'custom';
                    
                    return (
                      <tr key={sub.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{studentName}</div>
                          <div className="text-xs text-slate-400">{student?.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isCustom ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                Custom
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                Assigned
                              </span>
                            )}
                            <span className="text-sm text-slate-200 line-clamp-1 max-w-[200px]" title={isCustom ? sub.custom_title : sub.project_id}>
                              {isCustom ? sub.custom_title : 'Assigned Project'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            {sub.submission_url && (
                              <a href={sub.submission_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1.5 text-blue-400 hover:text-blue-300 w-fit">
                                <LinkIcon size={12} /> View Link
                              </a>
                            )}
                            {sub.submission_file && (
                              <div className="text-xs flex items-center gap-1.5 text-slate-400">
                                <FileArchive size={12} /> {sub.submission_file}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(sub.status)}`}>
                            {sub.status.replace('_', ' ')}
                          </span>
                          {sub.score !== undefined && sub.score !== null && (
                            <span className="ml-2 text-xs font-bold text-indigo-400">{sub.score} XP</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => openGradeModal(sub)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-colors"
                          >
                            Grade
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-slate-800/30 px-6 py-4 border border-slate-700/80 rounded-xl">
              <div className="text-sm text-slate-400 font-medium">
                Showing <span className="text-white font-bold">{Math.min((currentPage - 1) * PAGE_SIZE + 1, totalSubmissions)}</span> to{' '}
                <span className="text-white font-bold">{Math.min(currentPage * PAGE_SIZE, totalSubmissions)}</span> of{' '}
                <span className="text-white font-bold">{totalSubmissions}</span> submissions
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-700 rounded-md bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-700 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  if (totalPages > 5 && Math.abs(p - currentPage) > 1 && p !== 1 && p !== totalPages) {
                    if (p === 2 || p === totalPages - 1) {
                      return <span key={p} className="text-slate-500 px-1 font-medium select-none">...</span>;
                    }
                    return null;
                  }
                  
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        currentPage === p
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                          : 'border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-700 rounded-md bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-700 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Grade Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !saving && setSelectedSubmission(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
              <h3 className="text-lg font-bold text-white">Grade Submission</h3>
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleGradeSubmit} className="p-6 space-y-4">
              {selectedSubmission.project_id === 'custom' && selectedSubmission.custom_description && (
                <div className="p-3 bg-slate-900/50 rounded-md border border-slate-700 mb-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Description</p>
                  <p className="text-sm text-slate-300">{selectedSubmission.custom_description}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Score (XP)</label>
                <input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. 100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="needs_work">Needs Work</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-3 py-2 text-white focus:border-indigo-500 outline-none transition-all resize-none font-medium text-sm"
                  rows={4}
                  placeholder="Provide constructive feedback..."
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                >
                  {saving ? 'Saving...' : 'Save Grade'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

