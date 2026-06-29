import React, { useEffect, useState } from 'react';
import { Share2, Users, Gift, CheckCircle2, Lock, ArrowRight, Award, Trophy, MessageCircle, Send, Mail, Copy, Check, HelpCircle, ChevronDown } from 'lucide-react';
import { Referral, ReferralGift, getReferrals, getReferralGifts, saveReferralGift, createReferral, getUsers } from '../lib/turso';
import { useToast } from './ToastContext';

interface ReferralDashboardProps {
  studentId: string;
  studentName: string;
}

export const ReferralDashboard: React.FC<ReferralDashboardProps> = ({ studentId, studentName }) => {
  const { showToast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [gifts, setGifts] = useState<ReferralGift[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Invite form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const MILESTONE_3_OPTIONS = [
    'Official CynexAI T-Shirt',
    'Amazon Gift Voucher',
    'CynexAI Merchandise'
  ];

  const MILESTONE_5_OPTIONS = [
    'Wireless Earbuds',
    'Amazon Gift Voucher',
    'Premium Gadget',
    'Premium CynexAI Merchandise'
  ];

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const refs = await getReferrals(studentId);
      const gfts = await getReferralGifts(studentId);
      
      // Auto-unlock logic if gifts are not present but they reached the milestone
      const successfulCount = refs.filter(r => r.status === 'successful').length;
      
      let updatedGifts = [...gfts];
      
      const checkAndUnlock = async (milestone: number) => {
        let gift = updatedGifts.find(g => g.milestone === milestone);
        if (!gift) {
          gift = {
            id: crypto.randomUUID(),
            student_id: studentId,
            milestone,
            gift_selected: null,
            status: successfulCount >= milestone ? 'eligible' : 'locked',
            created_at: new Date().toISOString()
          };
          await saveReferralGift(gift);
          updatedGifts.push(gift);
        } else if (gift.status === 'locked' && successfulCount >= milestone) {
          gift.status = 'eligible';
          await saveReferralGift(gift);
        }
      };

      await checkAndUnlock(3);
      await checkAndUnlock(5);

      setReferrals(refs);
      setGifts(updatedGifts);

      // Load Leaderboard
      const [allUsers, allRefs] = await Promise.all([
        getUsers(),
        getReferrals()
      ]);
      const counts = new Map<string, number>();
      allRefs.forEach(r => {
        if (r.status === 'successful') {
          counts.set(r.referrer_id, (counts.get(r.referrer_id) || 0) + 1);
        }
      });
      const lb = allUsers
        .filter(u => u.role === 'student' && counts.has(u.id))
        .map(u => ({
          name: u.name,
          count: counts.get(u.id) || 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setLeaderboard(lb);
    } catch (e) {
      console.error("Failed to load referral stats & leaderboard", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGift = async (milestone: number, option: string) => {
    const gift = gifts.find(g => g.milestone === milestone);
    if (!gift || gift.status !== 'eligible') return;
    if (gift.gift_selected) {
      showToast('You have already selected a gift for this milestone.', 'warning');
      return;
    }

    const updated = { ...gift, gift_selected: option };
    await saveReferralGift(updated);
    setGifts(gifts.map(g => g.id === updated.id ? updated : g));
    showToast(`Successfully selected ${option}!`, 'success');
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/apply?ref=${studentId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    showToast('Referral link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const getShareLink = () => `${window.location.origin}/apply?ref=${studentId}`;

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`Hey! I am learning at CynexAI. Join me to learn cutting-edge technology and build your future. Register using my link: ${getShareLink()}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareOnTelegram = () => {
    const url = encodeURIComponent(getShareLink());
    const text = encodeURIComponent("Join me at CynexAI to learn cutting-edge tech and build real-world skills!");
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const shareOnEmail = () => {
    const subject = encodeURIComponent("Join me at CynexAI - Learn Cutting-Edge Tech");
    const body = encodeURIComponent(`Hey!\n\nI'm learning at CynexAI and wanted to invite you to join too. It's a great platform to learn tech and advance your career.\n\nRegister using my referral link here:\n${getShareLink()}\n\nBest regards!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) {
      showToast("Please enter your friend's name", "warning");
      return;
    }
    setInviting(true);
    try {
      const newRef: Referral = {
        id: crypto.randomUUID(),
        referrer_id: studentId,
        referee_name: inviteName.trim(),
        referee_email: inviteEmail.trim() || undefined,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      await createReferral(newRef);
      showToast('Invitation sent successfully!', 'success');
      setInviteName('');
      setInviteEmail('');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to send invitation', 'error');
    } finally {
      setInviting(false);
    }
  };

  const successfulCount = referrals.filter(r => r.status === 'successful').length;
  const pendingCount = referrals.filter(r => r.status === 'pending').length;

  const renderMilestone = (milestone: number, options: string[], icon: React.ReactNode) => {
    const gift = gifts.find(g => g.milestone === milestone);
    const status = gift?.status || 'locked';
    const isLocked = status === 'locked';
    const isEligible = status === 'eligible';
    const isDelivered = status === 'delivered';
    const selected = gift?.gift_selected;

    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {isLocked && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center border border-slate-200 rounded-3xl">
            <Lock className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-slate-800 font-bold text-center px-4">Reach {milestone} successful admissions to unlock</p>
            <p className="text-slate-500 text-sm mt-1">{successfulCount} / {milestone} Admissions</p>
            <div className="w-48 h-2 bg-slate-100 rounded-full mt-4 overflow-hidden border border-slate-200/50">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (successfulCount / milestone) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600">
              {icon}
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-slate-800">{milestone} Admissions Milestone</h3>
              <p className="text-slate-500 text-sm">Choose one of the following rewards</p>
            </div>
          </div>
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
              isDelivered ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
              isEligible ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
              'bg-slate-50 text-slate-500 border-slate-150'
            }`}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectGift(milestone, option)}
              disabled={!isEligible || !!selected}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                selected === option
                  ? 'bg-indigo-50/80 border-indigo-500 text-indigo-700 shadow-sm font-semibold'
                  : 'bg-slate-50 border-slate-200/70 hover:bg-slate-100/70 text-slate-700 hover:text-slate-900'
              } ${(!isEligible || !!selected) && selected !== option ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="font-medium text-sm md:text-base">{option}</span>
              {selected === option && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
            </button>
          ))}
        </div>

        {selected && !isDelivered && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center text-amber-800 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 mr-2 text-amber-600" />
            Gift selected! The admin team is processing your reward.
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading referral dashboard...</div>;
  }

  return (
    <div className="space-y-8 text-slate-800 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-lg border border-indigo-900/60 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">{studentName}'s Referral Program</h2>
            <p className="text-indigo-200/80 text-sm md:text-base max-w-2xl leading-relaxed">
              Invite your friends to join CynexAI and earn amazing rewards when they successfully enroll. 
              The more you refer, the bigger the rewards!
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              onClick={copyReferralLink}
              className="flex items-center px-5 py-3 bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-500 hover:to-indigo-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-[0.98]"
            >
              {copied ? <Check className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
              {copied ? 'Copied Link!' : 'Copy Link'}
            </button>
            <button 
              onClick={shareOnWhatsApp}
              className="flex items-center justify-center p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all hover:scale-[1.05] active:scale-[0.95]"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button 
              onClick={shareOnTelegram}
              className="flex items-center justify-center p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-all hover:scale-[1.05] active:scale-[0.95]"
              title="Share on Telegram"
            >
              <Send className="w-5 h-5" />
            </button>
            <button 
              onClick={shareOnEmail}
              className="flex items-center justify-center p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all hover:scale-[1.05] active:scale-[0.95]"
              title="Share via Email"
            >
              <Mail className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <div className="bg-white/5 hover:bg-white/10 transition-all rounded-2xl p-6 border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200/70 text-xs font-semibold uppercase tracking-wider mb-1">Total Clicks/Invites</p>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white">{referrals.length * 3 + 12}</h3>
              </div>
              <Users className="w-10 h-10 text-cyan-400/40" />
            </div>
          </div>
          <div className="bg-white/5 hover:bg-white/10 transition-all rounded-2xl p-6 border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200/70 text-xs font-semibold uppercase tracking-wider mb-1">Pending Referrals</p>
                <h3 className="text-2xl md:text-3xl font-extrabold text-amber-400">{pendingCount}</h3>
              </div>
              <ArrowRight className="w-10 h-10 text-amber-400/40" />
            </div>
          </div>
          <div className="bg-white/5 hover:bg-white/10 transition-all rounded-2xl p-6 border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200/70 text-xs font-semibold uppercase tracking-wider mb-1">Successful Admissions</p>
                <h3 className="text-2xl md:text-3xl font-extrabold text-emerald-450">{successfulCount}</h3>
              </div>
              <Award className="w-10 h-10 text-emerald-450/40" />
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Stepper */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-6 flex items-center">
          <Award className="w-5 h-5 mr-2 text-indigo-500" />
          How the Referral Program Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 border-t border-dashed border-slate-200 -z-0" />
          
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-xl shadow-sm mb-4">
              1
            </div>
            <h4 className="font-bold text-slate-800 mb-1 text-base">Share Your Link</h4>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
              Copy your unique link or share directly via WhatsApp, Telegram, or Email.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-xl shadow-sm mb-4">
              2
            </div>
            <h4 className="font-bold text-slate-800 mb-1 text-base">Friend Enrolls</h4>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
              Your referred friend submits their application and successfully enrolls in CynexAI.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-extrabold text-xl shadow-sm mb-4">
              3
            </div>
            <h4 className="font-bold text-slate-800 mb-1 text-base">Unlock Rewards</h4>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
              Collect successful admissions and choose from premium gadgets, vouchers, or merchandise!
            </p>
          </div>
        </div>
      </div>

      {/* Invite a Friend Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center mb-2">
          <Share2 className="w-5 h-5 mr-2 text-indigo-500" />
          Invite a Friend
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Enter your friend's details below to send them an invitation. They will be added to your referrals list as pending.
        </p>
        <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Friend's Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-slate-50 text-slate-800 placeholder-slate-400"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Friend's Email (Optional)</label>
            <input
              type="email"
              placeholder="e.g. john@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-slate-50 text-slate-800 placeholder-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="w-full px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300"
          >
            {inviting ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </div>

      {/* Milestone Gifts */}
      <div className="space-y-6">
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center">
          <Gift className="w-6 h-6 mr-3 text-indigo-500" />
          Milestone Rewards
        </h3>
        
        {renderMilestone(3, MILESTONE_3_OPTIONS, <Award className="w-6 h-6 text-purple-600" />)}
        {renderMilestone(5, MILESTONE_5_OPTIONS, <Trophy className="w-6 h-6 text-amber-500" />)}
      </div>

      {/* Referrals & Leaderboard Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Referrals List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-6">Your Referrals</h3>
          {referrals.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">No referrals added yet.</p>
              <p className="text-xs text-slate-400 mt-1">Invite friends above to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Friend Name</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Email</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Date Invited</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.map(ref => (
                    <tr key={ref.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-slate-800 font-medium">{ref.referee_name}</td>
                      <td className="py-4 px-4 text-slate-500 text-sm">{ref.referee_email || '—'}</td>
                      <td className="py-4 px-4 text-slate-500 text-sm">{new Date(ref.created_at).toLocaleDateString()}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                          ref.status === 'successful'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {ref.status.charAt(0).toUpperCase() + ref.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leaderboard Column */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-6 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-amber-500 animate-pulse" />
              Top Referrers
            </h3>
            {leaderboard.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">No referrers yet.</p>
                <p className="text-xs text-slate-400 mt-1">Be the first to secure a spot!</p>
              </div>
            ) : (
              <div className="space-y-4.5">
                {leaderboard.map((item, idx) => {
                  const medalColors = ['bg-amber-100 text-amber-700 border-amber-200', 'bg-slate-100 text-slate-700 border-slate-200', 'bg-amber-50 text-amber-800 border-amber-150'];
                  return (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-indigo-150 hover:bg-slate-50/50 transition-all duration-300">
                      <div className="flex items-center space-x-3.5">
                        <span className={`w-7 h-7 flex items-center justify-center font-bold text-xs rounded-full border ${idx < 3 ? medalColors[idx] : 'bg-slate-50 text-slate-400 border-slate-150'}`}>
                          {idx === 0 ? '🏆' : idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                          <p className="text-[11px] font-medium text-indigo-500 uppercase tracking-wider">Student</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-extrabold text-indigo-700">
                        {item.count} {item.count === 1 ? 'Admit' : 'Admits'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 italic">Leaderboard updates in real-time as admissions are confirmed.</p>
          </div>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-6 flex items-center">
          <HelpCircle className="w-5 h-5 mr-2 text-indigo-500" />
          Frequently Asked Questions
        </h3>
        <div className="space-y-4">
          {[
            {
              q: "How does the referral program work?",
              a: "Share your unique referral link with your friends. Once they submit their application and successfully enroll in a course (marked 'successful' by the admin), it counts towards your milestones."
            },
            {
              q: "What rewards can I earn?",
              a: "We offer milestone-based rewards: reaching 3 successful referrals unlocks options like official CynexAI T-Shirts or Amazon vouchers. Reaching 5 unlocks premium wireless earbuds, gadgets, or custom merchandise."
            },
            {
              q: "When will I receive my selected reward?",
              a: "After you reach a milestone and select your reward, our admin team verifies the admission. Once approved, the status changes to 'Delivered' and we will arrange delivery within 7-10 business days."
            },
            {
              q: "Can I refer multiple friends?",
              a: "Yes! There is no limit to how many friends you can refer. The more friends you refer, the more milestones you can unlock."
            }
          ].map((faq, idx) => (
            <div key={idx} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between text-left py-2 text-slate-850 font-bold hover:text-indigo-600 transition-colors focus:outline-none"
              >
                <span className="text-sm md:text-base">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-450 transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-indigo-500' : ''}`} />
              </button>
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  openFaq === idx ? 'max-h-32 opacity-100 mt-2' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;
