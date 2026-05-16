import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, Video, User, Star, 
  CheckCircle2, AlertCircle,
  Loader2, ExternalLink, Zap
} from 'lucide-react';
import { getMentorshipSessions, bookMentorship, MentorshipSession } from '../lib/turso';

const MentorshipHub = () => {
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [studentId, setStudentId] = useState('');

  const mentors = [
    { id: 1, name: 'Dr. Sarah Chen', expertise: 'Generative AI & LLMs', rating: 4.9, reviews: 124, image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' },
    { id: 2, name: 'Vikram Malhotra', expertise: 'Full Stack Java / Spring', rating: 4.8, reviews: 89, image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200' },
    { id: 3, name: 'Elena Rodriguez', expertise: 'DevOps & Kubernetes', rating: 5.0, reviews: 56, image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200' },
  ];

  useEffect(() => {
    const id = localStorage.getItem('cynexai_student_id') || '';
    setStudentId(id);
    
    const loadSessions = async () => {
      if (!id) return;
      try {
        const data = await getMentorshipSessions(id);
        setSessions(data);
      } catch (error) {
        console.error("Failed to load sessions", error);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, []);

  const handleBooking = async (date: number) => {
    if (!selectedMentorId || !studentId) return;
    
    setIsBooking(true);
    const mentor = mentors.find(m => m.id === selectedMentorId);
    
    const newSession: MentorshipSession = {
      id: crypto.randomUUID(),
      student_id: studentId,
      mentor_name: mentor?.name || 'Expert Mentor',
      date: `May ${date}, 2026`,
      time: '11:00 AM',
      status: 'upcoming',
      meeting_link: 'https://meet.cynexai.in/' + Math.random().toString(36).substring(7)
    };

    try {
      await bookMentorship(newSession);
      setSessions([newSession, ...sessions]);
      alert(`Success! Session booked with ${mentor?.name} for ${newSession.date}.`);
    } catch (error) {
      alert("Failed to book session. Protocol error.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      {/* Sessions & Booking */}
      <div className="lg:col-span-2 space-y-12">
        {/* Active Sessions */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-white flex items-center gap-4">
              <div className="p-3 bg-[#41c8df]/10 rounded-2xl border border-[#41c8df]/20">
                <Video className="w-8 h-8 text-[#41c8df]" />
              </div>
              My Sync Sessions
            </h2>
            <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-400">
              {sessions.length} Total Sessions
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#41c8df] animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {sessions.length === 0 ? (
                <div className="py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
                  <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-6" />
                  <p className="text-gray-500 font-bold">You have no upcoming sessions. Start by selecting a mentor.</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <motion.div 
                    layout
                    key={session.id} 
                    className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col sm:flex-row items-center justify-between group hover:border-[#41c8df]/40 transition-all relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#41c8df]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-center gap-8 relative z-10">
                      <div className="w-20 h-20 bg-[#41c8df]/10 rounded-3xl flex items-center justify-center border border-[#41c8df]/20 group-hover:scale-110 transition-transform">
                        <User className="w-10 h-10 text-[#41c8df]" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white group-hover:text-[#41c8df] transition-colors">{session.mentor_name}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-sm text-gray-400 font-bold flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#41c8df]" /> {session.date}
                          </p>
                          <p className="text-sm text-gray-400 font-bold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#41c8df]" /> {session.time}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 sm:mt-0 relative z-10 w-full sm:w-auto">
                      {session.status === 'upcoming' ? (
                        <a 
                          href={session.meeting_link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-full sm:w-auto px-10 py-4 bg-[#41c8df] text-black font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#41c8df]/30 flex items-center justify-center gap-2"
                        >
                          Join Briefing <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="flex items-center justify-center sm:justify-end text-emerald-400 text-xs font-black uppercase tracking-widest bg-emerald-500/10 px-6 py-3 rounded-xl border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Mission Accomplished
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Available Mentors */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-8">Executive Mentors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {mentors.map((mentor) => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={mentor.id}
                onClick={() => setSelectedMentorId(mentor.id)}
                className={`bg-white/5 border-[1.5px] rounded-[3rem] p-8 cursor-pointer transition-all relative overflow-hidden group ${
                  selectedMentorId === mentor.id ? 'border-[#41c8df] bg-[#41c8df]/5 ring-1 ring-[#41c8df]/50 shadow-2xl shadow-[#41c8df]/10' : 'border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-6 mb-8 relative z-10">
                  <div className="relative">
                    <img src={mentor.image} alt={mentor.name} className="w-20 h-20 rounded-[2rem] object-cover border-2 border-white/10 group-hover:border-[#41c8df] transition-colors" />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-[#020817] flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white fill-current" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-[#41c8df] transition-colors">{mentor.name}</h3>
                    <p className="text-xs text-[#41c8df] font-black uppercase tracking-widest mt-1">{mentor.expertise}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 mb-8 relative z-10">
                  <div className="flex items-center text-yellow-500 font-black text-sm">
                    <Star className="w-5 h-5 mr-1.5 fill-current" /> {mentor.rating}
                  </div>
                  <div className="text-xs text-gray-500 font-black uppercase tracking-widest">
                    {mentor.reviews} Verified Reviews
                  </div>
                </div>

                <div className="w-full py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl text-xs uppercase tracking-widest group-hover:bg-[#41c8df] group-hover:text-black transition-all text-center">
                  Select for Protocol
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {/* Booking Side Panel */}
      <div className="lg:col-span-1">
        <div className="bg-secondary/5 border border-secondary/10 rounded-[3rem] p-10 sticky top-32 shadow-2xl overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#41c8df] to-emerald-500" />
          
          <h3 className="text-2xl font-bold text-white mb-8">Mission Setup</h3>
          {selectedMentorId ? (
            <div className="space-y-8">
              <div className="p-6 bg-[#41c8df]/5 border border-[#41c8df]/10 rounded-[2rem]">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Operational Mentor</p>
                <p className="text-xl font-bold text-[#41c8df]">{mentors.find(m => m.id === selectedMentorId)?.name}</p>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex justify-between">
                  Target Date <span>Next Available Slots</span>
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[22, 23, 24, 25, 26, 27, 28, 29].map(d => (
                    <button 
                      key={d} 
                      onClick={() => handleBooking(d)}
                      disabled={isBooking}
                      className="p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black hover:border-[#41c8df] hover:text-[#41c8df] transition-all active:scale-90 disabled:opacity-50"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10">
                <AlertCircle className="text-blue-400 shrink-0" size={20} />
                <p className="text-[10px] text-blue-300 font-bold leading-relaxed uppercase tracking-wider">
                  You are eligible for <span className="text-white">Live Sync</span> protocols as a registered student.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 space-y-6">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-dashed border-white/20">
                <User className="w-10 h-10 text-gray-600 animate-pulse" />
              </div>
              <p className="text-gray-400 font-bold text-sm max-w-[200px] mx-auto leading-relaxed">Select an expert mentor to initialize your sync schedule.</p>
            </div>
          )}

          <div className="mt-10 pt-10 border-t border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Balance</p>
                <p className="text-sm text-emerald-400 font-black uppercase">2 Sessions Remaining</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorshipHub;
