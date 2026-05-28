import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, BookOpen, AlertCircle, CheckCircle2,
  Edit2, Trash2, Video, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  getCourses, getLessonsByCourse, getAllLessons,
  createLesson, updateLesson, deleteLesson,
  Course, Lesson
} from '../lib/turso';

const AdminLessons = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    module_name: '',
    lesson_title: '',
    video_url: '',
    order_index: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadLessons();
    }
  }, [selectedCourseId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const crs = await getCourses(true);
      setCourses(crs);
      if (crs.length > 0) setSelectedCourseId(crs[0].id);
    } catch {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async () => {
    if (!selectedCourseId) return;
    try {
      const less = await getLessonsByCourse(selectedCourseId);
      setAllLessons(less);
    } catch {
      setError('Failed to load lessons');
    }
  };

  const handleOpenModal = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setFormData({
        module_name: lesson.module_name,
        lesson_title: lesson.lesson_title,
        video_url: lesson.video_url,
        order_index: lesson.order_index
      });
    } else {
      setEditingLesson(null);
      setFormData({
        module_name: '',
        lesson_title: '',
        video_url: '',
        order_index: allLessons.length + 1
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !formData.lesson_title.trim()) {
      setError('Lesson title is required');
      return;
    }
    try {
      if (editingLesson) {
        await updateLesson({
          ...editingLesson,
          ...formData,
          course_id: selectedCourseId
        });
        setSuccess('Lesson updated');
      } else {
        await createLesson({
          id: `les_${Date.now()}`,
          course_id: selectedCourseId,
          ...formData
        });
        setSuccess('Lesson created');
      }
      setIsModalOpen(false);
      loadLessons();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save lesson');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this lesson?')) return;
    try {
      await deleteLesson(id);
      setAllLessons(allLessons.filter(l => l.id !== id));
      setSuccess('Lesson deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete');
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...allLessons];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((l, i) => { l.order_index = i + 1; });
    setAllLessons(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= allLessons.length - 1) return;
    const updated = [...allLessons];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((l, i) => { l.order_index = i + 1; });
    setAllLessons(updated);
  };

  const filteredLessons = allLessons.sort((a, b) => a.order_index - b.order_index);

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

      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <BookOpen className="text-[#41c8df]" size={20} />
          <select value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-4 py-3 bg-secondary/5 border border-secondary/10 rounded-xl outline-none text-secondary min-w-[250px]"
            title="Select Course">
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <button onClick={() => handleOpenModal()}
          className="inline-flex items-center px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">
          <Plus className="w-5 h-5 mr-2" /> Add Lesson
        </button>
      </div>

      <div className="bg-background/40 backdrop-blur-xl border border-secondary/10 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#41c8df] rounded-full animate-spin" />
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Video className="w-12 h-12 mx-auto mb-2 text-gray-100" />
            <p className="text-sm font-medium">No lessons for this course yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLessons.map((lesson, i) => (
              <div key={lesson.id} className="flex items-center gap-4 p-4 hover:bg-secondary/5 transition-colors group">
                <div className="w-8 h-8 bg-[#41c8df]/10 rounded-full flex items-center justify-center text-[#41c8df] text-xs font-bold flex-shrink-0">
                  {lesson.order_index}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Video size={14} className="text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-secondary truncate">{lesson.lesson_title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 font-medium">
                    <span>Module: {lesson.module_name}</span>
                    {lesson.video_url && <span className="truncate max-w-[200px]">{lesson.video_url}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleMoveUp(i)} disabled={i === 0}
                    className="p-1.5 text-gray-400 hover:text-[#41c8df] disabled:opacity-30" title="Move Up">
                    <ArrowUp size={16} />
                  </button>
                  <button onClick={() => handleMoveDown(i)} disabled={i >= filteredLessons.length - 1}
                    className="p-1.5 text-gray-400 hover:text-[#41c8df] disabled:opacity-30" title="Move Down">
                    <ArrowDown size={16} />
                  </button>
                  <button onClick={() => handleOpenModal(lesson)}
                    className="p-2 text-gray-400 hover:text-[#41c8df] hover:bg-[#41c8df]/10 rounded-lg transition-all" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(lesson.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lesson Modal */}
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
                <Video className="text-[#41c8df]" /> {editingLesson ? 'Edit Lesson' : 'New Lesson'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Module Name *</label>
                  <input type="text" required value={formData.module_name}
                    onChange={(e) => setFormData({ ...formData, module_name: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                    placeholder="e.g., Python Programming Fundamentals" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Lesson Title *</label>
                  <input type="text" required value={formData.lesson_title}
                    onChange={(e) => setFormData({ ...formData, lesson_title: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                    placeholder="e.g., Introduction to Data Science" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Video URL (YouTube embed)</label>
                  <input type="text" value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                    placeholder="https://www.youtube.com/embed/..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Order Index</label>
                  <input type="number" min={1} value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl hover:bg-secondary/5 transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-1 px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">
                    {editingLesson ? 'Update Lesson' : 'Create Lesson'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLessons;
