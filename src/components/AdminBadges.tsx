import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Trophy, AlertCircle, CheckCircle2,
  Trash2, User, Stars, Zap, Rocket, Shield, Heart, Award
} from 'lucide-react';
import {
  getAllBadges, getUsers, createBadge, deleteBadge,
  Badge, User
} from '../lib/turso';

const ICON_OPTIONS = [
  { name: 'Zap', component: Zap },
  { name: 'Rocket', component: Rocket },
  { name: 'Shield', component: Shield },
  { name: 'Heart', component: Heart },
  { name: 'Award', component: Award },
  { name: 'Trophy', component: Trophy },
  { name: 'Stars', component: Stars },
];

const COLOR_OPTIONS = [
  { value: 'text-yellow-400', label: 'Gold', bg: 'bg-yellow-400/10' },
  { value: 'text-[#41c8df]', label: 'Cyan', bg: 'bg-[#41c8df]/10' },
  { value: 'text-emerald-400', label: 'Emerald', bg: 'bg-emerald-400/10' },
  { value: 'text-purple-400', label: 'Purple', bg: 'bg-purple-400/10' },
  { value: 'text-rose-400', label: 'Rose', bg: 'bg-rose-400/10' },
  { value: 'text-blue-400', label: 'Blue', bg: 'bg-blue-400/10' },
];

const AdminBadges = () => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    title: '',
    icon: 'Zap',
    color: 'text-yellow-400'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [b, u] = await Promise.all([getAllBadges(), getUsers()]);
      setBadges(b);
      setStudents(u.filter(u => u.role === 'student'));
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id || !formData.title.trim()) {
      setError('Student and title are required');
      return;
    }
    try {
      const newBadge: Badge = {
        id: `bdg_${Date.now()}`,
        student_id: formData.student_id,
        title: formData.title.trim(),
        icon: formData.icon,
        color: formData.color,
        unlocked_at: new Date().toISOString()
      };
      await createBadge(newBadge);
      setBadges([newBadge, ...badges]);
      setSuccess(`Badge awarded to ${students.find(s => s.id === formData.student_id)?.name || 'student'}!`);
      setIsModalOpen(false);
      setFormData({ student_id: '', title: '', icon: 'Zap', color: 'text-yellow-400' });
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to create badge');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this badge?')) return;
    try {
      await deleteBadge(id);
      setBadges(badges.filter(b => b.id !== id));
      setSuccess('Badge deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete');
    }
  };

  const getStudentName = (studentId: string) => {
    const s = students.find(s => s.id === studentId);
    return s ? s.name : studentId.substring(0, 8);
  };

  const BadgeIconComponent = ({ iconName }: { iconName: string }) => {
    const icon = ICON_OPTIONS.find(i => i.name === iconName);
    if (!icon) return <Trophy size={24} />;
    const IconComp = icon.component;
    return <IconComp size={24} />;
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
        <p className="text-sm text-gray-400">{badges.length} badges awarded across {students.length} students</p>
        <button onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">
          <Plus className="w-5 h-5 mr-2" /> Award Badge
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#41c8df] rounded-full animate-spin" />
          </div>
        ) : badges.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-100" />
            <p className="text-sm font-medium">No badges awarded yet</p>
          </div>
        ) : badges.map((badge, i) => (
          <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
            className="bg-background/40 backdrop-blur-xl border border-secondary/10 rounded-2xl p-5 shadow-lg hover:border-[#41c8df]/20 transition-all group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${badge.color.replace('text-', 'bg-')}/10`}>
                  <span className={badge.color}><BadgeIconComponent iconName={badge.icon} /></span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-secondary">{badge.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <User size={12} className="text-gray-500" />
                    <span className="text-xs text-gray-400">{getStudentName(badge.student_id)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {new Date(badge.unlocked_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(badge.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title="Delete Badge">
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Award Badge Modal */}
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
                <Trophy className="text-[#41c8df]" /> Award Badge
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
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Badge Title *</label>
                  <input type="text" required value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 focus:border-[#41c8df] rounded-xl outline-none text-secondary"
                    placeholder="e.g., Alpha Protocol" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Icon</label>
                  <div className="flex gap-3">
                    {ICON_OPTIONS.map(ico => (
                      <button key={ico.name} type="button"
                        onClick={() => setFormData({ ...formData, icon: ico.name })}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                          formData.icon === ico.name
                            ? 'border-[#41c8df] bg-[#41c8df]/10 text-[#41c8df]'
                            : 'border-secondary/10 bg-secondary/5 text-gray-400 hover:border-secondary/30'
                        }`}
                        title={ico.name}>
                        <ico.component size={20} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Color</label>
                  <div className="flex gap-3">
                    {COLOR_OPTIONS.map(col => (
                      <button key={col.value} type="button"
                        onClick={() => setFormData({ ...formData, color: col.value })}
                        className={`px-4 py-2 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all ${
                          formData.color === col.value
                            ? `${col.bg} ${col.value} border-[#41c8df]`
                            : 'bg-secondary/5 border-secondary/10 text-gray-400 hover:border-secondary/30'
                        }`}>
                        {col.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-secondary/10 text-gray-400 font-bold rounded-xl hover:bg-secondary/5 transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-1 px-6 py-3 bg-[#41c8df] hover:bg-[#38b2c7] text-black font-bold rounded-xl transition-all shadow-lg">Award Badge</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBadges;
