import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Search, Trophy, Medal, Award, User, Target, Zap } from 'lucide-react';
import { getLeaderboard, addLeaderboardEntry, updateLeaderboardEntry, deleteLeaderboardEntry, LeaderboardEntry } from '../lib/turso';

export const AdminLeaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [studentName, setStudentName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [problemsSolved, setProblemsSolved] = useState(0);
  const [points, setPoints] = useState(0);
  const [badges, setBadges] = useState(0);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard();
      setEntries(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard entries', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStudentName('');
    setAvatar('');
    setProblemsSolved(0);
    setPoints(0);
    setBadges(0);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (entry: LeaderboardEntry) => {
    setStudentName(entry.studentName);
    setAvatar(entry.avatar || '');
    setProblemsSolved(entry.problemsSolved);
    setPoints(entry.points);
    setBadges(entry.badges);
    setEditingId(entry.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!studentName.trim()) {
      alert('Student name is required');
      return;
    }

    try {
      if (editingId) {
        await updateLeaderboardEntry(editingId, {
          studentName,
          avatar,
          problemsSolved,
          points,
          badges,
        });
      } else {
        await addLeaderboardEntry({
          id: `entry_${Date.now()}`,
          studentName,
          avatar,
          problemsSolved,
          points,
          badges,
        });
      }
      resetForm();
      fetchEntries();
    } catch (error) {
      console.error('Failed to save entry', error);
      alert('Failed to save entry. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this leaderboard entry?')) {
      try {
        await deleteLeaderboardEntry(id);
        fetchEntries();
      } catch (error) {
        console.error('Failed to delete entry', error);
        alert('Failed to delete entry');
      }
    }
  };

  const filteredEntries = entries.filter(e => 
    e.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-secondary flex items-center gap-2">
            <Trophy className="text-[#41c8df]" />
            Global Leaderboard Management
          </h2>
          <p className="text-secondary/60 font-medium">Manage student rankings, XP points, and badges for the global leaderboard.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
          className="px-4 py-2 bg-[#41c8df] text-black font-bold rounded-xl flex items-center gap-2 hover:bg-[#38b2c7] transition-colors shadow-lg shadow-[#41c8df]/20"
        >
          <Plus size={20} />
          Add Entry
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-background-100 border border-secondary/10 p-6 rounded-[2rem] shadow-sm">
          <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
            {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
            {editingId ? 'Edit Leaderboard Entry' : 'Add New Entry'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-secondary/60 uppercase tracking-wider mb-1">Student Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-secondary/40" />
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-secondary/5 border border-secondary/10 rounded-xl text-secondary placeholder:text-secondary/40 focus:outline-none focus:border-[#41c8df] focus:ring-1 focus:ring-[#41c8df] transition-all"
                  placeholder="e.g. Alex Johnson"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-secondary/60 uppercase tracking-wider mb-1">Avatar URL (Optional)</label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full px-4 py-2 bg-secondary/5 border border-secondary/10 rounded-xl text-secondary placeholder:text-secondary/40 focus:outline-none focus:border-[#41c8df] focus:ring-1 focus:ring-[#41c8df] transition-all"
                placeholder="https://i.pravatar.cc/150?u=..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-secondary/60 uppercase tracking-wider mb-1">XP Points</label>
              <div className="relative">
                <Zap size={16} className="absolute left-3 top-3 text-yellow-500" />
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-2 bg-secondary/5 border border-secondary/10 rounded-xl text-secondary focus:outline-none focus:border-[#41c8df] focus:ring-1 focus:ring-[#41c8df] transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-secondary/60 uppercase tracking-wider mb-1">Problems Solved</label>
              <div className="relative">
                <Target size={16} className="absolute left-3 top-3 text-[#41c8df]" />
                <input
                  type="number"
                  value={problemsSolved}
                  onChange={(e) => setProblemsSolved(parseInt(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-2 bg-secondary/5 border border-secondary/10 rounded-xl text-secondary focus:outline-none focus:border-[#41c8df] focus:ring-1 focus:ring-[#41c8df] transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-secondary/60 uppercase tracking-wider mb-1">Badges Earned</label>
              <div className="relative">
                <Award size={16} className="absolute left-3 top-3 text-purple-400" />
                <input
                  type="number"
                  value={badges}
                  onChange={(e) => setBadges(parseInt(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-2 bg-secondary/5 border border-secondary/10 rounded-xl text-secondary focus:outline-none focus:border-[#41c8df] focus:ring-1 focus:ring-[#41c8df] transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-secondary font-bold hover:bg-secondary/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-secondary text-background font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Save size={18} />
              Save Entry
            </button>
          </div>
        </div>
      )}

      <div className="bg-background-100 border border-secondary/10 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-secondary/10 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/40 w-4 h-4" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary/5 border border-secondary/10 rounded-xl text-sm focus:outline-none focus:border-[#41c8df] focus:ring-1 focus:ring-[#41c8df] transition-all text-secondary"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/5 border-b border-secondary/10">
                <th className="px-6 py-4 text-xs font-bold text-secondary/60 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-4 text-xs font-bold text-secondary/60 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-secondary/60 uppercase tracking-wider">XP Points</th>
                <th className="px-6 py-4 text-xs font-bold text-secondary/60 uppercase tracking-wider">Stats</th>
                <th className="px-6 py-4 text-xs font-bold text-secondary/60 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/10">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-secondary/40">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-[#41c8df] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    Loading leaderboard...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-secondary/40">
                    No leaderboard entries found
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-secondary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className={`font-black flex items-center justify-center w-8 h-8 rounded-full ${
                        entry.rank === 1 ? 'bg-yellow-400/20 text-yellow-500' :
                        entry.rank === 2 ? 'bg-slate-300/20 text-slate-400' :
                        entry.rank === 3 ? 'bg-amber-600/20 text-amber-500' :
                        'bg-secondary/10 text-secondary'
                      }`}>
                        #{entry.rank}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {entry.avatar ? (
                          <img src={entry.avatar} alt={entry.studentName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#41c8df] to-emerald-400 flex items-center justify-center text-white font-bold text-sm">
                            {entry.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                        <span className="font-bold text-secondary">{entry.studentName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-black text-secondary">
                        <Zap size={16} className="text-yellow-500" />
                        {entry.points.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-xs font-bold text-secondary/60">
                          <Target size={14} className="text-[#41c8df]" />
                          {entry.problemsSolved}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-secondary/60">
                          <Award size={14} className="text-purple-400" />
                          {entry.badges}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-2 hover:bg-secondary/10 rounded-lg text-secondary transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
