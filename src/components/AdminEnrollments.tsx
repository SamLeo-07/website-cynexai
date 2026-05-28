import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, BookOpen, User, CheckCircle2,
  AlertCircle, Plus, Filter, Trash2
} from 'lucide-react';
import {
  getAllEnrollments, getUsers, getCourses,
  createEnrollment, deleteEnrollment,
  Enrollment, Course, User
} from '../lib/turso';

interface EnrichedEnrollment extends Enrollment {
  student_name?: string;
  student_email?: string;
  course_title?: string;
}

const AdminEnrollments = () => {
  const [enrollments, setEnrollments] = useState<EnrichedEnrollment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'suspended'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', course_id: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [enrs, usrs, crs] = await Promise.all([
        getAllEnrollments(),
        getUsers(),
        getCourses(true)
      ]);
      const allStudents = usrs.filter(u => u.role === 'student');
      setStudents(allStudents);
      setCourses(crs);
      
      const enriched = enrs.map(enr => ({
        ...enr,
        student_name: allStudents.find(s => s.id === enr.student_id)?.name || enr.student_id,
        student_email: allStudents.find(s => s.id === enr.student_id)?.email || '',
        course_title: crs.find(c => c.id === enr.course_id)?.title || enr.course_id,
      }));
      setEnrollments(enriched);
    } catch (e) {
      setError('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id || !formData.course_id) {
      setError('Please select a student and course');
      return;
    }
    try {
      await createEnrollment({
        id: `enr_${Date.now()}`,
        student_id: formData.student_id,
        course_id: formData.course_id,
        progress_percentage: 0,
        status: 'active'
      });
      setSuccess('Enrollment created successfully');
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to create enrollment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this enrollment?')) return;
    try {
      await deleteEnrollment(id);
      setEnrollments(enrollments.filter(e => e.id !== id));
      setSuccess('Enrollment deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete enrollment');
    }
  };

  const filtered = enrollments.filter(e => {
    const matchesSearch = searchQuery === '' || 
      (e.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.course_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.student_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'completed': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'suspended': return 'bg-red-500/10 border-red-500/30 text-red-400';
      default: return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
    }
  };

  return (
    <div>
      {/* Notifications */}
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by student or course..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-3 bg-secondary/5 border border-secondary/10 rounded-xl outline-none text-secondary appearance-none"
          title="Filter by status">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="suspended">Suspended</option>
        </select>
        <button onClick={() => { setFormData({ student_id: students[0]?.id || '', course_id: courses[0]?.id || '' }); setIsModalOpen(true); }}
          className="inline-flex items-center px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">
          <Plus className="w-5 h-5 mr-2" /> New Enrollment
        </button>
      </div>

      {/* Table */}
      <div className="bg-background/40 backdrop-blur-xl border border-secondary/10 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-secondary/5 border-b border-secondary/10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-[#41c8df] rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-100" />
                  <span className="text-sm font-medium">No enrollments found</span>
                </td></tr>
              ) : filtered.map((enr) => (
                <tr key={enr.id} className="hover:bg-secondary/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[#41c8df] font-bold text-sm">
                        {(enr.student_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-secondary">{enr.student_name}</div>
                        <div className="text-xs text-gray-400">{enr.student_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 font-medium">{enr.course_title}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-secondary/10 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#41c8df] to-cyan-400 rounded-full"
                          style={{ width: `${enr.progress_percentage}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-400">{enr.progress_percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(enr.status)}`}>
                      {enr.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(enr.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete Enrollment">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Enrollment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-display font-bold text-secondary mb-6 flex items-center gap-3">
                <BookOpen className="text-[#41c8df]" /> New Enrollment
              </h2>
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Student *</label>
                  <select required value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                    title="Select Student">
                    <option value="">-- Select Student --</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Course *</label>
                  <select required value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                    title="Select Course">
                    <option value="">-- Select Course --</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl hover:bg-secondary/5 transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-1 px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">Create Enrollment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminEnrollments;
