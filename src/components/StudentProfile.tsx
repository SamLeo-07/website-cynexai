import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, Save, CheckCircle2, User as UserIcon } from 'lucide-react';
import { getUsers, updateUser, User as DbUser } from '../lib/turso';

interface StudentProfileProps {
  studentId: string;
  onProfileUpdated?: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ studentId, onProfileUpdated }) => {
  const [user, setUser] = useState<DbUser | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      const allUsers = await getUsers();
      const currentUser = allUsers.find(u => u.id === studentId);
      if (currentUser) {
        setUser(currentUser);
        setName(currentUser.name);
        setEmail(currentUser.email);
        setPhone(currentUser.phone || '');
      }
      setLoading(false);
    };
    loadUser();
  }, [studentId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updatedUser: DbUser = {
        ...user,
        name,
        phone,
      };
      await updateUser(updatedUser);
      // Update local storage name if it changed
      if (name !== user.name) {
        localStorage.setItem('cynexai_student_name', name);
      }
      if (updatedUser.phone && onProfileUpdated) {
        onProfileUpdated();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save profile", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-secondary/10 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h3 className="text-3xl lg:text-4xl font-black text-secondary mb-2 tracking-tight">My Profile</h3>
        <p className="text-sm lg:text-base text-secondary/60 font-medium">Manage your personal details and account settings.</p>
      </div>

      <div className="bg-background-100 border border-secondary/10 rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-secondary/10">
          <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center text-secondary relative group overflow-hidden">
            <UserIcon size={40} className="opacity-50" />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-secondary">{name || 'Student'}</h4>
            <p className="text-secondary/60">{email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
              <CheckCircle2 size={12} /> Identity Verified
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-3 focus:border-indigo-500 outline-none text-secondary font-medium transition-all"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest flex items-center gap-2">
                <Mail size={12} /> Email Address (Read Only)
              </label>
              <input
                type="email"
                value={email}
                className="w-full bg-secondary/5 border border-secondary/5 rounded-md px-4 py-3 outline-none text-secondary/50 font-medium cursor-not-allowed"
                disabled
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest flex items-center gap-2">
                <Phone size={12} /> Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 "
                className="w-full bg-secondary/5 border border-secondary/10 rounded-md px-4 py-3 focus:border-indigo-500 outline-none text-secondary font-medium transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-secondary/10 flex items-center justify-between">
            {saved ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-emerald-500 font-bold text-sm"
              >
                <CheckCircle2 size={18} /> Profile Saved Successfully
              </motion.div>
            ) : (
              <div /> // Spacer
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md hover:scale-105 transition-all flex items-center gap-2 shadow-md shadow-indigo-500/10"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
