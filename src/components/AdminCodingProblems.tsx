import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code, Plus, Edit2, Trash2, X, Trash, Play, AlertCircle, Layers, CheckCircle, Terminal, Download
} from 'lucide-react';
import { 
  getCodingProblems, 
  createCodingProblem, 
  updateCodingProblem, 
  deleteCodingProblem, 
  CodingProblem,
  getAllCodeSubmissions,
  CodeSubmission
} from '../lib/turso';

const SUPPORTED_LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'ruby', 'php', 'sql', 'html'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

interface AdminCodingProblemsProps {
  courses: { id: string; title: string }[];
}

export const AdminCodingProblems: React.FC<AdminCodingProblemsProps> = ({
  courses
}) => {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [submissions, setSubmissions] = useState<CodeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<CodingProblem | null>(null);

  // Filters
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [description, setDescription] = useState('');
  const [constraints, setConstraints] = useState('');
  
  // Boilerplate state
  const [boilerplateTab, setBoilerplateTab] = useState<SupportedLanguage>('javascript');
  const [boilerplateMap, setBoilerplateMap] = useState<Record<string, string>>({});

  // Test Cases State
  const [testCases, setTestCases] = useState<{ input: string; expected_output: string }[]>([
    { input: '', expected_output: '' }
  ]);

  const [submitting, setSubmitting] = useState(false);

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

  const handleDownloadProblems = () => {
    const data = problems.map(p => ({
      ID: p.id,
      Title: p.title,
      Course: getCourseTitle(p.course_id),
      Difficulty: p.difficulty,
      Description: p.description,
      Constraints: p.constraints || 'N/A'
    }));
    exportToCSV(data, 'coding_challenges.csv', ['Challenge ID', 'Title', 'Course', 'Difficulty', 'Description', 'Constraints']);
  };

  const handleDownloadSubmissions = () => {
    const data = submissions.map(s => {
      const problem = problems.find(p => p.id === s.problem_id);
      return {
        ID: s.id,
        StudentID: s.student_id,
        Challenge: problem ? problem.title : s.problem_id,
        Language: s.language,
        Status: s.status,
        Runtime: s.runtime_ms + 'ms',
        SubmittedAt: s.submitted_at,
        Code: s.code
      };
    });
    exportToCSV(data, 'student_code_submissions_report.csv', ['Submission ID', 'Student ID', 'Challenge Name', 'Language', 'Status', 'Runtime', 'Submitted At', 'Source Code']);
  };

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        getCodingProblems(),
        getAllCodeSubmissions()
      ]);
      setProblems(p);
      setSubmissions(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
    if (courses.length > 0) {
      setCourseId(courses[0].id);
    }
  }, [courses]);

  const handleOpenAddModal = () => {
    setEditingProblem(null);
    setTitle('');
    setCourseId(courses[0]?.id || '');
    setDifficulty('easy');
    setDescription('');
    setConstraints('');
    setBoilerplateMap({
      javascript: 'function solution(input) {\n    // Write your code here\n    return input;\n}',
      python: 'def solution(input_val):\n    # Write your code here\n    return input_val',
      java: 'public class Solution {\n    public static String solution(String input) {\n        // Write your code here\n        return input;\n    }\n}'
    });
    setTestCases([{ input: '', expected_output: '' }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prob: CodingProblem) => {
    setEditingProblem(prob);
    setTitle(prob.title);
    setCourseId(prob.course_id);
    setDifficulty(prob.difficulty);
    setDescription(prob.description);
    setConstraints(prob.constraints || '');
    
    // Parse boilerplate
    try {
      const bp = JSON.parse(prob.boilerplate || '{}');
      setBoilerplateMap(bp);
    } catch (e) {
      setBoilerplateMap({});
    }

    // Parse test cases
    try {
      const tc = JSON.parse(prob.test_cases || '[]');
      setTestCases(tc.length > 0 ? tc : [{ input: '', expected_output: '' }]);
    } catch (e) {
      setTestCases([{ input: '', expected_output: '' }]);
    }

    setIsModalOpen(true);
  };

  const handleAddTestCaseRow = () => {
    setTestCases([...testCases, { input: '', expected_output: '' }]);
  };

  const handleRemoveTestCaseRow = (index: number) => {
    if (testCases.length === 1) return;
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleTestCaseChange = (index: number, field: 'input' | 'expected_output', value: string) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !courseId) return;

    setSubmitting(true);

    const bpJSON = JSON.stringify(boilerplateMap);

    const tcJSON = JSON.stringify(
      testCases.filter(tc => tc.input.trim() || tc.expected_output.trim())
    );

    const payload: CodingProblem = {
      id: editingProblem ? editingProblem.id : crypto.randomUUID(),
      course_id: courseId,
      title: title,
      description: description,
      difficulty: difficulty,
      boilerplate: bpJSON,
      test_cases: tcJSON,
      constraints: constraints,
      created_at: editingProblem ? editingProblem.created_at : new Date().toISOString()
    };

    try {
      if (editingProblem) {
        await updateCodingProblem(payload);
      } else {
        await createCodingProblem(payload);
      }
      setIsModalOpen(false);
      await fetchProblems();
    } catch (err) {
      console.error(err);
      alert("Failed to save coding problem.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProblem = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this challenge?")) return;
    try {
      await deleteCodingProblem(id);
      await fetchProblems();
    } catch (e) {
      console.error(e);
      alert("Failed to delete challenge.");
    }
  };

  const getCourseTitle = (id: string) => {
    const c = courses.find(item => item.id === id);
    return c ? c.title : 'General';
  };

  // Stats
  const totalCount = problems.length;
  const easyCount = problems.filter(p => p.difficulty === 'easy').length;
  const mediumCount = problems.filter(p => p.difficulty === 'medium').length;
  const hardCount = problems.filter(p => p.difficulty === 'hard').length;

  // Filter list
  const filteredProblems = problems.filter(p => {
    const matchDiff = difficultyFilter === 'all' || p.difficulty === difficultyFilter;
    const matchCourse = courseFilter === 'all' || p.course_id === courseFilter;
    return matchDiff && matchCourse;
  });

  return (
    <div className="space-y-8 text-white">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-900 border border-gray-800 rounded-2xl p-6 gap-4">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-white">Daily Practice (LeetCode Style)</h3>
          <p className="text-sm font-medium text-gray-400 mt-1">Manage algorithmic problems for students to practice daily.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {problems.length > 0 && (
            <button
              onClick={handleDownloadProblems}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
              title="Download Coding Challenges as CSV"
            >
              <Download size={16} /> Download Challenges
            </button>
          )}
          {submissions.length > 0 && (
            <button
              onClick={handleDownloadSubmissions}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
              title="Download Student Submissions as CSV"
            >
              <Download size={16} /> Download Submissions
            </button>
          )}
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-3 bg-[#41c8df] hover:bg-[#2bb5cc] text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#41c8df]/15 text-sm"
          >
            <Plus size={18} /> Add Daily Practice Problem
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Problems</p>
          <h4 className="text-3xl font-black">{totalCount}</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Easy Challenges</p>
          <h4 className="text-3xl font-black text-emerald-400">{easyCount}</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Medium Challenges</p>
          <h4 className="text-3xl font-black text-orange-400">{mediumCount}</h4>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Hard Challenges</p>
          <h4 className="text-3xl font-black text-red-400">{hardCount}</h4>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-60">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as any)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none w-full cursor-pointer"
            title="Difficulty selection filter"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="w-full sm:w-60">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none w-full cursor-pointer"
            title="Course selection filter"
          >
            <option value="all">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Problems table list */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-gray-400">
            Loading problem set...
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Code className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-sm font-bold uppercase tracking-wider">No coding problems found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Challenge Title</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Course Tag</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Difficulty</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredProblems.map((prob) => (
                  <tr key={prob.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-white">
                      {prob.title}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-300">
                      {getCourseTitle(prob.course_id)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        prob.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        prob.difficulty === 'medium' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {prob.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(prob.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(prob)}
                          className="p-2 bg-gray-900 hover:bg-[#41c8df]/10 text-gray-400 hover:text-[#41c8df] rounded-lg border border-gray-700 transition-all"
                          title="Edit Challenge"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteProblem(prob.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/10 transition-all"
                          title="Delete Challenge"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit Coding Challenge */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-gray-800 border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden text-white flex flex-col max-h-[90vh]"
            >
              
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Terminal size={20} className="text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold">{editingProblem ? 'Edit Daily Practice Problem' : 'Add Daily Practice Problem'}</h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-all"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Challenge Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Reverse a Linked List"
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#41c8df] focus:outline-none w-full"
                  />
                </div>

                {/* Course & Difficulty Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Course</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#41c8df] focus:outline-none w-full cursor-pointer text-sm"
                      title="Course selection"
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#41c8df] focus:outline-none w-full cursor-pointer text-sm"
                      title="Difficulty selection"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Problem Description</label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide description, inputs structure, requirements..."
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#41c8df] focus:outline-none w-full resize-none text-sm"
                  />
                </div>

                {/* Constraints */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Constraints</label>
                  <textarea
                    rows={2}
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    placeholder="e.g. 1 <= Node.val <= 5000\nTime limit: 1s"
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#41c8df] focus:outline-none w-full resize-none text-sm"
                  />
                </div>

                {/* Boilerplate Tab Controls */}
                <div className="border border-gray-700 rounded-xl p-4 space-y-4">
                  <div className="flex flex-col border-b border-gray-700 pb-3 gap-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Boilerplate Codes</span>
                    
                    <div className="flex gap-1 bg-gray-900 p-0.5 rounded-lg border border-gray-750 overflow-x-auto no-scrollbar max-w-full">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setBoilerplateTab(lang)}
                          className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                            boilerplateTab === lang 
                              ? 'bg-gray-800 text-white border border-gray-700' 
                              : 'text-gray-500'
                          }`}
                        >
                          {lang === 'javascript' ? 'js' : lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={5}
                    value={boilerplateMap[boilerplateTab] || ''}
                    onChange={(e) => setBoilerplateMap(prev => ({ ...prev, [boilerplateTab]: e.target.value }))}
                    placeholder={`// ${boilerplateTab} starter boilerplate`}
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none w-full"
                  />
                </div>

                {/* Test Cases Dynamic list */}
                <div className="border border-gray-700 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-700 pb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Test Cases</span>
                    <button
                      type="button"
                      onClick={handleAddTestCaseRow}
                      className="px-3 py-1 bg-gray-900 hover:bg-gray-750 border border-gray-700 rounded text-[9px] font-bold uppercase tracking-wider text-[#41c8df]"
                    >
                      + Add Case
                    </button>
                  </div>

                  <div className="space-y-3">
                    {testCases.map((tc, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-900 rounded-xl border border-gray-800">
                        <div className="col-span-5">
                          <label className="block text-[8px] font-bold text-gray-500 uppercase mb-1">Stdin Input</label>
                          <input
                            type="text"
                            required
                            value={tc.input}
                            onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                            placeholder="e.g. [1,2,3,4,5]"
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs w-full"
                          />
                        </div>
                        <div className="col-span-5">
                          <label className="block text-[8px] font-bold text-gray-500 uppercase mb-1">Expected Output</label>
                          <input
                            type="text"
                            required
                            value={tc.expected_output}
                            onChange={(e) => handleTestCaseChange(index, 'expected_output', e.target.value)}
                            placeholder="e.g. [5,4,3,2,1]"
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs w-full"
                          />
                        </div>
                        <div className="col-span-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCaseRow(index)}
                            disabled={testCases.length === 1}
                            className="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 rounded-lg disabled:opacity-30"
                            title="Remove Test Case"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-[#41c8df] hover:bg-[#2bb5cc] text-black font-bold rounded-xl transition-all shadow-lg shadow-[#41c8df]/15 text-sm"
                >
                  {submitting ? 'Saving...' : 'Save Coding Challenge'}
                </button>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
