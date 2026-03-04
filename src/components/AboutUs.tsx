import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, Variants, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Lightbulb, Rocket, Award, Code, Briefcase, Handshake } from 'lucide-react';
import './AboutUs.css';

// ─── 3D Parallax Tilt Card ────────────────────────────────────────────────────
const Tilt3DCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 250, damping: 25 });
  const ySpring = useSpring(y, { stiffness: 250, damping: 25 });
  const rotateX = useTransform(ySpring, [-0.5, 0.5], ['10deg', '-10deg']);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ['-10deg', '10deg']);

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: '900px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ====================================================================
// The complete AboutUs page component
// ====================================================================
const AboutUs = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if ((location.state as any)?.scrollToId) {
      const targetId = (location.state as any).scrollToId;
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          navigate(location.pathname, { replace: true, state: {} });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location, navigate]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: 'easeOut' } },
  };

  return (
    <div className="text-secondary font-inter pt-20 about-root bg-transparent min-h-screen">
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
              About <span className="text-[#41c8df]">CynexAI</span>
            </motion.h1>
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              We are a leading provider of innovative AI training and upskilling programs,
              dedicated to empowering individuals and businesses to thrive in the digital age.
            </motion.p>
          </motion.div>
        </div>
      </section>
      <section id="mission" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <motion.div
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={containerVariants}
          >
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-12">
              Our <span className="text-[#41c8df]">Mission</span> and <span className="text-[#41c8df]">Vision</span>
            </motion.h2>
            <div className="grid md:grid-cols-2 gap-12 text-left">
              <motion.div variants={itemVariants}>
                <Tilt3DCard className="bg-background/40 backdrop-blur-xl p-8 rounded-2xl shadow-[0_0_30px_rgba(65,200,223,0.1)] hover:shadow-[0_0_40px_rgba(65,200,223,0.2)] hover:border-[#41c8df]/40 border border-secondary/10 transition-all duration-300 h-full">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 rounded-full bg-[#41c8df] text-secondary about-icon-z">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-semibold">Our Mission</h3>
                  </div>
                  <p className="text-gray-300">
                    To provide accessible, high-quality, and hands-on training that equips students with the skills
                    needed to excel in a rapidly evolving technological landscape. We aim to bridge the gap between
                    academic knowledge and industry requirements.
                  </p>
                </Tilt3DCard>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Tilt3DCard className="bg-background/40 backdrop-blur-xl p-8 rounded-2xl shadow-[0_0_30px_rgba(65,200,223,0.1)] hover:shadow-[0_0_40px_rgba(65,200,223,0.2)] hover:border-[#41c8df]/40 border border-secondary/10 transition-all duration-300 h-full">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 rounded-full bg-[#41c8df] text-secondary about-icon-z">
                      <Rocket className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-semibold">Our Vision</h3>
                  </div>
                  <p className="text-gray-300">
                    To become the global leader in AI and tech education, fostering a community of innovators and
                    problem-solvers who drive positive change and contribute to the advancement of technology.
                  </p>
                </Tilt3DCard>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <motion.div
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={containerVariants}
          >
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-12">
              Why Choose <span className="text-[#41c8df]">CynexAI?</span>
            </motion.h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: Award, title: 'Expert Instructors', desc: 'Learn from seasoned professionals with extensive industry experience.' },
                { icon: Code, title: 'Hands-On Projects', desc: 'Gain practical experience through real-world projects and case studies.' },
                { icon: Briefcase, title: '100% Placement Assistance', desc: 'Our dedicated team helps you find the right career opportunity.' },
                { icon: Handshake, title: 'Supportive Community', desc: 'Join a network of peers and mentors who support your learning journey.' },
              ].map(({ icon: Icon, title, desc }, i) => (
                <motion.div key={i} variants={itemVariants}>
                  <Tilt3DCard className="bg-background/40 backdrop-blur-xl p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] text-center hover:shadow-[0_0_30px_rgba(65,200,223,0.2)] hover:border-[#41c8df]/40 border border-secondary/10 transition-all duration-300 h-full">
                    <div className="mx-auto w-16 h-16 rounded-full bg-[#41c8df]/10 flex items-center justify-center mb-4 about-icon-z-sm">
                      <Icon className="w-8 h-8 text-[#41c8df]" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-secondary">{title}</h3>
                    <p className="text-gray-400 text-sm">{desc}</p>
                  </Tilt3DCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default AboutUs;
