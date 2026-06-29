import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Award, Trophy } from 'lucide-react';

interface ScrollingBannerProps {
  messages: { text: string; icon: 'gift' | 'award' | 'trophy' }[];
}

const ScrollingBanner: React.FC<ScrollingBannerProps> = ({ messages }) => {
  if (!messages || messages.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'gift': return <Gift className="w-4 h-4 text-purple-400 mr-2" />;
      case 'award': return <Award className="w-4 h-4 text-yellow-400 mr-2" />;
      case 'trophy': return <Trophy className="w-4 h-4 text-orange-400 mr-2" />;
      default: return <Gift className="w-4 h-4 text-purple-400 mr-2" />;
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-950 border-b border-indigo-500/20 py-2.5 overflow-hidden relative shadow-inner">
      <div className="flex whitespace-nowrap overflow-hidden">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 30,
              ease: 'linear',
            },
          }}
          className="flex items-center space-x-16 whitespace-nowrap pr-16"
        >
          {/* Copy 1 */}
          {messages.map((msg, index) => (
            <div key={`c1-${index}`} className="flex items-center text-sm text-indigo-100 font-semibold whitespace-nowrap">
              {getIcon(msg.icon)}
              {msg.text}
            </div>
          ))}
          {/* Copy 2 */}
          {messages.map((msg, index) => (
            <div key={`c2-${index}`} className="flex items-center text-sm text-indigo-100 font-semibold whitespace-nowrap">
              {getIcon(msg.icon)}
              {msg.text}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default ScrollingBanner;
