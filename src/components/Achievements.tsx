import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Zap, TrendingUp,
  Flame, Loader2, Star, Medal, Award, Rocket
} from 'lucide-react';

const BadgeIcon = ({ iconName }: { iconName: string }) => {
  switch (iconName) {
    case 'Zap': return <Zap size={48} />;
    case 'Rocket': return <Rocket size={48} />;
    case 'Star': return <Star size={48} />;
    case 'Medal': return <Medal size={48} />;
    case 'Award': return <Award size={48} />;
    default: return <Trophy size={48} />;
  }
};
import { getBadges, Badge, getEnrollmentsByStudent } from '../lib/turso';

const Achievements = () => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState([
    { label: 'Total XP', value: '0', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { label: 'Level', value: '1', icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
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

        const customBadgesJson = localStorage.getItem('cynexai_custom_badges');
        let customBadges: Badge[] = [];
        if (customBadgesJson) {
          try {
            customBadges = JSON.parse(customBadgesJson);
          } catch (e) {
            console.error(e);
          }
        }
        const combinedBadges = [...badgeData, ...customBadges];
        const uniqueBadges = combinedBadges.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);
        setBadges(uniqueBadges);

        const sandboxXp = parseInt(localStorage.getItem('cynexai_sandbox_xp') || '0', 10);
        const mockTestXp = parseInt(localStorage.getItem('cynexai_mock_test_xp') || '0', 10);
        let totalXp = enrollments.length * 100 + sandboxXp + mockTestXp;
        enrollments.forEach(enr => {
          totalXp += Math.floor((enr.progress_percentage || 0) * 10);
        });

        const level = Math.floor(totalXp / 1000) + 1;
        const currentLevelXp = totalXp % 1000;
        const progressToNext = (currentLevelXp / 1000) * 100;

        setXpProgress(progressToNext);

        setStats([
          { label: 'Total XP', value: totalXp.toLocaleString(), icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          { label: 'Level', value: level.toString(), icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
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
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 lg:space-y-12">
      {/* Level Card */}
      <div className="bg-gradient-to-br from-indigo-500/10 to-secondary/5 border border-indigo-500/20 rounded-xl p-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[140%] bg-indigo-500/5 blur-[120px] rounded-full" />
        
        <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
          <div className="w-40 h-40 rounded-full border-8 border-secondary/5 flex items-center justify-center relative bg-background-100 shadow-xl shadow-indigo-500/10">
            <div className="absolute inset-0 border-8 border-indigo-500 border-t-transparent rounded-full animate-spin-slow" />
            <div className="text-center">
              <span className="text-5xl font-black text-secondary">{stats[1].value}</span>
              <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mt-1">Tier</p>
            </div>
          </div>
          
          <div className="flex-1 space-y-4 text-center lg:text-left w-full">
            <div>
              <h2 className="text-3xl font-black text-secondary tracking-tight">Skill Progression</h2>
              <p className="text-sm text-secondary/60 mt-2 font-medium">Leveling up unlocks premium <span className="text-secondary font-black">Certification Paths</span>.</p>
            </div>
            <div className="w-full h-4 bg-secondary/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-black text-secondary/40 uppercase tracking-widest">
               <span>Level {stats[1].value}</span>
               <span>Level {parseInt(stats[1].value) + 1}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-background-100 border border-secondary/10 rounded-xl p-6 hover:border-indigo-500 transition-all shadow-sm group">
            <div className={`w-12 h-12 ${stat.bg} rounded-md flex items-center justify-center mb-6 shadow-sm border border-white`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-2">{stat.label}</p>
            <p className="text-3xl font-black text-secondary group-hover:text-indigo-400 transition-colors">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Badges Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-secondary">Merit Badges</h3>
          <span className="px-3 py-1 bg-secondary/10 text-secondary/60 rounded-md text-[10px] font-black uppercase tracking-widest">
            {badges.length} / 12 UNLOCKED
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-background-100 border border-dashed border-secondary/10 rounded-xl">
              <Trophy className="w-16 h-16 text-secondary/10 mx-auto mb-6" />
              <p className="text-secondary/40 font-bold">Complete your first module to earn a badge.</p>
            </div>
          ) : (
            badges.map((badge) => (
              <motion.div 
                whileHover={{ y: -6 }}
                key={badge.id}
                className="p-6 rounded-xl border text-center transition-all bg-background-100 border-secondary/10 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500"
              >
                <div className={`w-20 h-20 mx-auto rounded-md flex items-center justify-center mb-6 bg-secondary/5 border border-secondary/10 shadow-inner text-indigo-400`}>
                  <BadgeIcon iconName={badge.icon} />
                </div>
                <h4 className="font-black text-secondary mb-2">{badge.title}</h4>
                <p className="text-xs text-secondary/60 leading-relaxed mb-6 font-medium">{badge.description || 'Training protocol mastery.'}</p>
                <div className="pt-6 border-t border-secondary/5">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
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
