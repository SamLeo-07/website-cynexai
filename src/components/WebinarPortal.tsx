import { motion } from 'framer-motion';

const WebinarPortal = () => {
  return (
    <div className="min-h-screen bg-transparent pt-32 pb-20 px-4 relative z-10">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-background/40 backdrop-blur-xl border border-secondary/10 rounded-[2.5rem] p-12 md:p-20 text-center shadow-[0_0_50px_rgba(65,200,223,0.15)] transition-all"
        >
          <h1 className="text-4xl md:text-5xl font-black text-secondary mb-6 uppercase tracking-tight">
            Webinar <span className="text-[#41c8df]">Portal</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-12">
            Join our interactive online sessions and learn from industry experts in real-time.
          </p>

          <div className="bg-secondary/5 rounded-2xl border border-secondary/10 p-12 text-gray-400 font-medium tracking-wide">
            No webinar sessions are currently scheduled.
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default WebinarPortal;
