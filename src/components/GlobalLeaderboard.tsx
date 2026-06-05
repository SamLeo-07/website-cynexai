import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Star, Target, Crown, Zap, Flame } from 'lucide-react';
import { LeaderboardEntry, getLeaderboard, getUserProgress } from '../lib/turso';

interface GlobalLeaderboardProps {
  studentId: string;
  studentName?: string;
}

// Generate a consistent color from a name string
function nameToColor(name: string): string {
  const colors = [
    '#6366f1', '#f97316', '#ec4899', '#a855f7', '#10b981',
    '#eab308', '#0ea5e9', '#f43f5e', '#8b5cf6', '#14b8a6',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AvatarCircle: React.FC<{ name: string; size?: number; className?: string }> = ({ name, size = 40, className = '' }) => {
  const color = nameToColor(name);
  return (
    <div
      className={`rounded-full flex items-center justify-center font-black text-white shrink-0 ${className}`}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}99)`, fontSize: size * 0.35 }}
    >
      {initials(name)}
    </div>
  );
};

export const GlobalLeaderboard: React.FC<GlobalLeaderboardProps> = ({ studentId, studentName }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await getLeaderboard();
        const myProgress = await getUserProgress(studentId);

        let finalEntries = [...data];

        // Inject current student if not already in top list
        if (!finalEntries.find(e => e.id === studentId)) {
          finalEntries.push({
            id: studentId,
            studentName: studentName || myProgress.studentName || 'You',
            avatar: '',
            problemsSolved: myProgress.totalSolved,
            points: myProgress.xpPoints,
            rank: finalEntries.length + 1,
            badges: 0
          });
        }

        // Sort by points
        finalEntries.sort((a, b) => b.points - a.points);
        finalEntries = finalEntries.map((e, i) => ({ ...e, rank: i + 1 }));
        setEntries(finalEntries);
      } catch (e) {
        console.error('Failed to load leaderboard', e);
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-secondary/10 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-xs font-bold text-secondary/40 uppercase tracking-widest animate-pulse">Loading rankings...</p>
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const others = entries.slice(3);

  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
  const podiumHeights = ['h-24', 'h-36', 'h-16'];
  const podiumBorders = ['border-slate-400', 'border-yellow-400', 'border-amber-600'];
  const podiumLabels = ['2nd', '1st', '3rd'];
  const podiumTextColors = ['text-slate-400', 'text-yellow-400', 'text-amber-600'];
  const podiumAvatarSizes = [64, 80, 56];
  const podiumMedals = ['🥈', '🥇', '🥉'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-3xl lg:text-4xl font-black text-secondary mb-1 tracking-tight flex items-center gap-3">
          <Trophy size={32} className="text-yellow-400" />
          Global Leaderboard
        </h3>
        <p className="text-sm text-secondary/50 font-medium">See how you rank against the top learners.</p>
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="bg-gradient-to-br from-secondary/5 to-indigo-500/5 border border-secondary/10 rounded-xl p-8">
          <div className="flex items-end justify-center gap-4 md:gap-8">
            {podiumOrder.map((idx, podiumIdx) => {
              const entry = top3[idx];
              if (!entry) return null;
              const isMe = entry.id === studentId;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: podiumIdx * 0.15 }}
                  className="flex flex-col items-center gap-3 flex-1 max-w-[140px]"
                >
                  {/* Crown for 1st */}
                  {idx === 0 && <Crown size={28} className="text-yellow-400 drop-shadow-lg" />}
                  {idx !== 0 && <div className="h-7" />}

                  {/* Avatar */}
                  <div className={`relative p-1 rounded-full border-4 ${podiumBorders[podiumIdx]} shadow-lg`}>
                    <AvatarCircle name={entry.studentName} size={podiumAvatarSizes[podiumIdx]} />
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-black">
                      {podiumMedals[podiumIdx]}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="text-center mt-2">
                    <p className={`font-bold text-secondary text-sm truncate max-w-[120px] ${isMe ? 'text-indigo-400' : ''}`}>
                      {entry.studentName} {isMe && <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-sm font-black">YOU</span>}
                    </p>
                    <p className={`font-black text-lg ${podiumTextColors[podiumIdx]}`}>
                      {entry.points.toLocaleString()} XP
                    </p>
                  </div>

                  {/* Podium block */}
                  <div className={`w-full ${podiumHeights[podiumIdx]} ${podiumIdx === 1 ? 'bg-yellow-400/20 border-yellow-400/30' : 'bg-secondary/8 border-secondary/15'} border rounded-t-md flex items-start justify-center pt-2`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${podiumTextColors[podiumIdx]}`}>
                      {podiumLabels[podiumIdx]}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Rankings List */}
      <div className="bg-background-100 border border-secondary/10 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-secondary/10 bg-secondary/3 flex items-center gap-3">
          <Medal size={18} className="text-indigo-400" />
          <h4 className="font-bold text-secondary">Full Rankings</h4>
          <span className="ml-auto text-[10px] font-black text-secondary/30 uppercase tracking-widest">{entries.length} Students</span>
        </div>

        <div className="divide-y divide-secondary/5">
          {entries.map((entry) => {
            const isMe = entry.id === studentId;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-center gap-4 px-6 py-4 transition-colors relative ${isMe ? 'bg-indigo-500/5' : 'hover:bg-secondary/3'}`}
              >
                {isMe && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-sm" />}

                {/* Rank */}
                <div className={`w-8 text-center font-black text-sm shrink-0 ${entry.rank <= 3 ? 'text-yellow-400' : 'text-secondary/30'}`}>
                  #{entry.rank}
                </div>

                {/* Avatar */}
                <AvatarCircle name={entry.studentName} size={40} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate flex items-center gap-2 ${isMe ? 'text-indigo-400' : 'text-secondary'}`}>
                    {entry.studentName}
                    {isMe && <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-sm font-black tracking-wider">YOU</span>}
                  </p>
                  <div className="flex items-center gap-4 mt-0.5">
                    <span className="text-[10px] font-bold text-secondary/40 flex items-center gap-1">
                      <Target size={9} /> {entry.problemsSolved} Solved
                    </span>
                    <span className="text-[10px] font-bold text-secondary/40 flex items-center gap-1">
                      <Star size={9} /> {entry.badges} Badges
                    </span>
                  </div>
                </div>

                {/* XP */}
                <div className="text-right shrink-0">
                  <div className="font-black text-secondary text-base flex items-center gap-1 justify-end">
                    <Zap size={13} className="text-indigo-400" />
                    {entry.points.toLocaleString()}
                  </div>
                  <div className="text-[9px] font-black text-secondary/30 uppercase tracking-widest">XP</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
