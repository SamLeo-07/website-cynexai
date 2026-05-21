import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Megaphone, AlertCircle, CheckCircle2,
  Trash2, Eye, EyeOff
} from 'lucide-react';
import {
  getAnnouncements, createAnnouncement, deleteAnnouncement,
  toggleAnnouncementStatus, getCourses,
  Announcement, Course
} from '../lib/turso';

const AdminNotifications = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_audience: 'all' as 'all' | 'course',
    course_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [anns, crs] = await Promise.all([getAnnouncements(), getCourses(true)]);
      setAnnouncements(anns);
      setCourses(crs);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      setError('Title and message are required');
      return;
    }
    try {
      const newAnnouncement = {
        id: `ann_${Date.now()}`,
        title: formData.title.trim(),
        message: formData.message.trim(),
        target_audience: formData.target_audience,
        course_id: formData.target_audience === 'course' ? formData.course_id : undefined,
        created_by: 'admin',
        isActive: true
      };
      await createAnnouncement(newAnnouncement);
      setAnnouncements([{ ...newAnnouncement, created_at: new Date().toISOString() }, ...announcements]);
      setSuccess('Announcement published!');
      setIsModalOpen(false);
      setFormData({ title: '', message: '', target_audience: 'all', course_id: '' });
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to create announcement');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleAnnouncementStatus(id, !isActive);
      setAnnouncements(announcements.map(a => a.id === id ? { ...a, isActive: !isActive } : a));
    } catch {
      setError('Failed to toggle status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements(announcements.filter(a => a.id !== id));
      setSuccess('Announcement deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete');
    }
  };

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

      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-gray-400">Broadcast announcements to students. {announcements.length} total</p>
        <button onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">
          <Plus className="w-5 h-5 mr-2" /> New Announcement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#41c8df] rounded-full animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Megaphone className="w-12 h-12 mx-auto mb-2 text-gray-100" />
            <p className="text-sm font-medium">No announcements yet</p>
          </div>
        ) : announcements.map((ann, i) => (
          <motion.div key={ann.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className={`bg-background/40 backdrop-blur-xl border ${ann.isActive ? 'border-[#41c8df]/20' : 'border-secondary/10'} rounded-2xl p-5 shadow-lg`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Megaphone className={`w-4 h-4 ${ann.isActive ? 'text-[#41c8df]' : 'text-gray-500'}`} />
                  <h3 className="text-base font-bold text-secondary">{ann.title}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    ann.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'
                  }`}>{ann.isActive ? 'Active' : 'Inactive'}</span>
                  {ann.target_audience === 'course' && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400">
                      Course-specific
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{ann.message}</p>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  <span>Target: {ann.target_audience}</span>
                  {ann.course_id && <span>Course ID: {ann.course_id.substring(0, 12)}...</span>}
                  <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(ann.id, ann.isActive)}
                  className="p-2 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 rounded-lg transition-all"
                  title={ann.isActive ? 'Deactivate' : 'Activate'}>
                  {ann.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button onClick={() => handleDelete(ann.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-background/90 backdrop-blur-2xl border border-secondary/20 rounded-[2rem] p-8 w-full max-w-xl shadow-2xl">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Close">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-display font-bold text-secondary mb-6 flex items-center gap-3">
                <Megaphone className="text-[#41c8df]" /> New Announcement
              </h2>
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Title *</label>
                  <input type="text" required value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                    placeholder="e.g., New Course Drop - AI & ML" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Message *</label>
                  <textarea required rows={4} value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary resize-none"
                    placeholder="Write your announcement message..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Target Audience</label>
                  <select value={formData.target_audience}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as any })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                    title="Target Audience">
                    <option value="all">All Students</option>
                    <option value="course">Specific Course</option>
                  </select>
                </div>
                {formData.target_audience === 'course' && (
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Course *</label>
                    <select required value={formData.course_id}
                      onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      title="Select Course">
                      <option value="">-- Select --</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl hover:bg-secondary/5 transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-1 px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">Publish</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminNotifications;
