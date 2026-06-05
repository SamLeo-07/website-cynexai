import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, MapPin, DollarSign, ExternalLink, 
  Download, Mail, Phone, Globe,
  ShieldCheck, Loader2, Sparkles
} from 'lucide-react';
import { getJobListings, JobListing } from '../lib/turso';

const CareerHub = () => {
  const [activeSubTab, setActiveSubTab] = useState<'jobs' | 'resume'>('jobs');
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resumeData, setResumeData] = useState({
    targetRole: 'Full Stack AI Developer',
    summary: 'Passionate software engineer specializing in Large Language Models and React ecosystems.',
    email: 'student.cynexai@example.com',
    phone: '+91 99887 76655'
  });

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await getJobListings();
        setJobs(data);
      } catch (error) {
        console.error("Failed to load jobs", error);
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, []);

  const handleGenerateAI = () => {
    setIsGenerating(true);
    // Simulate AI Generation
    setTimeout(() => {
      setResumeData(prev => ({
        ...prev,
        summary: `Expert ${prev.targetRole} with advanced knowledge of CynexAI training methodologies. Proficient in integrating neural networks with high-scale web architectures. Committed to technical excellence and continuous innovation.`
      }));
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-8">
      {/* Sub Navigation */}
      <div className="flex gap-4 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit relative z-20">
        <button
          onClick={() => setActiveSubTab('jobs')}
          className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeSubTab === 'jobs' ? 'bg-[#41c8df] text-black shadow-lg shadow-[#41c8df]/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          Job Board
        </button>
        <button
          onClick={() => setActiveSubTab('resume')}
          className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeSubTab === 'resume' ? 'bg-[#41c8df] text-black shadow-lg shadow-[#41c8df]/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          Resume Builder
        </button>
      </div>

      <motion.div
        key={activeSubTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {activeSubTab === 'jobs' ? (
          loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 text-[#41c8df] animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {jobs.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
                  <Briefcase className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold">No active listings found. Check back soon!</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <motion.div 
                    layout
                    key={job.id} 
                    className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:border-[#41c8df]/50 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#41c8df]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-[#41c8df]/10 rounded-2xl flex items-center justify-center border border-[#41c8df]/20">
                          <Briefcase className="w-8 h-8 text-[#41c8df]" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white group-hover:text-[#41c8df] transition-colors">{job.title}</h3>
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">{job.company}</p>
                        </div>
                      </div>
                      <span className="px-4 py-1.5 bg-[#41c8df]/10 text-[#41c8df] border border-[#41c8df]/20 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        {job.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8 relative z-10">
                      <div className="flex items-center text-sm text-gray-400 font-bold">
                        <MapPin className="w-4 h-4 mr-2 text-[#41c8df]" />
                        {job.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-400 font-bold">
                        <DollarSign className="w-4 h-4 mr-2 text-[#41c8df]" />
                        {job.salary}
                      </div>
                    </div>

                    <div className="flex items-center justify-between relative z-10 pt-6 border-t border-white/5">
                      <span className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">{job.category}</span>
                      <button 
                        onClick={() => alert(`Application for ${job.title} at ${job.company} has been initialized. Our recruitment bot will contact you via email.`)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#41c8df]/10 text-[#41c8df] font-black rounded-xl text-xs uppercase tracking-widest hover:bg-[#41c8df] hover:text-black transition-all"
                      >
                        Apply Now <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Resume Editor */}
            <div className="xl:col-span-1 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-[#41c8df]" /> Resume AI
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Target Role</label>
                    <input 
                      type="text" 
                      value={resumeData.targetRole}
                      onChange={(e) => setResumeData({...resumeData, targetRole: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-[#41c8df] transition-all" 
                      aria-label="Target Role"
                      placeholder="e.g. AI Developer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Professional Summary</label>
                    <textarea 
                      rows={4} 
                      value={resumeData.summary}
                      onChange={(e) => setResumeData({...resumeData, summary: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none focus:border-[#41c8df] transition-all resize-none" 
                      aria-label="Professional Summary"
                      placeholder="Briefly describe your expertise..."
                    />
                  </div>
                  <button 
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="w-full py-5 bg-[#41c8df] text-black font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#41c8df]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>Generating... <Loader2 className="w-5 h-5 animate-spin" /></>
                    ) : (
                      <>Refine with AI <Sparkles className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Resume Preview */}
            <div className="xl:col-span-2">
              <div className="bg-white text-black rounded-[3rem] p-16 shadow-2xl min-h-[900px] relative overflow-hidden selection:bg-[#41c8df]/30">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#41c8df]/10 rounded-bl-[120px]" />
                
                <header className="flex justify-between items-start mb-16 border-b-2 border-gray-100 pb-16">
                  <div>
                    <h1 className="text-6xl font-black tracking-tighter mb-2 uppercase leading-none">John Doe</h1>
                    <p className="text-[#41c8df] text-2xl font-black uppercase tracking-[0.2em]">{resumeData.targetRole}</p>
                  </div>
                  <div className="text-right space-y-2 text-gray-500 font-bold text-sm">
                    <p className="flex items-center justify-end gap-3"><Mail className="w-5 h-5 text-gray-300" /> {resumeData.email}</p>
                    <p className="flex items-center justify-end gap-3"><Phone className="w-5 h-5 text-gray-300" /> {resumeData.phone}</p>
                    <p className="flex items-center justify-end gap-3"><Globe className="w-5 h-5 text-gray-300" /> portfolio.cynexai.in</p>
                  </div>
                </header>

                <section className="mb-16">
                  <h3 className="text-sm font-black uppercase tracking-[0.4em] text-gray-300 mb-8 flex items-center gap-6">
                    Professional Statement <div className="h-px bg-gray-100 flex-1" />
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-lg font-medium italic">
                    "{resumeData.summary}"
                  </p>
                </section>

                <section className="mb-16">
                  <h3 className="text-sm font-black uppercase tracking-[0.4em] text-gray-300 mb-8 flex items-center gap-6">
                    Core Protocol Skills <div className="h-px bg-gray-100 flex-1" />
                  </h3>
                  <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-4">
                      <h4 className="font-black text-xl border-l-4 border-[#41c8df] pl-4">AI Architecture</h4>
                      <p className="text-gray-600 leading-relaxed text-sm font-medium">Expertise in Transformer models, Vector Databases (Pinecone), and LangChain orchestration for production-grade AI agents.</p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-black text-xl border-l-4 border-emerald-400 pl-4">Full Stack Systems</h4>
                      <p className="text-gray-600 leading-relaxed text-sm font-medium">Building scalable microservices with Java Spring Boot and high-fidelity frontends using React, Tailwind, and Framer Motion.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-black uppercase tracking-[0.4em] text-gray-300 mb-8 flex items-center gap-6">
                    Verified Credentials <div className="h-px bg-gray-100 flex-1" />
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-6 bg-gray-50 rounded-[2rem] border border-gray-100 group hover:bg-[#41c8df]/5 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                          <ShieldCheck className="w-8 h-8 text-[#41c8df]" />
                        </div>
                        <div>
                          <p className="font-black text-lg">Lead AI Systems Architect</p>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">CynexAI Masterclass Certification</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-gray-400 block mb-1">VALIDATED</span>
                        <span className="px-3 py-1 bg-[#41c8df]/10 text-[#41c8df] text-[10px] font-black rounded-lg">MAY 2026</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Floating Controls */}
                <div className="absolute bottom-10 right-10 flex gap-4">
                  <button 
                    className="p-5 bg-black text-white rounded-[1.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all group"
                    aria-label="Download Resume"
                    title="Download Resume"
                  >
                    <Download className="w-7 h-7 group-hover:animate-bounce" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CareerHub;
