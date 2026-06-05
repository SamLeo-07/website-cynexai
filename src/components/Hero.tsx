
import { motion, Variants } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ArrowRight,
  Sparkles,
  Code,
  Brain,
  Rocket,
} from 'lucide-react';
import TiltCard from './TiltCard';

import studentsIcon from '../assets/students.png';
import jobPlacementIcon from '../assets/job-placement.png';
import partnersIcon from '../assets/partners.png';

// ─── 3D floating shapes mini-scene ───────────────────────────────────────────
const FloatingShape = ({ position, shape, color, speed }: {
  position: [number, number, number];
  shape: 'icosa' | 'torus' | 'box';
  color: string;
  speed: number;
}) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime() * speed;
    ref.current.rotation.x = t * 0.4;
    ref.current.rotation.y = t * 0.6;
    ref.current.position.y = position[1] + Math.sin(t * 0.5) * 0.3;
  });

  const geometry = shape === 'icosa'
    ? <icosahedronGeometry args={[0.6, 0]} />
    : shape === 'torus'
      ? <torusGeometry args={[0.5, 0.2, 12, 24]} />
      : <boxGeometry args={[0.7, 0.7, 0.7]} />;

  return (
    <mesh ref={ref} position={position}>
      {geometry}
      <meshStandardMaterial
        color={color}
        wireframe
        transparent
        opacity={0.6}
      />
    </mesh>
  );
};

const HeroScene = () => (
  <Canvas
    camera={{ position: [0, 0, 6], fov: 50 }}
    className="absolute inset-0 pointer-events-none"
    gl={{ alpha: true, antialias: false }}
    dpr={Math.min(window.devicePixelRatio, 1.5)}
  >
    <ambientLight intensity={0.5} />
    <pointLight position={[5, 5, 5]} color="#41c8df" intensity={2} />
    <FloatingShape position={[-3.5, 0.5, 0]} shape="icosa" color="#41c8df" speed={0.5} />
    <FloatingShape position={[3.5, -0.5, -1]} shape="torus" color="#8b5cf6" speed={0.4} />
    <FloatingShape position={[0, 2.2, -2]} shape="box" color="#06b6d4" speed={0.3} />
    <FloatingShape position={[-1.5, -2, -1]} shape="icosa" color="#a78bfa" speed={0.6} />
    <FloatingShape position={[2, 2, -3]} shape="torus" color="#41c8df" speed={0.35} />
  </Canvas>
);


const Hero = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
  };

  const itemVariants: Variants = {
    hidden: { y: 60, opacity: 0, rotateX: 20 },
    visible: {
      y: 0,
      opacity: 1,
      rotateX: 0,
      transition: { duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center"
          style={{ perspective: '1200px' }}
        >
          <motion.div variants={itemVariants} className="mb-8">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-[#41c8df]/10 border border-[#41c8df]/30 text-[#41c8df] text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              Transform Your Tech Career
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 text-secondary"
          >
            Build Your AI-Powered
            <br />
            <span className="text-[#41c8df]">Career</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-secondary/80 mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Join our cutting-edge programs and unlock your potential in AI, Machine Learning,
            and emerging technologies. Learn from industry experts and build the skills that matter.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <motion.div
              whileHover={{ scale: 1.07, rotateX: -5 }}
              whileTap={{ scale: 0.93 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Link
                to="/courses"
                className="group bg-slate-900 text-white hover:bg-slate-800 px-8 py-4 rounded-full font-semibold text-lg shadow-2xl transition-all duration-300 flex items-center"
              >
                Explore Courses
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.07, rotateX: -5 }}
              whileTap={{ scale: 0.93 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Link
                to="/courses"
                className="group bg-[#41c8df] text-black hover:bg-[#0891b2] hover:text-white px-8 py-4 rounded-full font-semibold text-lg shadow-2xl transition-all duration-300 flex items-center"
              >
                Enroll Now
              </Link>
            </motion.div>
          </motion.div>

          {/* 3D Tilt Stat Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-3 gap-3 sm:gap-8 max-w-4xl mx-auto"
          >
            {[
              { number: '500+', label: 'Students Trained', icon: studentsIcon, alt: 'Students icon' },
              { number: '95%', label: 'Job Placement Rate', icon: jobPlacementIcon, alt: 'Target icon' },
              { number: '50+', label: 'Industry Partners', icon: partnersIcon, alt: 'Handshake icon' },
            ].map((stat, index) => (
              <TiltCard
                key={index}
                scale={1.08}
                tiltMaxAngleX={20}
                tiltMaxAngleY={20}
                glareEnable={true}
                className="w-full h-full rounded-xl sm:rounded-2xl cursor-default group"
              >
                <div className="bg-background-100/60 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-secondary/10 dark:bg-gray-900/60 dark:border-[#41c8df]/30 transition-all duration-500 shadow-lg group-hover:shadow-[0_20px_50px_rgba(65,200,223,0.4)] group-hover:border-[#41c8df]/60 h-full w-full flex flex-col justify-center items-center">
                  <div className="text-xl sm:text-3xl mb-2 sm:mb-3 flex justify-center items-center">
                    <img src={stat.icon} alt={stat.alt} className="w-6 h-6 sm:w-10 sm:h-10 filter brightness-150 drop-shadow-[0_0_8px_rgba(65,200,223,0.5)] dark:brightness-100" />
                  </div>
                  <div className="text-xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#41c8df] to-blue-500 mb-1 sm:mb-2">{stat.number}</div>
                  <div className="text-secondary/70 font-medium text-[10px] sm:text-sm text-center leading-tight">{stat.label}</div>
                </div>
              </TiltCard>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-[#41c8df]/40 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-[#41c8df]/60 rounded-full mt-2 animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
