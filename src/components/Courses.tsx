

import { motion, easeOut } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Star } from 'lucide-react';
import TiltCard from './TiltCard';

const Courses = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const courses = [
    {
      id: 'data-science-machine-learning',
      title: 'Data Science & Machine Learning',
      description: 'Master data analysis, machine learning algorithms, and AI implementation for real-world applications.',
      image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=800',
      duration: '6 months',
      rating: 4.9,
      level: 'Intermediate',
      skills: ['Python', 'TensorFlow', 'Pandas', 'Scikit-learn']
    },
    {
      id: 'artificial-intelligence-generative-ai',
      title: 'Artificial Intelligence & Generative AI',
      description: 'Deep dive into ML algorithms, neural networks, and advanced generative modeling techniques.',
      image: 'https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg?auto=compress&cs=tinysrgb&w=800',
      duration: '6 months',
      rating: 4.8,
      level: 'Advanced',
      skills: ['Python', 'PyTorch', 'Keras', 'Transformers']
    },
    {
      id: 'full-stack-java-development',
      title: 'Full Stack Java Development',
      description: 'Build robust web applications from frontend to backend using Java frameworks like Spring Boot.',
      image: '/java.png',
      duration: '6 months',
      rating: 4.7,
      level: 'Intermediate',
      skills: ['Java', 'Spring Boot', 'React/Angular', 'SQL']
    },
    {
      id: 'devops-cloud-technologies',
      title: 'DevOps & Cloud Technologies',
      description: 'Learn cloud infrastructure, CI/CD pipelines, and deployment strategies on AWS, Azure, or GCP.',
      image: '/Devops.png',
      duration: '6 months',
      rating: 4.8,
      level: 'Intermediate',
      skills: ['AWS', 'Docker', 'Kubernetes', 'Jenkins']
    },
    {
      id: 'python-programming',
      title: 'Python Programming',
      description: 'Master Python fundamentals for data analysis, web development, and automation.',
      image: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=800',
      duration: '6 months',
      rating: 4.7,
      level: 'Beginner',
      skills: ['Python', 'OOP', 'Data Structures', 'Flask/Django']
    },
    {
      id: 'software-testing-manual-automation',
      title: 'Software Testing (Manual + Automation)',
      description: 'Master software testing methodologies, automation frameworks, and quality assurance for robust applications.',
      image: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=800',
      duration: '6 months',
      rating: 4.5,
      level: 'Intermediate',
      skills: ['Selenium', 'Jest', 'Cypress', 'API Testing']
    },
    {
      id: 'sap-data-processing',
      title: 'SAP (Systems, Applications, and Products in Data Processing)',
      description: 'Enterprise resource planning with SAP modules, business process optimization, and implementation strategies.',
      image: 'https://images.pexels.com/photos/1181316/pexels-photo-1181316.jpeg?auto=compress&cs=tinysrgb&w=800',
      duration: '6 months',
      rating: 4.6,
      level: 'Professional',
      skills: ['SAP HANA', 'ABAP', 'Fiori', 'S/4HANA']
    },
  ];

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
          {courses.map((course) => (
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
                    {/* Gradient overlay on image */}
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
                        <Star className="w-4 h-4 mr-1.5 text-yellow-400" />{course.rating}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6 mt-auto transform transition-transform duration-500 group-hover/card:translate-z-[30px]">
                      {course.skills.slice(0, 3).map((skill, skillIndex) => (
                        <span key={skillIndex} className="px-2.5 py-1 bg-gradient-to-r from-[#41c8df]/10 to-blue-500/10 text-[#41c8df] font-semibold tracking-wide rounded-md text-xs border border-[#41c8df]/20 shadow-sm">
                          {skill}
                        </span>
                      ))}
                      {course.skills.length > 3 && (
                        <span className="px-2.5 py-1 bg-secondary/5 text-gray-400 font-medium rounded-md text-xs border border-secondary/10 shadow-sm">
                          +{course.skills.length - 3}
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
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Courses;
