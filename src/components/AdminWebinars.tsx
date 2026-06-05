import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Video, AlertCircle, CheckCircle2,
  Edit2, Trash2, Calendar, Clock, Users
} from 'lucide-react';
import {
  getWebinars, createWebinar, updateWebinar, deleteWebinar,
  Webinar
} from '../lib/turso';

const AdminWebinars = () => {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWebinar, setEditingWebinar] = useState<Webinar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    instructor: '',
    date: '',
    time: '',
    duration: '',
    maxParticipants: 100,
    description: '',
    status: 'upcoming' as 'upcoming' | 'live' | 'past'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const w = await getWebinars();
      setWebinars(w);
    } catch {
      setError('Failed to load webinars');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (webinar?: Webinar) => {
    if (webinar) {
      setEditingWebinar(webinar);
      setFormData({
        title: webinar.title,
        instructor: webinar.instructor,
        date: webinar.date,
        time: webinar.time,
        duration: webinar.duration,
        maxParticipants: webinar.maxParticipants,
        description: webinar.description,
        status: webinar.status
      });
    } else {
      setEditingWebinar(null);
      setFormData({
        title: '',
        instructor: '',
        date: '',
        time: '',
        duration: '60 min',
        maxParticipants: 100,
        description: '',
        status: 'upcoming'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.instructor.trim()) {
      setError('Title and instructor are required');
      return;
    }
    try {
      if (editingWebinar) {
        const updated: Webinar = {
          ...editingWebinar,
          ...formData,
          participants: editingWebinar.participants || 0
        };
        await updateWebinar(updated);
        setWebinars(webinars.map(w => w.id === updated.id ? updated : w));
        setSuccess('Webinar updated');
      } else {
        const newWebinar: Webinar = {
          id: `web_${Date.now()}`,
          ...formData,
          participants: 0
        };
        await createWebinar(newWebinar);
        setWebinars([newWebinar, ...webinars]);
        setSuccess('Webinar created');
      }
      setIsModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save webinar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this webinar?')) return;
    try {
      await deleteWebinar(id);
      setWebinars(webinars.filter(w => w.id !== id));
      setSuccess('Webinar deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete');
    }
  };

  const statusColors = {
    upcoming: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    live: 'bg-green-500/10 border-green-500/30 text-green-400',
    past: 'bg-gray-500/10 border-gray-500/30 text-gray-400'
  };

  const getStatusStyle = (status: string) => statusColors[status as keyof typeof statusColors] || statusColors.upcoming;

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
        <p className="text-sm text-gray-400">{webinars.length} webinars scheduled</p>
        <button onClick={() => handleOpenModal()}
          className="inline-flex items-center px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">
          <Plus className="w-5 h-5 mr-2" /> New Webinar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#41c8df] rounded-full animate-spin" />
          </div>
        ) : webinars.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Video className="w-12 h-12 mx-auto mb-2 text-gray-100" />
            <p className="text-sm font-medium">No webinars yet</p>
          </div>
        ) : webinars.map((webinar, i) => (
          <motion.div key={webinar.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="bg-background/40 backdrop-blur-xl border border-secondary/10 rounded-2xl p-5 shadow-lg hover:border-[#41c8df]/20 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#41c8df]/10 rounded-xl flex items-center justify-center">
                  <Video className="text-[#41c8df]" size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-secondary">{webinar.title}</h3>
                  <p className="text-xs text-gray-400">by {webinar.instructor}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${getStatusStyle(webinar.status)}`}>
                {webinar.status}
              </span>
            </div>
            <p className="text-sm text-gray-300 mb-4 line-clamp-2">{webinar.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-medium">
              <span className="flex items-center gap-1"><Calendar size={14} /> {webinar.date}</span>
              <span className="flex items-center gap-1"><Clock size={14} /> {webinar.time}</span>
              <span className="flex items-center gap-1"><Users size={14} /> {webinar.participants}/{webinar.maxParticipants}</span>
              <span className="text-gray-500">{webinar.duration}</span>
            </div>
            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpenModal(webinar)}
                className="px-3 py-1.5 text-xs font-bold text-[#41c8df] bg-[#41c8df]/10 hover:bg-[#41c8df]/20 rounded-lg transition-all">Edit</button>
              <button onClick={() => handleDelete(webinar.id)}
                className="px-3 py-1.5 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all">Delete</button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Webinar Modal */}
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
                <Video className="text-[#41c8df]" /> {editingWebinar ? 'Edit Webinar' : 'New Webinar'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Title *</label>
                    <input type="text" required value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Instructor *</label>
                    <input type="text" required value={formData.instructor}
                      onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Duration</label>
                    <input type="text" value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      placeholder="60 min" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Date</label>
                    <input type="date" required value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Time</label>
                    <input type="time" required value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Description</label>
                  <textarea rows={3} value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Max Participants</label>
                    <input type="number" min={1} value={formData.maxParticipants}
                      onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 100 })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Status</label>
                    <select value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                      title="Webinar Status">
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                      <option value="past">Past</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl hover:bg-secondary/5 transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-1 px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">
                    {editingWebinar ? 'Update Webinar' : 'Create Webinar'}
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

export default AdminWebinars;
