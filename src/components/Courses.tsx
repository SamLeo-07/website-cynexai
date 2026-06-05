
import { useState, useEffect } from 'react';
import { motion, easeOut } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Users, Star } from 'lucide-react';
import TiltCard from './TiltCard';
import { getCourses, Course } from '../lib/turso';

const Courses = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (error) {
        console.error('Failed to load courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

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
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  const itemVariants = {
    hidden: { y: 60, opacity: 0, rotateY: -15, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      rotateY: 0,
      scale: 1,
      transition: { duration: 0.7, ease: easeOut }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: 40, rotateX: 20 },
    visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.9, ease: easeOut } }
  };

  return (
    <section id="courses" className="py-20 bg-transparent text-secondary relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header with 3D entrance */}
        <motion.div
          ref={ref}
          variants={headerVariants}
          initial="hidden"
          animate="visible"

          className="text-center mb-16 courses-header"
        >
          <motion.h2
            className="text-4xl md:text-5xl font-display font-bold mb-6"
          >
            <span className="text-[#41c8df]">Transform Your Skills</span>
          </motion.h2>
          <motion.p className="text-xl text-slate-600 dark:text-gray-300 max-w-3xl mx-auto">
            Choose from our comprehensive range of courses designed to prepare you for the future of technology
          </motion.p>
        </motion.div>

        {/* Course cards grid with 3D tilt */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 courses-grid"
        >
          {loading ? (
            // Shimmer / Loading State
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-96 rounded-2xl bg-secondary/5 border border-secondary/10 animate-pulse flex items-center justify-center">
                 <div className="w-12 h-12 border-4 border-[#41c8df] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ))
          ) : courses.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-slate-500 dark:text-gray-400 font-bold uppercase tracking-widest">No published courses available.</p>
            </div>
          ) : (
            courses.map((course) => {
              const skills = parseSkills(course.skills);
              return (
                <motion.div key={course.id} variants={itemVariants} className="h-full">
                  <TiltCard
                    scale={1.05}
                    tiltMaxAngleX={15}
                    tiltMaxAngleY={15}
                    glareEnable={true}
                    className="h-full rounded-2xl group/card"
                  >
                    <div className="relative bg-background-100/80 backdrop-blur-md rounded-2xl overflow-hidden border border-secondary/10 group-hover/card:border-[#41c8df]/80 transition-all duration-500 shadow-xl group-hover/card:shadow-[0_20px_50px_rgba(65,200,223,0.3)] h-full flex flex-col transform-style-3d">
                      <div className="relative overflow-hidden w-full h-48 shrink-0 transform transition-transform duration-500 group-hover/card:translate-z-[40px] rounded-t-2xl">
                        <img
                          src={course.image}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 transition-opacity duration-300 pointer-events-none" />
                      </div>

                      <div className="p-6 flex-grow flex flex-col transform-style-3d">
                        <h3 className="text-xl font-bold text-secondary mb-3 group-hover/card:text-[#41c8df] transition-colors duration-300 transform transition-transform duration-500 group-hover/card:translate-z-[50px]">
                          {course.title}
                        </h3>
                        <p className="text-slate-600 dark:text-gray-300 mb-4 line-clamp-2 text-sm transform transition-transform duration-500 group-hover/card:translate-z-[30px]">
                          {course.description}
                        </p>

                        <div className="flex items-center justify-between mb-4 text-sm font-medium text-slate-600 dark:text-gray-300 bg-secondary/5 p-3 rounded-xl border border-secondary/10 transform transition-transform duration-500 group-hover/card:translate-z-[40px] shadow-lg">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1.5 text-[#41c8df]" />{course.duration}
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1.5 text-[#41c8df]" />{course.students}
                          </div>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 mr-1.5 text-yellow-400" />{course.rating}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-6 mt-auto transform transition-transform duration-500 group-hover/card:translate-z-[30px]">
                          {skills.slice(0, 3).map((skill, skillIndex) => (
                            <span key={skillIndex} className="px-2.5 py-1 bg-gradient-to-r from-[#41c8df]/10 to-blue-500/10 text-[#41c8df] font-semibold tracking-wide rounded-md text-xs border border-[#41c8df]/20 shadow-sm">
                              {skill}
                            </span>
                          ))}
                          {skills.length > 3 && (
                            <span className="px-2.5 py-1 bg-secondary/5 text-slate-500 dark:text-gray-400 font-medium rounded-md text-xs border border-secondary/10 shadow-sm">
                              +{skills.length - 3}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-3 transform transition-transform duration-500 group-hover/card:translate-z-[60px]">
                          <Link
                            to={`/course/${course.id}`}
                            className="flex-grow flex-shrink border border-[#41c8df] text-[#0891b2] hover:bg-[#41c8df]/10 py-3 px-2.5 rounded-xl font-bold text-sm text-center transition-all duration-300 flex items-center justify-center"
                          >
                            Learn More
                          </Link>
                          <Link
                            to={`/apply/${course.id}`}
                            className="flex-grow flex-shrink bg-[#41c8df] text-black hover:bg-[#0891b2] hover:text-white py-3 px-2.5 rounded-xl font-bold text-sm text-center transition-all duration-300 flex items-center justify-center shadow-md"
                          >
                            Enroll Now
                          </Link>
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Courses;
