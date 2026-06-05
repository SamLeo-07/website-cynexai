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
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
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
    setSubmissionStatus('idle'); // Reset on path change
    if (detailRef.current) {
      detailRef.current.scrollTop = 0;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPath) return;
    
    setSubmissionStatus('loading');
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxmluWiU1uciTJuYYrrwuNWjugFyzWDzvG4mTuGlNN6zu2DAf7JmSb8mQL7UrGxHeQfTw/exec';

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, courseId: selectedPath.id, courseName: selectedPath.name }),
      });
      setSubmissionStatus('success');
      showToast('Application submitted successfully!', 'success');
      setTimeout(() => {
        handleClose();
        setFormData({ name: '', email: '', phone: '', message: '' });
        setSubmissionStatus('idle');
      }, 2500);
    } catch (error) {
      console.error(error);
      setSubmissionStatus('error');
      showToast('Failed to submit application', 'error');
    }
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
        <span>Enroll Now</span>
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
                    Start Your Journey.{' '}
                    <span className="iec-headline-accent">Enroll Now.</span>
                  </h2>
                  <p className="iec-subline">
                    Select a career path and fill out the enrollment form to get started. Our team will contact you shortly!
                  </p>
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
                    <motion.div
                      key={selectedPath ? selectedPath.id : 'default'}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
                    >
                        {/* Role Header */}
                        <div className="iec-role-header">
                          {selectedPath ? (
                            <>
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
                            </>
                          ) : (
                            <>
                              <div className="iec-role-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>
                                <Rocket size={24} color="rgba(167,139,250,0.7)" />
                              </div>
                              <div>
                                <div className="iec-role-name">Your story starts here</div>
                                <div className="iec-role-sub">Select a career path on the left to begin</div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Form */}
                        <form id="enrollment-form" onSubmit={handleSubmit} className="iec-enroll-form">
                          {submissionStatus === 'success' && (
                            <div className="iec-success-msg">
                              Application submitted! We will contact you soon.
                            </div>
                          )}
                          {submissionStatus === 'error' && (
                            <div className="iec-error-msg">
                              Failed to submit. Please try again.
                            </div>
                          )}
                          
                          <div className="iec-form-group">
                            <label>Full Name</label>
                            <input 
                              type="text" 
                              name="name" 
                              required 
                              value={formData.name} 
                              onChange={handleInputChange} 
                              placeholder="Enter your full name"
                              disabled={submissionStatus === 'loading' || submissionStatus === 'success'}
                            />
                          </div>
                          <div className="iec-form-group">
                            <label>Email Address</label>
                            <input 
                              type="email" 
                              name="email" 
                              required 
                              value={formData.email} 
                              onChange={handleInputChange} 
                              placeholder="Enter your email"
                              disabled={submissionStatus === 'loading' || submissionStatus === 'success'}
                            />
                          </div>
                          <div className="iec-form-group">
                            <label>Phone Number</label>
                            <input 
                              type="tel" 
                              name="phone" 
                              required 
                              value={formData.phone} 
                              onChange={handleInputChange} 
                              placeholder="Enter your phone number"
                              disabled={submissionStatus === 'loading' || submissionStatus === 'success'}
                            />
                          </div>
                          <div className="iec-form-group">
                            <label>Additional Message</label>
                            <textarea 
                              name="message" 
                              value={formData.message} 
                              onChange={handleInputChange} 
                              placeholder="Any questions or comments? (Optional)"
                              rows={2}
                              disabled={submissionStatus === 'loading' || submissionStatus === 'success'}
                            />
                          </div>
                        </form>
                      </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Footer CTA ──────────────────────────────────────── */}
              <div className="iec-footer">
                <button className="iec-skip-btn" onClick={handleClose}>
                  Skip for now
                </button>

                <motion.button
                  type="submit"
                  form="enrollment-form"
                  className="iec-cta-btn"
                  whileHover={{ scale: (!selectedPath || submissionStatus === 'loading' || submissionStatus === 'success') ? 1 : 1.03 }}
                  whileTap={{ scale: (!selectedPath || submissionStatus === 'loading' || submissionStatus === 'success') ? 1 : 0.97 }}
                  disabled={!selectedPath || submissionStatus === 'loading' || submissionStatus === 'success'}
                  style={{ opacity: !selectedPath ? 0.5 : 1, cursor: !selectedPath ? 'not-allowed' : 'pointer' }}
                >
                  <Zap size={15} />
                  <span>{submissionStatus === 'loading' ? 'Submitting...' : 'Submit Application'}</span>
                  <ArrowRight size={15} />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
