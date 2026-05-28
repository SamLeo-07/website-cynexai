import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { 
  Search, BookOpen, Clock, Users, Star, 
  ArrowRight, Sparkles, Filter, ShieldCheck, 
  Compass, HelpCircle, Laptop, Landmark 
} from 'lucide-react';
import { getCourses, Course } from '../lib/turso';
import TiltCard from './TiltCard';

const CoursesLanding = () => {
  const location = useLocation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const state = location.state as { category?: string } | null;
    if (state?.category) {
      setSelectedCategory(state.category);
    }
  }, [location.state]);

  // Categories definition
  const categories = [
    { id: 'All', label: 'All Programs' },
    { id: 'AI & Data Science', label: 'AI & Data Science' },
    { id: 'Development', label: 'Development' },
    { id: 'DevOps & Cloud', label: 'DevOps & Cloud' },
    { id: 'Testing & SAP', label: 'Testing & SAP' }
  ];

  // Fetch courses from Turso Database
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getCourses();
        setCourses(data);
        setFilteredCourses(data);
      } catch (error) {
        console.error('Failed to load courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Filter courses based on search query & selected category
  useEffect(() => {
    let result = courses;

    // Apply category filter
    if (selectedCategory !== 'All') {
      result = result.filter(course => {
        const title = course.title.toLowerCase();
        const desc = course.description.toLowerCase();
        if (selectedCategory === 'AI & Data Science') {
          return title.includes('ai') || title.includes('intelligence') || title.includes('data science') || title.includes('machine learning');
        }
        if (selectedCategory === 'Development') {
          return title.includes('java') || title.includes('python') || title.includes('programming') || title.includes('development');
        }
        if (selectedCategory === 'DevOps & Cloud') {
          return title.includes('devops') || title.includes('cloud');
        }
        if (selectedCategory === 'Testing & SAP') {
          return title.includes('testing') || title.includes('sap');
        }
        return false;
      });
    }

    // Apply search query filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(course => 
        course.title.toLowerCase().includes(query) || 
        course.description.toLowerCase().includes(query) ||
        course.skills.toLowerCase().includes(query)
      );
    }

    setFilteredCourses(result);
  }, [searchQuery, selectedCategory, courses]);

  // Helper to parse skills from JSON string
  const parseSkills = (skillsJson: string): string[] => {
    try {
      return JSON.parse(skillsJson);
    } catch {
      return ['AI', 'Tech'];
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const cardVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <div className="text-secondary font-inter pt-28 pb-20 min-h-screen bg-transparent relative overflow-hidden">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Immersive Hero Header */}
        <section className="text-center space-y-6 mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#41c8df]/15 to-blue-500/15 border border-[#41c8df]/25 rounded-full text-xs font-black tracking-widest text-[#41c8df] uppercase"
          >
            <Sparkles className="w-4 h-4" /> Discover Your Path
          </motion.div>
 
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black font-display tracking-tight text-secondary"
          >
            Build Your AI-Powered <span className="text-[#41c8df]">Career</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-secondary/80 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Choose from our elite, industry-accredited corporate training and career transition programs designed to land you high-paying roles.
          </motion.p>

          {/* Quick Metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-8 pt-6 max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 bg-secondary/5 border border-secondary/15 px-6 py-3 rounded-2xl">
              <Laptop className="w-5 h-5 text-[#41c8df]" />
              <div className="text-left">
                <div className="text-sm font-black text-secondary">Live Classes</div>
                <div className="text-xs text-secondary/60">Interactive & Hands-on</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-secondary/5 border border-secondary/15 px-6 py-3 rounded-2xl">
              <Users className="w-5 h-5 text-[#41c8df]" />
              <div className="text-left">
                <div className="text-sm font-black text-secondary">100% Placement</div>
                <div className="text-xs text-secondary/60">Dedicated Hiring Partners</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-secondary/5 border border-secondary/15 px-6 py-3 rounded-2xl">
              <ShieldCheck className="w-5 h-5 text-[#41c8df]" />
              <div className="text-left">
                <div className="text-sm font-black text-secondary">ISO Certified</div>
                <div className="text-xs text-secondary/60">Industry-Aligned Quality</div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Filters and Search Panel */}
        <section className="bg-background/30 backdrop-blur-xl border border-secondary/10 p-6 rounded-3xl shadow-2xl mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search courses, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-secondary placeholder-gray-500 focus:outline-none focus:border-[#41c8df] focus:ring-2 focus:ring-[#41c8df]/10 transition-all"
            />
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-black text-gray-500 uppercase tracking-widest mr-2 hidden lg:inline flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Category:
            </span>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                  selectedCategory === cat.id
                    ? 'bg-[#41c8df] text-black shadow-lg shadow-[#41c8df]/25'
                    : 'bg-secondary/5 text-gray-400 hover:text-white border border-secondary/10 hover:border-secondary/20'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Dynamic Course Grid */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-96 rounded-3xl bg-secondary/5 border border-secondary/10 animate-pulse flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-[#41c8df] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-20 bg-background/20 rounded-3xl border border-secondary/10">
              <HelpCircle className="w-16 h-16 text-gray-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-secondary mb-2">No Courses Found</h3>
              <p className="text-secondary/70 max-w-md mx-auto text-sm">
                We couldn't find any courses matching your search query or selected category. Try searching for something else or browse all courses.
              </p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} 
                className="mt-6 px-6 py-3 bg-[#41c8df]/15 text-[#41c8df] font-black uppercase tracking-widest text-xs rounded-xl border border-[#41c8df]/30 hover:bg-[#41c8df] hover:text-black transition-all"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredCourses.map(course => {
                  const skills = parseSkills(course.skills);
                  return (
                    <motion.div
                      key={course.id}
                      layout
                      variants={cardVariants}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="h-full"
                    >
                      <TiltCard
                        scale={1.03}
                        tiltMaxAngleX={10}
                        tiltMaxAngleY={10}
                        glareEnable={true}
                        className="h-full rounded-3xl group/card"
                      >
                        <div className="relative bg-background/40 backdrop-blur-xl rounded-3xl overflow-hidden border border-secondary/10 group-hover/card:border-[#41c8df]/60 transition-all duration-500 shadow-xl group-hover/card:shadow-[0_20px_50px_rgba(65,200,223,0.2)] h-full flex flex-col transform-style-3d">
                          
                          {/* Image Header */}
                          <div className="relative overflow-hidden w-full h-48 shrink-0 rounded-t-3xl">
                            <img
                              src={course.image}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700 ease-out"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-95 pointer-events-none" />
                          </div>

                          {/* Content Body */}
                          <div className="p-6 flex-grow flex flex-col transform-style-3d">
                            
                            <h3 className="text-xl font-bold text-secondary mb-3 group-hover/card:text-[#41c8df] transition-colors duration-300 transform transition-transform duration-500 group-hover/card:translate-z-[30px]">
                              {course.title}
                            </h3>

                            <p className="text-secondary/70 mb-6 line-clamp-2 text-sm leading-relaxed transform transition-transform duration-500 group-hover/card:translate-z-[20px]">
                              {course.description}
                            </p>
 
                            {/* Stat pill list */}
                            <div className="grid grid-cols-3 gap-2 py-3 px-4 bg-secondary/5 rounded-2xl border border-secondary/10 mb-6 transform transition-transform duration-500 group-hover/card:translate-z-[25px] text-xs">
                              <div className="flex flex-col items-center justify-center text-center border-r border-secondary/10">
                                <Clock className="w-4 h-4 text-[#41c8df] mb-1" />
                                <span className="font-bold text-secondary text-[10px] sm:text-xs">{course.duration}</span>
                              </div>
                              <div className="flex flex-col items-center justify-center text-center border-r border-secondary/10">
                                <Users className="w-4 h-4 text-[#41c8df] mb-1" />
                                <span className="font-bold text-secondary text-[10px] sm:text-xs">{course.students}</span>
                              </div>
                              <div className="flex flex-col items-center justify-center text-center">
                                <Star className="w-4 h-4 text-yellow-400 mb-1 animate-pulse" />
                                <span className="font-bold text-secondary text-[10px] sm:text-xs">{course.rating}</span>
                              </div>
                            </div>

                            {/* Skill Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-6 mt-auto transform transition-transform duration-500 group-hover/card:translate-z-[20px]">
                              {skills.slice(0, 3).map((skill, skillIndex) => (
                                <span key={skillIndex} className="px-2.5 py-1 bg-gradient-to-r from-[#41c8df]/10 to-blue-500/10 text-[#41c8df] font-semibold tracking-wide rounded-md text-[10px] border border-[#41c8df]/25 shadow-sm">
                                  {skill}
                                </span>
                              ))}
                              {skills.length > 3 && (
                                <span className="px-2 py-1 bg-secondary/5 text-secondary/60 font-medium rounded-md text-[10px] border border-secondary/10">
                                  +{skills.length - 3}
                                </span>
                              )}
                            </div>

                            {/* Button CTA */}
                            <div className="flex gap-3 transform transition-transform duration-500 group-hover/card:translate-z-[40px]">
                              <Link
                                to={`/course/${course.id}`}
                                className="flex-grow flex-shrink border border-[#41c8df] text-[#0891b2] hover:bg-[#41c8df]/10 py-3 px-3 rounded-xl font-bold text-[11px] uppercase tracking-widest text-center transition-all duration-300 flex items-center justify-center"
                              >
                                Syllabus
                              </Link>
                              <Link
                                to={`/apply/${course.id}`}
                                className="flex-grow flex-shrink bg-[#41c8df] text-black hover:bg-[#0891b2] hover:text-white py-3 px-3 rounded-xl font-bold text-[11px] uppercase tracking-widest text-center transition-all duration-300 flex items-center justify-center shadow-md"
                              >
                                Enroll Now
                              </Link>
                            </div>

                          </div>
                        </div>
                      </TiltCard>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        {/* Counseling Help / CTA section */}
        <section className="mt-20">
          <div className="bg-gradient-to-r from-[#41c8df]/10 to-blue-500/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-[#41c8df]/20 relative overflow-hidden shadow-2xl">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-[#41c8df]/20 to-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#41c8df]/15 text-[#41c8df] text-xs font-black uppercase tracking-widest rounded-lg border border-[#41c8df]/20">
                  <Compass className="w-4 h-4" /> Career Guidance
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-secondary leading-tight">
                  Unsure which training track fits your future?
                </h2>
                <p className="text-secondary/80 text-sm md:text-base max-w-xl">
                  Schedule a complimentary, 1-on-1 counseling call with our senior tech experts. We will guide you through course curriculum comparisons, payment installment options, and job placement outlooks.
                </p>
              </div>
              <div className="flex md:justify-end">
                <a 
                  href="/#contact"
                  className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 transition-all shadow-xl shadow-white/10 flex items-center gap-2"
                >
                  Request Call Back <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default CoursesLanding;
