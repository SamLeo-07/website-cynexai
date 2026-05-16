
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
          animate={inView ? 'visible' : 'hidden'}

          className="text-center mb-16 courses-header"
        >
          <motion.h2
            className="text-4xl md:text-5xl font-display font-bold mb-6"
          >
            <span className="text-[#41c8df]">Transform Your Skills</span>
          </motion.h2>
          <motion.p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Choose from our comprehensive range of courses designed to prepare you for the future of technology
          </motion.p>
        </motion.div>

        {/* Course cards grid with 3D tilt */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
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
              <p className="text-gray-400 font-bold uppercase tracking-widest">No published courses available.</p>
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
                    <div className="relative bg-background/40 backdrop-blur-xl rounded-2xl overflow-hidden border border-secondary/10 group-hover/card:border-[#41c8df]/80 transition-all duration-500 shadow-xl group-hover/card:shadow-[0_20px_50px_rgba(65,200,223,0.3)] h-full flex flex-col transform-style-3d">
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
                        <p className="text-gray-300 mb-4 line-clamp-2 text-sm transform transition-transform duration-500 group-hover/card:translate-z-[30px]">
                          {course.description}
                        </p>

                        <div className="flex items-center justify-between mb-4 text-sm font-medium text-gray-300 bg-secondary/5 p-3 rounded-xl border border-secondary/10 transform transition-transform duration-500 group-hover/card:translate-z-[40px] shadow-lg">
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
                            <span className="px-2.5 py-1 bg-secondary/5 text-gray-400 font-medium rounded-md text-xs border border-secondary/10 shadow-sm">
                              +{skills.length - 3}
                            </span>
                          )}
                        </div>

                        <div className="transform transition-transform duration-500 group-hover/card:translate-z-[60px]">
                          <Link
                            to={`/course/${course.id}`}
                            className="w-full relative overflow-hidden group/btn bg-[#41c8df] text-black py-3.5 px-4 rounded-xl font-bold text-center transition-all duration-300 flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[0_10px_20px_rgba(65,200,223,0.4)]"
                          >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#41c8df] to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                            <span className="relative z-10 flex items-center justify-center group-hover/btn:text-secondary transition-colors duration-300">
                              Learn More
                              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                            </span>
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
