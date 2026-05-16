import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Zap, TrendingUp,
  Flame, Loader2
} from 'lucide-react';
import { getBadges, Badge, getEnrollmentsByStudent } from '../lib/turso';

const Achievements = () => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState([
    { label: 'Total XP', value: '0', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { label: 'Level', value: '1', icon: TrendingUp, color: 'text-[#41c8df]', bg: 'bg-[#41c8df]/10' },
    { label: 'Courses', value: '0', icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Streak', value: '1 Day', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-100' },
  ]);
  const [loading, setLoading] = useState(true);
  const [xpProgress, setXpProgress] = useState(0);

  useEffect(() => {
    const studentId = localStorage.getItem('cynexai_student_id') || '';
    if (!studentId) return;

    const loadData = async () => {
      try {
        const [badgeData, enrollments] = await Promise.all([
          getBadges(studentId),
          getEnrollmentsByStudent(studentId)
        ]);

        setBadges(badgeData);

        // Simple XP calculation: 100 XP per enrollment + 10 XP per % progress
        let totalXp = enrollments.length * 100;
        enrollments.forEach(enr => {
          totalXp += Math.floor((enr.progress_percentage || 0) * 10);
        });

        const level = Math.floor(totalXp / 1000) + 1;
        const currentLevelXp = totalXp % 1000;
        const progressToNext = (currentLevelXp / 1000) * 100;

        setXpProgress(progressToNext);

        setStats([
          { label: 'Total XP', value: totalXp.toLocaleString(), icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          { label: 'Level', value: level.toString(), icon: TrendingUp, color: 'text-[#41c8df]', bg: 'bg-[#41c8df]/10' },
          { label: 'Courses', value: enrollments.length.toString(), icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Streak', value: '3 Days', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-100' },
        ]);
      } catch (error) {
        console.error("Failed to load achievements", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#41c8df] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Level Card */}
      <div className="bg-gradient-to-br from-[#41c8df]/10 to-white border border-slate-200 rounded-[3rem] p-12 relative overflow-hidden shadow-sm">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[140%] bg-[#41c8df]/5 blur-[120px] rounded-full" />
        
        <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
          <div className="w-48 h-48 rounded-full border-8 border-slate-50 flex items-center justify-center relative bg-white shadow-xl shadow-[#41c8df]/10">
            <div className="absolute inset-0 border-8 border-[#41c8df] border-t-transparent rounded-full animate-spin-slow" />
            <div className="text-center">
              <span className="text-5xl font-black text-slate-900">{stats[1].value}</span>
              <p className="text-xs font-black text-[#41c8df] uppercase tracking-widest mt-1">Tier</p>
            </div>
          </div>
          
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Skill Progression</h2>
              <p className="text-slate-500 mt-2 font-medium">Leveling up unlocks premium <span className="text-slate-900 font-black">Certification Paths</span>.</p>
            </div>
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-[#41c8df] to-emerald-400"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
               <span>Level {stats[1].value}</span>
               <span>Level {parseInt(stats[1].value) + 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 hover:border-[#41c8df] transition-all shadow-sm group">
            <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-white`}>
              <stat.icon className={`w-7 h-7 ${stat.color}`} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
            <p className="text-3xl font-black text-slate-900 group-hover:text-[#41c8df] transition-colors">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Badges Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-slate-900">Merit Badges</h3>
          <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
            {badges.length} / 12 UNLOCKED
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-white border border-dashed border-slate-200 rounded-[3rem]">
              <Trophy className="w-16 h-16 text-slate-100 mx-auto mb-6" />
              <p className="text-slate-400 font-bold">Complete your first module to earn a badge.</p>
            </div>
          ) : (
            badges.map((badge) => (
              <motion.div 
                whileHover={{ y: -10 }}
                key={badge.id}
                className="p-8 rounded-[2.5rem] border text-center transition-all bg-white border-slate-200 shadow-sm hover:shadow-xl hover:shadow-[#41c8df]/10 hover:border-[#41c8df]"
              >
                <div className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center mb-6 bg-slate-50 border border-slate-100 shadow-inner`}>
                  <Trophy className={`w-12 h-12 text-[#41c8df]`} />
                </div>
                <h4 className="font-black text-slate-900 mb-2">{badge.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">Training protocol mastery.</p>
                <div className="pt-6 border-t border-slate-50">
                  <span className="text-[10px] font-black text-[#41c8df] uppercase tracking-widest">
                    {new Date(badge.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Achievements;
