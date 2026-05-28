import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Send, Heart,
  MoreVertical, Share2, Award, Zap,
  Loader2, BookOpen
} from 'lucide-react';
import { getDiscussions, createDiscussion, Discussion, getEnrollmentsByStudent, Enrollment, getCourses, Course } from '../lib/turso';

const CommunityFeed = () => {
  const [message, setMessage] = useState('');
  const [posts, setPosts] = useState<Discussion[]>([]);
  const [enrollments, setEnrollments] = useState<{ enrollment: Enrollment; course: Course }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('cynexai_student_id') || '';
    const name = localStorage.getItem('cynexai_student_name') || 'Student';
    setStudentId(id);
    setStudentName(name);

    const loadEnrollments = async () => {
      try {
        const [studentEnrollments, allCourses] = await Promise.all([
          getEnrollmentsByStudent(id),
          getCourses(true)
        ]);
        const enriched = studentEnrollments.map(enr => {
          const course = allCourses.find(c => c.id === enr.course_id);
          return course ? { enrollment: enr, course } : null;
        }).filter(Boolean) as { enrollment: Enrollment; course: Course }[];
        
        setEnrollments(enriched);
        if (enriched.length > 0) {
          setSelectedCourseId(enriched[0].course.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load community context", error);
        setLoading(false);
      }
    };
    loadEnrollments();
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    const loadPosts = async () => {
      setLoading(true);
      try {
        const data = await getDiscussions(selectedCourseId);
        setPosts(data);
      } catch (error) {
        console.error("Failed to load posts", error);
      } finally {
        setLoading(false);
      }
    };
    loadPosts();
  }, [selectedCourseId]);

  const handlePost = async () => {
    if (!message.trim() || !selectedCourseId || !studentId) return;
    
    setIsPosting(true);
    const newPost: Discussion = {
      id: crypto.randomUUID(),
      course_id: selectedCourseId,
      student_id: studentId,
      student_name: studentName,
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    try {
      await createDiscussion(newPost);
      setPosts([...posts, newPost]);
      setMessage('');
    } catch (error) {
      alert("Failed to transmit message.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Context Selector */}
      <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl w-fit">
        <div className="flex items-center gap-2 px-4 py-2 text-xs font-black text-[#41c8df] uppercase tracking-widest border-r border-white/10">
          <BookOpen className="w-4 h-4" /> Discussion Room
        </div>
        <select 
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="bg-transparent text-white font-bold text-sm px-4 py-2 outline-none cursor-pointer"
          title="Select Course"
        >
          {enrollments.map(enr => (
            <option key={enr.course.id} value={enr.course.id} className="bg-[#020817]">
              {enr.course.title}
            </option>
          ))}
          {enrollments.length === 0 && <option value="">No Active Courses</option>}
        </select>
      </div>

      {/* Post Box */}
      <div className="bg-secondary/5 border border-secondary/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#41c8df]/5 rounded-bl-full" />
        <div className="flex gap-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#41c8df] to-emerald-500 flex-shrink-0 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-[#41c8df]/20">
            {studentName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 space-y-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Share an insight on this course, ${studentName.split(' ')[0]}...`}
              className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#41c8df] transition-all resize-none min-h-[160px] text-lg font-medium"
            />
            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-3">
                <button 
                  className="p-3 text-gray-500 hover:text-[#41c8df] hover:bg-[#41c8df]/10 rounded-2xl transition-all border border-transparent hover:border-[#41c8df]/20"
                  aria-label="Add Zap Reaction"
                  title="Zap"
                >
                  <Zap className="w-5 h-5" />
                </button>
                <button 
                  className="p-3 text-gray-500 hover:text-[#41c8df] hover:bg-[#41c8df]/10 rounded-2xl transition-all border border-transparent hover:border-[#41c8df]/20"
                  aria-label="Add Award Reaction"
                  title="Award"
                >
                  <Award className="w-5 h-5" />
                </button>
              </div>
              <button 
                onClick={handlePost}
                disabled={isPosting || !message.trim()}
                className="px-10 py-4 bg-[#41c8df] text-black font-black rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-[#41c8df]/20 disabled:opacity-50 disabled:scale-100"
              >
                {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Post Update <Send className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-[#41c8df] animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
            <MessageSquare className="w-16 h-16 text-gray-700 mx-auto mb-6" />
            <p className="text-gray-500 font-bold">The frequency is silent. Be the first to start the discussion.</p>
          </div>
        ) : (
          posts.slice().reverse().map((post) => (
            <motion.div 
              layout
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 hover:border-white/20 transition-all group relative"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center font-black text-[#41c8df] text-xl border border-white/10">
                    {post.student_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-white group-hover:text-[#41c8df] transition-colors">{post.student_name}</h3>
                      {post.student_id === studentId && (
                        <span className="px-3 py-1 bg-[#41c8df]/10 text-[#41c8df] text-[10px] font-black uppercase tracking-widest rounded-lg border border-[#41c8df]/20">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-black uppercase tracking-[0.2em] mt-2">
                      {new Date(post.created_at).toLocaleDateString()} • {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button 
                  className="p-3 text-gray-600 hover:text-white transition-all bg-white/5 rounded-xl"
                  aria-label="Post Options"
                  title="More"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-300 leading-relaxed mb-10 text-xl font-medium">
                {post.message}
              </p>

              <div className="flex items-center justify-between pt-8 border-t border-white/5">
                <div className="flex items-center gap-8">
                  <button className="flex items-center gap-2 text-gray-500 hover:text-red-400 transition-all font-black text-xs uppercase tracking-widest group/btn">
                    <Heart className="w-5 h-5 group-hover/btn:fill-current" /> 0
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 hover:text-[#41c8df] transition-all font-black text-xs uppercase tracking-widest">
                    <MessageSquare className="w-5 h-5" /> Reply
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    className="p-3 text-gray-500 hover:text-white transition-all hover:bg-white/5 rounded-xl"
                    aria-label="Share Post"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommunityFeed;
