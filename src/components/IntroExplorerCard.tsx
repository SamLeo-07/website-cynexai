import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Brain, Database, Code, Cloud, Sparkles,
  Target, ArrowRight, Compass, Award, Zap, Users,
  TrendingUp, CheckCircle, Star, Rocket
} from 'lucide-react';
import { useToast } from './ToastContext';
import './IntroExplorerCard.css';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface PathFeature {
  label: string;
  desc: string;
  color: string;
}

interface CareerPath {
  id: string;
  name: string;
  tag: string;
  description: string;
  colorA: string;
  colorB: string;
  borderColor: string;
  accentColor: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  features: PathFeature[];
  badge: string;
  badgeDesc: string;
  rewardA: string;
  rewardB: string;
}

/* ─── Career Paths Data ──────────────────────────────────────────────── */
const PATHS: CareerPath[] = [
  {
    id: 'ai',
    name: 'AI & Generative AI',
    tag: 'Build the tools of tomorrow',
    description:
      'Design neural networks, fine-tune LLMs, and build intelligent automation systems from the ground up — with hands-on projects that actually ship.',
    colorA: '#7c3aed',
    colorB: '#4f46e5',
    borderColor: 'rgba(124,58,237,0.5)',
    accentColor: '#a78bfa',
    icon: Brain,
    rewardA: '#7c3aed',
    rewardB: '#4f46e5',
    badge: 'AI Visionary Badge',
    badgeDesc: 'Awarded to learners who step into the AI frontier.',
    features: [
      { label: 'Inline Code Sandbox', desc: 'Write & run Python and PyTorch right beside video lectures.', color: '#a78bfa' },
      { label: 'Auto Attendance', desc: 'Watch 80% of a lecture and attendance marks itself. Zero stress.', color: '#818cf8' },
      { label: 'AI-Guided Mock Tests', desc: 'Adaptive MCQs with instant AI explanations if you struggle.', color: '#6366f1' },
      { label: 'Priority Placements', desc: '50+ partner companies with direct interview referrals.', color: '#4f46e5' },
    ],
  },
  {
    id: 'data',
    name: 'Data Science & ML',
    tag: 'Turn data into business decisions',
    description:
      'Master statistical modeling, predictive ML algorithms, and business analytics through live datasets and real capstone projects.',
    colorA: '#db2777',
    colorB: '#9333ea',
    borderColor: 'rgba(219,39,119,0.5)',
    accentColor: '#f472b6',
    icon: Database,
    rewardA: '#db2777',
    rewardB: '#9333ea',
    badge: 'Data Alchemist Badge',
    badgeDesc: 'Awarded to future data leaders and ML architects.',
    features: [
      { label: 'SQL & Notebook Lab', desc: 'Query real datasets and build dashboards inside the portal.', color: '#f472b6' },
      { label: 'Passive Progress Tracking', desc: 'Your learning log updates silently — focus on analysis.', color: '#e879f9' },
      { label: 'Sequential Assessments', desc: 'Structured path with AI tutor backup if you need it.', color: '#c026d3' },
      { label: 'Corporate Referrals', desc: 'Capstone projects reviewed by actual data team leads.', color: '#9333ea' },
    ],
  },
  {
    id: 'fullstack',
    name: 'Full-Stack Development',
    tag: 'Build complete digital products',
    description:
      'Learn React, Node.js, and databases to ship real web apps — with live client projects as part of your curriculum.',
    colorA: '#ea580c',
    colorB: '#f59e0b',
    borderColor: 'rgba(234,88,12,0.5)',
    accentColor: '#fb923c',
    icon: Code,
    rewardA: '#ea580c',
    rewardB: '#f59e0b',
    badge: 'Dev Prodigy Badge',
    badgeDesc: 'Awarded to builders who ship real software.',
    features: [
      { label: 'Browser Dev Console', desc: 'Code React and backend APIs alongside class recordings.', color: '#fb923c' },
      { label: 'Automated Attendance', desc: 'Watch-time triggers attendance — stay in your flow state.', color: '#f97316' },
      { label: 'Code Review Mocks', desc: 'Exams that mirror real interviews with 1-on-1 doubt sessions.', color: '#ea580c' },
      { label: 'Internship Pipeline', desc: 'Work on live client projects and get direct referral letters.', color: '#d97706' },
    ],
  },
  {
    id: 'devops',
    name: 'Cloud & DevOps',
    tag: 'Scale systems at enterprise level',
    description:
      'Master AWS, Kubernetes, CI/CD pipelines, and infrastructure-as-code through guided labs and certification simulators.',
    colorA: '#0d9488',
    colorB: '#0891b2',
    borderColor: 'rgba(13,148,136,0.5)',
    accentColor: '#2dd4bf',
    icon: Cloud,
    rewardA: '#0d9488',
    rewardB: '#0891b2',
    badge: 'Cloud Commander Badge',
    badgeDesc: 'Awarded to engineers who master cloud at scale.',
    features: [
      { label: 'Browser Terminal Lab', desc: 'Run Docker, Kubernetes scripts in an in-browser environment.', color: '#2dd4bf' },
      { label: 'Watch-Time Sync', desc: 'Study hours log automatically as you complete lectures.', color: '#22d3ee' },
      { label: 'AWS Exam Simulator', desc: 'Practice AWS cert exams with AI-suggested study paths.', color: '#0891b2' },
      { label: 'Hiring Partner Access', desc: 'Present cloud projects directly to 50+ hiring agencies.', color: '#0d9488' },
    ],
  },
];

/* ─── Star Particles ─────────────────────────────────────────────────── */
const STARS = Array.from({ length: 35 }, (_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  dur: `${2 + Math.random() * 4}s`,
  delay: `${Math.random() * 4}s`,
}));

/* ─── Component ──────────────────────────────────────────────────────── */
export default function IntroExplorerCard() {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { showToast } = useToast();
  const detailRef = useRef<HTMLDivElement>(null);

  const selectedPath = PATHS.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    const seen = sessionStorage.getItem('cynexai_explorer_v2_seen');
    if (!seen) {
      const t = setTimeout(() => setIsVisible(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('cynexai_explorer_v2_seen', 'true');
  };

  const handleSelectPath = (path: CareerPath) => {
    setSelectedId(path.id);
    if (detailRef.current) {
      detailRef.current.scrollTop = 0;
    }
  };

  const handleLockIn = () => {
    if (!selectedPath) return;

    // XP reward
    const prev = parseInt(localStorage.getItem('cynexai_sandbox_xp') || '0', 10);
    localStorage.setItem('cynexai_sandbox_xp', String(prev + 150));

    // Badge reward
    try {
      const badges: string[] = JSON.parse(localStorage.getItem('cynexai_custom_badges') || '[]');
      if (!badges.includes(selectedPath.badge)) {
        badges.push(selectedPath.badge);
        localStorage.setItem('cynexai_custom_badges', JSON.stringify(badges));
      }
    } catch (_) { /* noop */ }

    showToast(`🎉 ${selectedPath.badge} unlocked! +150 XP rewarded.`, 'success');
    handleClose();

    setTimeout(() => {
      const el = document.getElementById('contact');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => showToast('Fill out the form to book your free counselling session!', 'success'), 600);
      }
    }, 700);
  };

  const PathIcon = selectedPath?.icon;

  return (
    <>
      {/* ── Floating Launcher ────────────────────────────────────────── */}
      <motion.button
        className="iec-launcher"
        whileHover={{ scale: 1.04, y: -3 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => { setIsVisible(true); }}
        aria-label="Open Career Explorer"
      >
        <span className="iec-launcher-icon">
          <Compass size={15} color="#fff" />
        </span>
        <span>Find My Career Path</span>
        <span className="iec-ping">
          <span className="iec-ping-ring" />
          <span className="iec-ping-dot" />
        </span>
      </motion.button>

      {/* ── Modal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="iec-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
          >
            <motion.div
              className="iec-card"
              initial={{ scale: 0.92, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
            >


              {/* ── Close Button ────────────────────────────────────── */}
              <button className="iec-close-btn" onClick={handleClose} aria-label="Close">
                <X size={15} />
              </button>

              {/* ── Header ──────────────────────────────────────────── */}
              <div className="iec-header">
                <div className="iec-brand">
                  <div className="iec-eyebrow">
                    <span className="iec-eyebrow-dot" />
                    <Sparkles size={10} />
                    Designed for your ambition
                  </div>
                  <h2 className="iec-headline">
                    One platform.{' '}
                    <span className="iec-headline-accent">Infinite futures.</span>
                  </h2>
                  <p className="iec-subline">
                    Pick your career direction and see exactly how CynexAI gets you there — with real tools, real projects, real results.
                  </p>
                </div>

                <div className="iec-stats-row">
                  <div className="iec-stat">
                    <div className="iec-stat-num" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>2,400+</div>
                    <div className="iec-stat-label">Graduates</div>
                  </div>
                  <div className="iec-stat">
                    <div className="iec-stat-num" style={{ background: 'linear-gradient(135deg,#a78bfa,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>93%</div>
                    <div className="iec-stat-label">Placement Rate</div>
                  </div>
                  <div className="iec-stat">
                    <div className="iec-stat-num" style={{ background: 'linear-gradient(135deg,#2dd4bf,#0891b2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>50+</div>
                    <div className="iec-stat-label">Hiring Partners</div>
                  </div>
                </div>
              </div>

              {/* ── Body ────────────────────────────────────────────── */}
              <div className="iec-body">
                {/* Left: Path Selector */}
                <div className="iec-paths">
                  <div className="iec-paths-title">
                    <Target size={10} style={{ display: 'inline', marginRight: 5 }} />
                    Choose your direction
                  </div>

                  {PATHS.map((path) => {
                    const PIcon = path.icon;
                    const isActive = selectedId === path.id;
                    return (
                      <motion.button
                        key={path.id}
                        className={`iec-path-card ${isActive ? 'active' : ''}`}
                        style={{
                          '--path-color-a': path.colorA,
                          '--path-color-b': path.colorB,
                          '--path-border': path.borderColor,
                          '--path-accent': path.accentColor,
                        } as React.CSSProperties}
                        onClick={() => handleSelectPath(path)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div
                          className="iec-path-icon"
                          style={{ background: `linear-gradient(135deg, ${path.colorA}22, ${path.colorB}33)` }}
                        >
                          <PIcon size={20} color={path.accentColor} />
                        </div>
                        <div className="iec-path-text">
                          <div className="iec-path-name">{path.name}</div>
                          <div className="iec-path-tag">{path.tag}</div>
                        </div>
                        {isActive && (
                          <motion.div
                            className="iec-path-check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                          >
                            <CheckCircle size={12} color="#fff" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Right: Detail Panel */}
                <div className="iec-detail" ref={detailRef}>
                  <AnimatePresence mode="wait">
                    {!selectedPath ? (
                      <motion.div
                        key="empty"
                        className="iec-empty"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="iec-empty-icon">
                          <Rocket size={28} color="rgba(167,139,250,0.7)" />
                        </div>
                        <div className="iec-empty-title">Your story starts here</div>
                        <div className="iec-empty-sub">
                          Select a career path on the left to discover exactly how we'll get you there.
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                          {[
                            { icon: Star, label: 'Live Projects', color: '#f97316' },
                            { icon: Users, label: 'Mentors', color: '#a78bfa' },
                            { icon: TrendingUp, label: 'Fast Growth', color: '#2dd4bf' },
                          ].map(({ icon: Icon, label, color }) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: `${color}18`, border: `1px solid ${color}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 6px'
                              }}>
                                <Icon size={16} color={color} />
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>{label}</div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={selectedPath.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
                      >
                        {/* Role Header */}
                        <div className="iec-role-header">
                          <div
                            className="iec-role-icon"
                            style={{ background: `linear-gradient(135deg, ${selectedPath.colorA}33, ${selectedPath.colorB}44)` }}
                          >
                            {PathIcon && <PathIcon size={24} color={selectedPath.accentColor} />}
                          </div>
                          <div>
                            <div className="iec-role-name">{selectedPath.name}</div>
                            <div className="iec-role-sub">{selectedPath.tag}</div>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="iec-role-desc">{selectedPath.description}</p>

                        {/* Features */}
                        <div className="iec-features">
                          {selectedPath.features.map((f, i) => (
                            <motion.div
                              key={f.label}
                              className="iec-feature iec-animate-in"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.06, duration: 0.3 }}
                            >
                              <div className="iec-feature-dot" style={{ background: f.color, boxShadow: `0 0 8px ${f.color}60` }} />
                              <div className="iec-feature-text">
                                <div className="iec-feature-label" style={{ color: f.color }}>{f.label}</div>
                                <div className="iec-feature-desc">{f.desc}</div>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* Badge Reward */}
                        <motion.div
                          className="iec-badge-reward"
                          style={{
                            '--reward-a': selectedPath.rewardA,
                            '--reward-b': selectedPath.rewardB,
                          } as React.CSSProperties}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.25, duration: 0.3 }}
                        >
                          <div className="iec-badge-reward-border" />
                          <div className="iec-badge-icon">
                            <Award size={20} color={selectedPath.accentColor} />
                          </div>
                          <div className="iec-badge-text">
                            <div className="iec-badge-name">{selectedPath.badge}</div>
                            <div className="iec-badge-sub">{selectedPath.badgeDesc}</div>
                          </div>
                          <div style={{ textAlign: 'center', flexShrink: 0 }}>
                            <div className="iec-xp-pill">+150 XP</div>
                            <div className="iec-xp-label">Welcome Bonus</div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Footer CTA ──────────────────────────────────────── */}
              <div className="iec-footer">
                <button className="iec-skip-btn" onClick={handleClose}>
                  Skip for now
                </button>

                {selectedPath ? (
                  <motion.button
                    className="iec-cta-btn"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleLockIn}
                  >
                    <Zap size={15} />
                    <span>Claim My Path & Get Started</span>
                    <ArrowRight size={15} />
                  </motion.button>
                ) : (
                  <div className="iec-cta-disabled-msg">← Select a path to continue</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
