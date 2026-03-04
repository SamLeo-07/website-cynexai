

import { motion, Variants } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Brain, Lightbulb, Users, Target } from 'lucide-react';
import './Skills.css';

// ─── 3D Orbital Ring ─────────────────────────────────────────────────────────
const OrbitalRing = ({ color, size, speed, tilt }: {
  color: string;
  size: number;
  speed: number;
  tilt: number;
}) => {
  const colorClass = color.replace('#', '');
  return (
    <div
      className={`absolute rounded-full border opacity-30 orbital-ring ring-size-${size} ring-speed-${speed} ring-tilt-${tilt} ring-color-${colorClass}`}
    />
  );
};

import TiltCard from './TiltCard';

const Skills = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const skills = [
    {
      icon: Brain,
      title: 'Critical Thinking',
      description: 'Develop analytical skills to solve complex problems and make data-driven decisions in technology.',
      color: 'from-[#41c8df] to-amber-500',
      ringColor: '#41c8df',
    },
    {
      icon: Target,
      title: 'Problem Solving',
      description: 'Master systematic approaches to identify, analyze, and resolve technical challenges efficiently.',
      color: 'from-[#41c8df] to-yellow-500',
      ringColor: '#8b5cf6',
    },
    {
      icon: Lightbulb,
      title: 'Creative Thinking',
      description: 'Foster innovation and creativity to develop unique solutions and breakthrough technologies.',
      color: 'from-[#41c8df] to-orange-500',
      ringColor: '#06b6d4',
    },
    {
      icon: Users,
      title: 'Interpersonal Skills',
      description: 'Build strong communication and collaboration skills essential for team success in tech.',
      color: 'from-[#41c8df] to-yellow-600',
      ringColor: '#a78bfa',
    },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.18 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  };

  const headerVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: 'easeOut' } },
  };

  return (
    <section id="skills" className="py-20 relative bg-transparent overflow-hidden relative z-10">
      {/* Background glow elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-40 h-40 bg-[#41c8df]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* 3D Section Header */}
        <motion.div
          ref={ref}
          variants={headerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}

          className="text-center mb-16 skills-header-perspective"
        >
          <motion.h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-secondary">
            <span className="text-[#41c8df]">Essential Skills</span>
          </motion.h2>
          <motion.p className="text-xl text-secondary/80 max-w-3xl mx-auto">
            Beyond technical expertise, we develop the core skills that make you a well-rounded technology professional
          </motion.p>
        </motion.div>

        {/* Skill Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 skills-grid-perspective"
        >
          {skills.map((skill, index) => {
            const IconComponent = skill.icon;
            return (
              <motion.div key={index} variants={itemVariants} className="h-full">
                <TiltCard
                  scale={1.05}
                  tiltMaxAngleX={15}
                  tiltMaxAngleY={15}
                  className="h-full rounded-2xl cursor-default"
                >
                  <div className="group bg-gray-900/40 backdrop-blur-xl rounded-2xl p-8 border border-secondary/10 hover:border-[#41c8df]/60 transition-all duration-500 hover:shadow-[0_15px_40px_rgba(65,200,223,0.3)] text-center h-full relative overflow-hidden flex flex-col justify-start items-center">

                    {/* Glowing background blob behind icon */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-r from-[#41c8df]/10 to-purple-500/10 rounded-full blur-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Orbital rings behind icon */}
                    <div className="relative inline-flex items-center justify-center mb-6 orbital-ring-container mt-4">
                      <OrbitalRing color={skill.ringColor} size={90} speed={4} tilt={60} />
                      <OrbitalRing color={skill.ringColor} size={70} speed={6} tilt={30} />
                      <div className={`relative z-10 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${skill.color} group-hover:scale-110 transition-transform duration-500 skill-icon-3d shadow-lg`}
                      >
                        <IconComponent className="w-8 h-8 text-secondary drop-shadow-md" />
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-secondary mb-4 group-hover:text-[#41c8df] transition-colors duration-300">
                      {skill.title}
                    </h3>

                    <p className="text-gray-300 leading-relaxed font-medium">
                      {skill.description}
                    </p>

                    {/* Decorative dots moving to bottom */}
                    <div className="mt-auto pt-6 flex justify-center space-x-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full border border-${skill.ringColor}/30 bg-transparent opacity-30 group-hover:bg-gradient-to-r ${skill.color} group-hover:opacity-100 group-hover:border-transparent transition-all duration-500 skill-dot-delay-${i}`}
                        />
                      ))}
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Why These Skills Matter */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mt-20 text-center skills-matter-perspective"
        >
          <div className="bg-gray-900/40 backdrop-blur-2xl rounded-3xl p-8 border border-secondary/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_40px_rgba(65,200,223,0.15)] transition-all duration-500">
            <h3 className="text-3xl font-extrabold text-secondary mb-8 border-b border-gray-800 pb-4">
              Why These Skills Matter
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
              <div className="flex flex-col space-y-3">
                <h4 className="text-xl font-bold flex items-center text-[#41c8df]">
                  <span className="w-8 h-8 rounded-lg bg-[#41c8df]/10 flex items-center justify-center mr-3 border border-[#41c8df]/20">💼</span>
                  In the Workplace
                </h4>
                <p className="text-gray-300 text-lg leading-relaxed font-medium">
                  These soft skills complement your technical abilities, making you a valuable team member
                  who can communicate effectively, solve problems creatively, and adapt to changing requirements.
                </p>
              </div>
              <div className="flex flex-col space-y-3">
                <h4 className="text-xl font-bold flex items-center text-purple-500">
                  <span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mr-3 border border-purple-500/20">🚀</span>
                  For Career Growth
                </h4>
                <p className="text-gray-300 text-lg leading-relaxed font-medium">
                  Leadership positions require more than technical knowledge. These skills prepare you
                  for management roles and help you become a well-rounded technology professional.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Skills;
